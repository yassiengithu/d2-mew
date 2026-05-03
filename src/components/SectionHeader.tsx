import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: string;
}

const SectionHeader = ({ title, subtitle, actionLabel, actionTo }: SectionHeaderProps) => (
  <div className="mb-3 flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h2 className="text-[15px] font-bold text-foreground leading-tight tracking-tight">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground leading-tight">
          {subtitle}
        </p>
      )}
    </div>
    {actionLabel && actionTo && (
      <Link
        to={actionTo}
        className="flex shrink-0 items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground transition-transform active:scale-95"
      >
        {actionLabel}
        <ArrowRight className="h-3 w-3" />
      </Link>
    )}
  </div>
);

export default SectionHeader;
