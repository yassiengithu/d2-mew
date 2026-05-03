import { Zap, Truck, Tag } from "lucide-react";

const promos = [
  { icon: Zap, label: "Fresh Deals", sub: "Updated daily" },
  { icon: Truck, label: "Fast Ship", sub: "Seller direct" },
  { icon: Tag, label: "Best Value", sub: "Compare picks" },
];

const PromoBanner = () => (
  <section className="mx-4 rounded-xl p-4 shadow-elevated" style={{ background: "var(--gradient-banner)" }}>
    <div className="grid grid-cols-3 gap-2">
      {promos.map((p) => (
        <div key={p.label} className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-lg bg-primary-foreground/10 px-2">
          <div className="rounded-full bg-primary-foreground/20 p-2 group-active:scale-95 transition-transform">
            <p.icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xs font-semibold text-primary-foreground leading-none">{p.label}</span>
          <span className="text-[10px] text-primary-foreground/70 leading-none">{p.sub}</span>
        </div>
      ))}
    </div>
  </section>
);

export default PromoBanner;
