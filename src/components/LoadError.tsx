import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoadErrorProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * Reusable "failed to load" state for data fetches, lazy chunks, and image lists.
 * Pass `onRetry` to render a Try Again button.
 */
const LoadError = ({
  title = "Failed to load",
  description = "Something went wrong while loading this. Check your connection and try again.",
  onRetry,
  className = "",
}: LoadErrorProps) => (
  <div
    role="alert"
    className={`flex flex-col items-center justify-center gap-4 px-8 text-center animate-fade-in ${className}`}
  >
    <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
      <AlertTriangle className="h-9 w-9 text-destructive" aria-hidden />
    </div>
    <div className="space-y-1.5">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{description}</p>
    </div>
    {onRetry && (
      <Button onClick={onRetry} className="rounded-xl h-11 px-6 text-sm font-bold gap-2 mt-1">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    )}
  </div>
);

export default LoadError;
