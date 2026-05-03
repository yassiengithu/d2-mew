-- Update default status for new earnings to 'pending'
ALTER TABLE public.seller_earnings ALTER COLUMN status SET DEFAULT 'pending';

-- Migrate any existing 'available' rows to new 'approved' state so sellers keep their balance
UPDATE public.seller_earnings SET status = 'approved' WHERE status = 'available';

-- Restrict payout statuses via validation trigger (avoids CHECK immutability issues)
CREATE OR REPLACE FUNCTION public.validate_seller_earnings_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'paid') THEN
    RAISE EXCEPTION 'Invalid payout status: %. Must be pending, approved, or paid.', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_seller_earnings_status_trg ON public.seller_earnings;
CREATE TRIGGER validate_seller_earnings_status_trg
BEFORE INSERT OR UPDATE ON public.seller_earnings
FOR EACH ROW EXECUTE FUNCTION public.validate_seller_earnings_status();

-- Update commission trigger to insert with 'pending' status by default
CREATE OR REPLACE FUNCTION public.create_seller_earnings_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform_fee NUMERIC;
  v_net_earnings NUMERIC;
BEGIN
  -- Idempotency guard: only fire on transition into 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    IF NEW.seller_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Skip recalc if commission was already set previously
    IF COALESCE(NEW.commission_amount, 0) = 0 THEN
      v_platform_fee := ROUND(NEW.total_amount * 0.10, 2);
      v_net_earnings := ROUND(NEW.total_amount - v_platform_fee, 2);
      NEW.commission_amount := v_platform_fee;
      NEW.seller_earnings := v_net_earnings;
    ELSE
      v_platform_fee := NEW.commission_amount;
      v_net_earnings := NEW.seller_earnings;
    END IF;

    -- Unique(order_id) + ON CONFLICT prevents duplicate earnings rows
    INSERT INTO public.seller_earnings (seller_id, order_id, gross_amount, platform_fee, net_earnings, status)
    VALUES (NEW.seller_id, NEW.id, NEW.total_amount, v_platform_fee, v_net_earnings, 'pending')
    ON CONFLICT (order_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger is attached to orders
DROP TRIGGER IF EXISTS create_seller_earnings_on_payment_trg ON public.orders;
CREATE TRIGGER create_seller_earnings_on_payment_trg
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.create_seller_earnings_on_payment();