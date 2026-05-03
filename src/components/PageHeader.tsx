import { ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** If provided, back button uses Link to this path; otherwise navigates back. Set to null to hide. */
  backTo?: string | null;
  /** Right-side slot (badge, action button, etc.) */
  trailing?: ReactNode;
  className?: string;
}

const PageHeader = ({ title, subtitle, backTo, trailing, className }: PageHeaderProps) => {
  const navigate = useNavigate();
  const showBack = backTo !== null;

  const backButtonClass =
    "text-primary-foreground p-1.5 -ml-1.5 rounded-full active:bg-primary-foreground/10 transition-colors";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 px-4 py-4 flex items-center gap-3",
        className,
      )}
      style={{ background: "var(--gradient-primary)" }}
    >
      {showBack &&
        (backTo ? (
          <Link to={backTo} aria-label="Go back" className={backButtonClass}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className={backButtonClass}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ))}
      <div className="min-w-0 flex-1">
        <h1 className="text-base font-bold text-primary-foreground truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[11px] text-primary-foreground/75 truncate">{subtitle}</p>
        )}
      </div>
      {trailing && <div className="flex items-center gap-2 shrink-0">{trailing}</div>}
    </header>
  );
};

export default PageHeader;
