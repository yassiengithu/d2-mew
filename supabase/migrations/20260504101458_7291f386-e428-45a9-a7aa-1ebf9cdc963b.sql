-- Allow 'available' as a valid seller_earnings status (in addition to existing pending/approved/paid)
CREATE OR REPLACE FUNCTION public.validate_seller_earnings_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'available', 'paid') THEN
    RAISE EXCEPTION 'Invalid payout status: %. Must be pending, approved, available, or paid.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_seller_earnings_status_trigger ON public.seller_earnings;
CREATE TRIGGER validate_seller_earnings_status_trigger
BEFORE INSERT OR UPDATE ON public.seller_earnings
FOR EACH ROW EXECUTE FUNCTION public.validate_seller_earnings_status();

-- Function: when an order transitions to 'delivered', release that order's
-- earnings from pending_balance to available_balance, exactly once.
CREATE OR REPLACE FUNCTION public.release_earnings_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_earning RECORD;
BEGIN
  -- Only act on transition INTO 'delivered'
  IF NEW.status = 'delivered' AND (OLD.status IS DISTINCT FROM 'delivered') THEN
    -- Find the earning row for this order that hasn't been released yet.
    -- The 'pending' status acts as the idempotency lock: once flipped to
    -- 'available', this block is skipped on subsequent triggers.
    SELECT id, seller_id, net_earnings
      INTO v_earning
      FROM public.seller_earnings
     WHERE order_id = NEW.id
       AND status = 'pending'
     FOR UPDATE;

    IF FOUND THEN
      UPDATE public.seller_earnings
         SET status = 'available',
             updated_at = now()
       WHERE id = v_earning.id;

      UPDATE public.seller_wallet
         SET pending_balance = GREATEST(pending_balance - v_earning.net_earnings, 0),
             available_balance = available_balance + v_earning.net_earnings,
             updated_at = now()
       WHERE seller_id = v_earning.seller_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_earnings_on_delivery_trigger ON public.orders;
CREATE TRIGGER release_earnings_on_delivery_trigger
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.release_earnings_on_delivery();