CREATE POLICY "Admins view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update all orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));