import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

const EmptyState = ({ icon: Icon, title, description, action, className = "" }: EmptyStateProps) => (
  <div className={`flex flex-col items-center justify-center gap-4 px-8 text-center animate-fade-in ${className}`}>
    <div className="h-20 w-20 rounded-full bg-secondary flex items-center justify-center">
      <Icon className="h-9 w-9 text-muted-foreground" aria-hidden="true" />
    </div>
    <p className="text-base font-semibold text-foreground">{title}</p>
    {description && (
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
    )}
    {action && <div className="mt-1">{action}</div>}
  </div>
);

export default EmptyState;
