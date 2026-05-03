import { useState } from "react";
import { Loader2, FileText, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import DownloadLabelButton from "@/components/DownloadLabelButton";
import { toast } from "sonner";

interface CreateShipmentPanelProps {
  courierId: string | null; // Easyship courier_id (must come from rates)
  courierName?: string;
  parcel: {
    weight_kg: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
  };
  origin: { country_alpha2: string; city: string; postal_code: string };
  destination: { country_alpha2: string; city: string; postal_code: string };
}

const PartySchema = z.object({
  contact_name: z.string().trim().min(1).max(120),
  contact_phone: z.string().trim().min(3).max(40),
  contact_email: z.string().trim().email().optional().or(z.literal("")),
  line_1: z.string().trim().min(1).max(200),
});

type CreatedShipment = {
  id?: string;
  easyship_shipment_id?: string | null;
  tracking_number?: string | null;
  label_url?: string | null;
};

const CreateShipmentPanel = ({
  courierId,
  courierName,
  parcel,
  origin,
  destination,
}: CreateShipmentPanelProps) => {
  const [sender, setSender] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    line_1: "",
  });
  const [receiver, setReceiver] = useState({
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    line_1: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreatedShipment | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!courierId) {
      setError("Select a courier first. (No courier_id available for this rate.)");
      return;
    }

    const s = PartySchema.safeParse(sender);
    const r = PartySchema.safeParse(receiver);
    if (!s.success || !r.success) {
      setError("Please complete sender and receiver details (name, phone, address).");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "easyship-create-shipment",
        {
          body: {
            courier_id: courierId,
            sender: {
              ...s.data,
              contact_email: s.data.contact_email || undefined,
              country_alpha2: origin.country_alpha2,
              city: origin.city,
              postal_code: origin.postal_code,
            },
            receiver: {
              ...r.data,
              contact_email: r.data.contact_email || undefined,
              country_alpha2: destination.country_alpha2,
              city: destination.city,
              postal_code: destination.postal_code,
            },
            parcel: { ...parcel, declared_value: 100, currency: "PHP" },
          },
        },
      );
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error ?? "Failed to create shipment");

      setResult(data as CreatedShipment);
      toast.success("Shipment created");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Create shipment{courierName ? ` with ${courierName}` : ""}</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-muted-foreground">Sender</legend>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Full name"
              value={sender.contact_name}
              onChange={(e) => setSender({ ...sender, contact_name: e.target.value })}
              maxLength={120}
            />
            <Input
              placeholder="Phone"
              value={sender.contact_phone}
              onChange={(e) => setSender({ ...sender, contact_phone: e.target.value })}
              maxLength={40}
            />
          </div>
          <Input
            placeholder="Email (optional)"
            type="email"
            value={sender.contact_email}
            onChange={(e) => setSender({ ...sender, contact_email: e.target.value })}
            maxLength={255}
          />
          <Input
            placeholder="Street address"
            value={sender.line_1}
            onChange={(e) => setSender({ ...sender, line_1: e.target.value })}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            From {origin.city}, {origin.country_alpha2} {origin.postal_code}
          </p>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-muted-foreground">Receiver</legend>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Full name"
              value={receiver.contact_name}
              onChange={(e) => setReceiver({ ...receiver, contact_name: e.target.value })}
              maxLength={120}
            />
            <Input
              placeholder="Phone"
              value={receiver.contact_phone}
              onChange={(e) => setReceiver({ ...receiver, contact_phone: e.target.value })}
              maxLength={40}
            />
          </div>
          <Input
            placeholder="Email (optional)"
            type="email"
            value={receiver.contact_email}
            onChange={(e) => setReceiver({ ...receiver, contact_email: e.target.value })}
            maxLength={255}
          />
          <Input
            placeholder="Street address"
            value={receiver.line_1}
            onChange={(e) => setReceiver({ ...receiver, line_1: e.target.value })}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            To {destination.city}, {destination.country_alpha2} {destination.postal_code}
          </p>
        </fieldset>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={submitting || !courierId} className="w-full">
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating shipment…
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Create shipment
            </>
          )}
        </Button>
      </form>

      {result && (
        <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm space-y-1.5">
          <div className="flex items-center gap-2 font-medium text-success">
            <CheckCircle2 className="h-4 w-4" />
            Shipment created
          </div>
          <div className="space-y-1 text-foreground">
            <div>
              <Label className="text-xs text-muted-foreground">Shipment ID</Label>
              <div className="font-mono text-xs break-all">
                {result.easyship_shipment_id ?? "—"}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Tracking number</Label>
              <div className="font-mono text-xs break-all">
                {result.tracking_number ?? "—"}
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <Label className="text-xs text-muted-foreground">Label</Label>
              {result.label_url ? (
                <DownloadLabelButton
                  labelUrl={result.label_url}
                  filenameHint={
                    result.tracking_number ?? result.easyship_shipment_id ?? "shipping-label"
                  }
                />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Pending — generated after courier acceptance.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CreateShipmentPanel;
