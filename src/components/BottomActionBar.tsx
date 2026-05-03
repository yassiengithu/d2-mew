import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BottomActionBarProps {
  children: ReactNode;
  className?: string;
}

/**
 * Fixed bottom action bar above the BottomNav (52px tall).
 * Provides consistent spacing, background, and safe-area padding across pages.
 */
const BottomActionBar = ({ children, className }: BottomActionBarProps) => {
  return (
    <div
      className={cn(
        "fixed bottom-[52px] left-0 right-0 max-w-md mx-auto bg-card border-t border-border px-4 py-3 z-40 safe-bottom",
        className,
      )}
    >
      {children}
    </div>
  );
};

export default BottomActionBar;
