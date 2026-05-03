-- Restrict analytics inserts to authenticated users (no anon writes)
DROP POLICY IF EXISTS "Anyone can insert product views" ON public.product_views;
CREATE POLICY "Authenticated insert product views" ON public.product_views
  FOR INSERT TO authenticated WITH CHECK (true);

-- Lock down SECURITY DEFINER functions from public/auth direct execution
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;