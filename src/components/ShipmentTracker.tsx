import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Package, Search, Truck, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type Checkpoint = {
  status: string;
  message: string;
  location: string;
  time: string | null;
};

export type TrackingResult = {
  tracking_number: string;
  status: string;
  courier_name: string | null;
  current_location: string | null;
  last_update: string | null;
  estimated_delivery: string | null;
  checkpoints: Checkpoint[];
};

const STATUS_STEPS = [
  { key: "label_created", label: "Label Created", match: ["label", "created", "pending", "info_received"] },
  { key: "picked_up", label: "Picked Up", match: ["picked", "collected", "received"] },
  { key: "in_transit", label: "In Transit", match: ["transit", "shipped", "departed", "arrived"] },
  { key: "out_for_delivery", label: "Out for Delivery", match: ["out_for_delivery", "out for delivery"] },
  { key: "delivered", label: "Delivered", match: ["delivered", "completed"] },
];

const stepIndex = (status: string) => {
  const s = status.toLowerCase();
  for (let i = STATUS_STEPS.length - 1; i >= 0; i--) {
    if (STATUS_STEPS[i].match.some((m) => s.includes(m))) return i;
  }
  return 0;
};

const formatTime = (iso: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

interface ShipmentTrackerProps {
  initialTrackingNumber?: string;
  autoRefreshMs?: number;
}

const ShipmentTracker = ({ initialTrackingNumber = "", autoRefreshMs = 30_000 }: ShipmentTrackerProps) => {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingNumber);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackingResult | null>(null);
  const timer = useRef<number | null>(null);

  const fetchTracking = useCallback(
    async (silent = false) => {
      const tn = trackingNumber.trim();
      if (!tn) {
        setError("Please enter a tracking number.");
        return;
      }
      silent ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("easyship-track", {
          body: { tracking_number: tn },
        });
        if (fnErr) throw new Error(fnErr.message);
        if (!data?.success) throw new Error(data?.error ?? "Unable to fetch tracking");
        setResult(data as TrackingResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        if (!silent) setResult(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [trackingNumber],
  );

  // Auto-refresh while tracking, stop when delivered.
  useEffect(() => {
    if (!result || !autoRefreshMs) return;
    const isDelivered = result.status.toLowerCase().includes("delivered");
    if (isDelivered) return;
    timer.current = window.setInterval(() => fetchTracking(true), autoRefreshMs);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [result, autoRefreshMs, fetchTracking]);

  useEffect(() => {
    if (initialTrackingNumber) fetchTracking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentStep = result ? stepIndex(result.status) : 0;
  const progressPct = result ? Math.round(((currentStep + 1) / STATUS_STEPS.length) * 100) : 0;
  const isDelivered = result?.status.toLowerCase().includes("delivered");

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Label htmlFor="tracking-number" className="text-sm font-medium">
          Tracking number
        </Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="tracking-number"
            placeholder="e.g. EZ1234567890"
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchTracking(false)}
            maxLength={120}
          />
          <Button onClick={() => fetchTracking(false)} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Search />}
            Track
          </Button>
        </div>
        {error && (
          <p className="mt-2 flex items-center gap-1 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
      </Card>

      {result && (
        <Card className="space-y-5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={isDelivered ? "default" : "secondary"} className="capitalize">
                  {result.status.replace(/_/g, " ")}
                </Badge>
                {result.courier_name && (
                  <span className="text-sm text-muted-foreground">via {result.courier_name}</span>
                )}
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                #{result.tracking_number}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fetchTracking(true)}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
            </Button>
          </div>

          <div>
            <Progress value={progressPct} />
            <div className="mt-3 grid grid-cols-5 gap-1 text-[10px] sm:text-xs">
              {STATUS_STEPS.map((s, i) => (
                <div
                  key={s.key}
                  className={cn(
                    "flex flex-col items-center text-center",
                    i <= currentStep ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "mb-1 flex h-6 w-6 items-center justify-center rounded-full border",
                      i < currentStep && "bg-primary text-primary-foreground border-primary",
                      i === currentStep && "border-primary text-primary",
                    )}
                  >
                    {i < currentStep ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : i === currentStep ? (
                      <Truck className="h-3 w-3" />
                    ) : (
                      <Package className="h-3 w-3" />
                    )}
                  </div>
                  <span className="leading-tight">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 rounded-md border bg-muted/30 p-3 text-sm sm:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Current location</p>
                <p className="text-muted-foreground">{result.current_location ?? "Not available"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Package className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Estimated delivery</p>
                <p className="text-muted-foreground">{result.estimated_delivery ?? "Not available"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold">Delivery timeline</h3>
            {result.checkpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tracking events yet.</p>
            ) : (
              <ol className="relative ml-3 space-y-4 border-l pl-5">
                {result.checkpoints.map((c, idx) => (
                  <li key={idx} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[27px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-background",
                        idx === 0 ? "border-primary" : "border-muted-foreground/40",
                      )}
                    />
                    <p className="text-sm font-medium capitalize">
                      {c.status?.replace(/_/g, " ") || c.message || "Update"}
                    </p>
                    {c.message && c.message !== c.status && (
                      <p className="text-sm text-muted-foreground">{c.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {[c.location, formatTime(c.time)].filter(Boolean).join(" • ")}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default ShipmentTracker;
