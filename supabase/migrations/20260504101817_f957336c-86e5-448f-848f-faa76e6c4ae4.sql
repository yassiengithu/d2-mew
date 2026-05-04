-- Payout requests table
CREATE TABLE public.payout_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payout_requests_seller ON public.payout_requests(seller_id);
CREATE INDEX idx_payout_requests_status ON public.payout_requests(status);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own payout requests"
ON public.payout_requests FOR SELECT
USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Sellers create own payout requests"
ON public.payout_requests FOR INSERT
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Admins update payout requests"
ON public.payout_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_payout_requests_updated_at
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validate status values
CREATE OR REPLACE FUNCTION public.validate_payout_request_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid payout request status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_payout_request_status_trigger
BEFORE INSERT OR UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_payout_request_status();

-- When approved, move funds available -> paid and mark released earnings as paid.
-- Idempotent: only fires on transition into 'approved'.
CREATE OR REPLACE FUNCTION public.process_payout_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_available NUMERIC;
  v_remaining NUMERIC;
  v_earning RECORD;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    -- Lock wallet row
    SELECT available_balance INTO v_available
      FROM public.seller_wallet
     WHERE seller_id = NEW.seller_id
     FOR UPDATE;

    IF v_available IS NULL OR v_available < NEW.amount THEN
      RAISE EXCEPTION 'Insufficient available balance for payout (available: %, requested: %)',
        COALESCE(v_available, 0), NEW.amount;
    END IF;

    -- Move funds
    UPDATE public.seller_wallet
       SET available_balance = available_balance - NEW.amount,
           paid_balance = paid_balance + NEW.amount,
           updated_at = now()
     WHERE seller_id = NEW.seller_id;

    -- Mark released earnings as paid until the payout amount is covered.
    -- Process oldest first.
    v_remaining := NEW.amount;
    FOR v_earning IN
      SELECT id, net_earnings
        FROM public.seller_earnings
       WHERE seller_id = NEW.seller_id
         AND status IN ('available', 'approved')
       ORDER BY created_at ASC
       FOR UPDATE
    LOOP
      EXIT WHEN v_remaining <= 0;
      IF v_earning.net_earnings <= v_remaining THEN
        UPDATE public.seller_earnings
           SET status = 'paid', updated_at = now()
         WHERE id = v_earning.id;
        v_remaining := v_remaining - v_earning.net_earnings;
      ELSE
        -- Partial coverage: leave the earning as-is to avoid splitting rows.
        EXIT;
      END IF;
    END LOOP;

    NEW.processed_at := now();
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.processed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER process_payout_approval_trigger
BEFORE UPDATE ON public.payout_requests
FOR EACH ROW EXECUTE FUNCTION public.process_payout_approval();