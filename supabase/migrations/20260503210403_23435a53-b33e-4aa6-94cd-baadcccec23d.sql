
-- Create seller_earnings table
CREATE TABLE public.seller_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  order_id TEXT NOT NULL UNIQUE,
  gross_amount NUMERIC NOT NULL DEFAULT 0,
  platform_fee NUMERIC NOT NULL DEFAULT 0,
  net_earnings NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_earnings ENABLE ROW LEVEL SECURITY;

-- Sellers view own earnings
CREATE POLICY "Sellers view own earnings"
ON public.seller_earnings
FOR SELECT
USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert
CREATE POLICY "System inserts earnings"
ON public.seller_earnings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update
CREATE POLICY "Admins update earnings"
ON public.seller_earnings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_seller_earnings_updated_at
BEFORE UPDATE ON public.seller_earnings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create earnings when order payment_status becomes 'paid'
CREATE OR REPLACE FUNCTION public.create_seller_earnings_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform_fee NUMERIC;
  v_net_earnings NUMERIC;
BEGIN
  -- Only fire when payment_status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    -- Skip if no seller assigned
    IF NEW.seller_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Calculate 10% platform fee
    v_platform_fee := ROUND(NEW.total_amount * 0.10, 2);
    v_net_earnings := ROUND(NEW.total_amount - v_platform_fee, 2);

    -- Update order commission fields
    NEW.commission_amount := v_platform_fee;
    NEW.seller_earnings := v_net_earnings;

    -- Insert earnings record (skip if already exists)
    INSERT INTO public.seller_earnings (seller_id, order_id, gross_amount, platform_fee, net_earnings, status)
    VALUES (NEW.seller_id, NEW.id, NEW.total_amount, v_platform_fee, v_net_earnings, 'available')
    ON CONFLICT (order_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to orders table
CREATE TRIGGER trg_create_seller_earnings
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_seller_earnings_on_payment();
