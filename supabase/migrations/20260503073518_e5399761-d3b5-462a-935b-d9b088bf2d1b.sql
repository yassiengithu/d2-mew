-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles readable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sellers
CREATE TABLE public.sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_sales NUMERIC NOT NULL DEFAULT 0,
  total_commission_paid NUMERIC NOT NULL DEFAULT 0,
  net_earnings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own seller row" ON public.sellers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own seller row" ON public.sellers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own seller row" ON public.sellers FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER sellers_updated_at BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Orders
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  commission_amount NUMERIC NOT NULL DEFAULT 0,
  seller_earnings NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer or seller can view order" ON public.orders FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = seller_id);
CREATE POLICY "Users insert own order" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Buyer or seller can update order" ON public.orders FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = seller_id);

CREATE INDEX orders_user_id_idx ON public.orders(user_id);
CREATE INDEX orders_seller_id_idx ON public.orders(seller_id);
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX notifications_user_id_idx ON public.notifications(user_id, created_at DESC);
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL,
  seller_name TEXT NOT NULL,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('buyer','seller')),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer views own messages" ON public.messages FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Buyer inserts own messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = buyer_id);

CREATE INDEX messages_buyer_idx ON public.messages(buyer_id, product_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Product views (analytics)
CREATE TABLE public.product_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert product views" ON public.product_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins read product views" ON public.product_views FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Product purchases (analytics)
CREATE TABLE public.product_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated insert purchases" ON public.product_purchases FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "Buyer reads own purchases" ON public.product_purchases FOR SELECT
  USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin'));