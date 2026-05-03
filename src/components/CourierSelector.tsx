import { Truck, Zap, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export type CourierRate = {
  courier_id: string | null;
  courier_name: string;
  logo_url: string | null;
  cost: number | null;
  currency: string;
  min_days: number | null;
  max_days: number | null;
};

interface CourierSelectorProps {
  rates: CourierRate[];
  value: string | null;
  onChange: (id: string, rate: CourierRate) => void;
}

const rateId = (r: CourierRate, idx: number) =>
  r.courier_id ?? `${r.courier_name}-${idx}`;

const formatMoney = (value: number, currency: string) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(value);

const formatEta = (min: number | null, max: number | null) => {
  if (!min || !max) return "—";
  if (min === max) return `${min} day${min === 1 ? "" : "s"}`;
  return `${min}–${max} days`;
};

export const CourierSelector = ({ rates, value, onChange }: CourierSelectorProps) => {
  if (rates.length === 0) return null;

  // Cheapest = lowest cost. Fastest = lowest max_days (fallback min_days).
  let cheapestIdx = -1;
  let fastestIdx = -1;
  let cheapestCost = Infinity;
  let fastestDays = Infinity;
  rates.forEach((r, i) => {
    if (r.cost !== null && r.cost < cheapestCost) {
      cheapestCost = r.cost;
      cheapestIdx = i;
    }
    const days = r.max_days ?? r.min_days ?? Infinity;
    if (days < fastestDays) {
      fastestDays = days;
      fastestIdx = i;
    }
  });

  return (
    <RadioGroup
      value={value ?? ""}
      onValueChange={(id) => {
        const idx = rates.findIndex((r, i) => rateId(r, i) === id);
        if (idx >= 0) onChange(id, rates[idx]);
      }}
      className="space-y-2"
    >
      {rates.map((r, idx) => {
        const id = rateId(r, idx);
        const isSelected = value === id;
        const isCheapest = idx === cheapestIdx;
        const isFastest = idx === fastestIdx;

        return (
          <Label
            key={id}
            htmlFor={id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <RadioGroupItem id={id} value={id} />
            {r.logo_url ? (
              <img
                src={r.logo_url}
                alt={r.courier_name}
                className="h-9 w-9 shrink-0 rounded object-contain"
                loading="lazy"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-muted">
                <Truck className="h-4 w-4 text-muted-foreground" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="truncate text-sm font-medium">{r.courier_name}</span>
                {isCheapest && (
                  <Badge variant="secondary" className="gap-1 text-[10px]">
                    <Tag className="h-3 w-3" /> Cheapest
                  </Badge>
                )}
                {isFastest && (
                  <Badge className="gap-1 bg-primary/10 text-primary text-[10px] hover:bg-primary/15">
                    <Zap className="h-3 w-3" /> Fastest
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                ETA: {formatEta(r.min_days, r.max_days)}
              </div>
            </div>

            <div className="text-right text-sm font-semibold">
              {r.cost !== null ? formatMoney(r.cost, r.currency) : "—"}
            </div>
          </Label>
        );
      })}
    </RadioGroup>
  );
};

export default CourierSelector;
