
-- Couriers registry
CREATE TABLE public.couriers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('api','manual')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couriers readable by everyone"
  ON public.couriers FOR SELECT USING (true);

CREATE POLICY "Admins manage couriers insert"
  ON public.couriers FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage couriers update"
  ON public.couriers FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage couriers delete"
  ON public.couriers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_couriers_updated_at
  BEFORE UPDATE ON public.couriers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend orders with selected courier + tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS selected_courier_id uuid REFERENCES public.couriers(id),
  ADD COLUMN IF NOT EXISTS selected_courier_name text,
  ADD COLUMN IF NOT EXISTS tracking_number text;

-- Shipments
CREATE TABLE public.shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES public.couriers(id),
  courier_name text NOT NULL,
  courier_type text NOT NULL CHECK (courier_type IN ('api','manual')),
  shipping_cost numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'PHP',
  tracking_number text,
  label_url text,
  external_shipment_id text,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shipments_order_id ON public.shipments(order_id);
CREATE INDEX idx_shipments_tracking ON public.shipments(tracking_number);

ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;

-- Buyer or seller of the related order can view
CREATE POLICY "Order parties view shipments"
  ON public.shipments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = shipments.order_id
        AND (auth.uid() = o.user_id OR auth.uid() = o.seller_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins insert shipments"
  ON public.shipments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update shipments"
  ON public.shipments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tracking events
CREATE TABLE public.tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  status text NOT NULL,
  location text,
  message text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracking_events_shipment ON public.tracking_events(shipment_id);

ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order parties view tracking events"
  ON public.tracking_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shipments s
      JOIN public.orders o ON o.id = s.order_id
      WHERE s.id = tracking_events.shipment_id
        AND (auth.uid() = o.user_id OR auth.uid() = o.seller_id)
    )
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins insert tracking events"
  ON public.tracking_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default couriers
INSERT INTO public.couriers (code, name, type) VALUES
  ('easyship', 'Easyship', 'api'),
  ('jt', 'J&T Express', 'manual')
ON CONFLICT (code) DO NOTHING;
