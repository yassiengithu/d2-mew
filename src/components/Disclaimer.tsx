import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface DisclaimerProps {
  className?: string;
}

const Disclaimer = ({ className }: DisclaimerProps) => {
  return (
    <section
      aria-labelledby="disclaimer-title"
      className={cn(
        "rounded-xl border border-border bg-muted/40 p-4 space-y-2",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-muted-foreground" aria-hidden />
        <h2
          id="disclaimer-title"
          className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          Disclaimer
        </h2>
      </div>
      <ul className="space-y-1.5 text-xs leading-relaxed text-muted-foreground list-disc pl-5">
        <li>Payments are handled via a third-party provider.</li>
        <li>The platform does not directly hold funds.</li>
        <li>External links are not controlled by the platform.</li>
      </ul>
    </section>
  );
};

export default Disclaimer;
