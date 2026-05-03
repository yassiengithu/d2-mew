import { useState } from "react";
import { Loader2, Package, MapPin, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import CourierSelector, { type CourierRate } from "@/components/CourierSelector";
import CreateShipmentPanel from "@/components/CreateShipmentPanel";
import { supabase } from "@/integrations/supabase/client";
import { saveSelectedCourier, getSelectedCourier } from "@/lib/orderShipping";
import { toast } from "sonner";

type Rate = CourierRate;

const FormSchema = z.object({
  origin_city: z.string().trim().min(1, "Required").max(120),
  origin_postal: z.string().trim().min(1, "Required").max(20),
  dest_country: z.string().trim().length(2, "Use 2-letter country code"),
  dest_city: z.string().trim().min(1, "Required").max(120),
  dest_postal: z.string().trim().min(1, "Required").max(20),
  weight_kg: z.number().positive("Must be > 0").max(1000),
  length_cm: z.number().positive().max(300),
  width_cm: z.number().positive().max(300),
  height_cm: z.number().positive().max(300),
});

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(value);

const ShippingCalculator = () => {
  const [form, setForm] = useState({
    origin_city: "Manila",
    origin_postal: "1000",
    dest_country: "PH",
    dest_city: "Cebu City",
    dest_postal: "6000",
    weight_kg: "1",
    length_cm: "20",
    width_cm: "15",
    height_cm: "10",
  });
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Rate[] | null>(null);
  const [selected, setSelected] = useState<string | null>(() => getSelectedCourier()?.id ?? null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setRates(null);

    const parsed = FormSchema.safeParse({
      origin_city: form.origin_city,
      origin_postal: form.origin_postal,
      dest_country: form.dest_country.toUpperCase(),
      dest_city: form.dest_city,
      dest_postal: form.dest_postal,
      weight_kg: Number(form.weight_kg),
      length_cm: Number(form.length_cm),
      width_cm: Number(form.width_cm),
      height_cm: Number(form.height_cm),
    });

    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      setError(first ?? "Please check your inputs.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("easyship-rates", {
        body: {
          origin: {
            country_alpha2: "PH",
            city: parsed.data.origin_city,
            postal_code: parsed.data.origin_postal,
          },
          destination: {
            country_alpha2: parsed.data.dest_country,
            city: parsed.data.dest_city,
            postal_code: parsed.data.dest_postal,
          },
          weight_kg: parsed.data.weight_kg,
          length_cm: parsed.data.length_cm,
          width_cm: parsed.data.width_cm,
          height_cm: parsed.data.height_cm,
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "Failed to fetch rates");

      const list: Rate[] = (data.rates ?? []).filter((r: Rate) => r.cost !== null);
      list.sort((a, b) => (a.cost ?? Infinity) - (b.cost ?? Infinity));
      setRates(list);
      if (list.length > 0) {
        const firstId = list[0].courier_id ?? `${list[0].courier_name}-0`;
        setSelected(firstId);
        saveSelectedCourier(firstId, list[0]);
      }
      if (list.length === 0) toast.info("No couriers available for this route.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader title="Shipping Calculator" backTo="/" />

      <main className="container max-w-2xl px-4 py-6 space-y-6">
        <Card className="p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                Origin (Philippines)
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="origin_city">City</Label>
                  <Input
                    id="origin_city"
                    value={form.origin_city}
                    onChange={(e) => handleChange("origin_city", e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="origin_postal">Postal code</Label>
                  <Input
                    id="origin_postal"
                    value={form.origin_postal}
                    onChange={(e) => handleChange("origin_postal", e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <MapPin className="h-4 w-4 text-primary" />
                Destination
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="dest_country">Country</Label>
                  <Input
                    id="dest_country"
                    value={form.dest_country}
                    onChange={(e) => handleChange("dest_country", e.target.value.toUpperCase())}
                    maxLength={2}
                    placeholder="PH"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dest_city">City</Label>
                  <Input
                    id="dest_city"
                    value={form.dest_city}
                    onChange={(e) => handleChange("dest_city", e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dest_postal">Postal</Label>
                  <Input
                    id="dest_postal"
                    value={form.dest_postal}
                    onChange={(e) => handleChange("dest_postal", e.target.value)}
                    maxLength={20}
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Package className="h-4 w-4 text-primary" />
                Parcel
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="weight_kg">Weight (kg)</Label>
                  <Input
                    id="weight_kg"
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.weight_kg}
                    onChange={(e) => handleChange("weight_kg", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="length_cm">L (cm)</Label>
                  <Input
                    id="length_cm"
                    type="number"
                    min="0"
                    value={form.length_cm}
                    onChange={(e) => handleChange("length_cm", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="width_cm">W (cm)</Label>
                  <Input
                    id="width_cm"
                    type="number"
                    min="0"
                    value={form.width_cm}
                    onChange={(e) => handleChange("width_cm", e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="height_cm">H (cm)</Label>
                  <Input
                    id="height_cm"
                    type="number"
                    min="0"
                    value={form.height_cm}
                    onChange={(e) => handleChange("height_cm", e.target.value)}
                  />
                </div>
              </div>
            </section>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Calculating…
                </>
              ) : (
                <>
                  <Truck className="mr-2 h-4 w-4" />
                  Get shipping rates
                </>
              )}
            </Button>
          </form>
        </Card>

        {rates && rates.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {rates.length} courier option{rates.length === 1 ? "" : "s"}
            </h2>
            <CourierSelector
              rates={rates}
              value={selected}
              onChange={(id, rate) => {
                setSelected(id);
                saveSelectedCourier(id, rate);
              }}
            />

            {selected && (
              <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  Selected:{" "}
                  <strong>
                    {
                      rates.find(
                        (r, i) => (r.courier_id ?? `${r.courier_name}-${i}`) === selected,
                      )?.courier_name
                    }
                  </strong>
                </span>
              </div>
            )}
          </section>
        )}

        {rates && rates.length > 0 && selected && (() => {
          const rate = rates.find(
            (r, i) => (r.courier_id ?? `${r.courier_name}-${i}`) === selected,
          );
          if (!rate) return null;
          return (
            <CreateShipmentPanel
              courierId={rate.courier_id}
              courierName={rate.courier_name}
              parcel={{
                weight_kg: Number(form.weight_kg),
                length_cm: Number(form.length_cm),
                width_cm: Number(form.width_cm),
                height_cm: Number(form.height_cm),
              }}
              origin={{
                country_alpha2: "PH",
                city: form.origin_city,
                postal_code: form.origin_postal,
              }}
              destination={{
                country_alpha2: form.dest_country.toUpperCase(),
                city: form.dest_city,
                postal_code: form.dest_postal,
              }}
            />
          );
        })()}

        {rates && rates.length === 0 && (
          <Card className="p-5 text-center text-sm text-muted-foreground">
            No couriers available for this route. Try different details.
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ShippingCalculator;
