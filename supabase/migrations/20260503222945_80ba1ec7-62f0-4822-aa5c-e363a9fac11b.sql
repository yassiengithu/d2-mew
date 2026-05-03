
CREATE TABLE public.seller_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL UNIQUE,
  pending_balance NUMERIC NOT NULL DEFAULT 0,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  paid_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seller_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers view own wallet"
ON public.seller_wallet FOR SELECT
USING (auth.uid() = seller_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update wallets"
ON public.seller_wallet FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert wallets"
ON public.seller_wallet FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_seller_wallet_updated_at
BEFORE UPDATE ON public.seller_wallet
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: when seller_earnings inserted, add net_earnings to pending_balance
CREATE OR REPLACE FUNCTION public.add_earnings_to_wallet_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seller_wallet (seller_id, pending_balance)
  VALUES (NEW.seller_id, NEW.net_earnings)
  ON CONFLICT (seller_id) DO UPDATE
    SET pending_balance = public.seller_wallet.pending_balance + NEW.net_earnings,
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER seller_earnings_to_wallet_pending
AFTER INSERT ON public.seller_earnings
FOR EACH ROW EXECUTE FUNCTION public.add_earnings_to_wallet_pending();

-- Backfill: aggregate existing earnings into wallets as pending
INSERT INTO public.seller_wallet (seller_id, pending_balance)
SELECT seller_id, COALESCE(SUM(net_earnings), 0)
FROM public.seller_earnings
GROUP BY seller_id
ON CONFLICT (seller_id) DO NOTHING;
