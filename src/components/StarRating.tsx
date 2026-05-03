import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (next: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASS = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
  xl: "h-8 w-8",
};

const StarRating = ({ value, onChange, readOnly = false, size = "md", className }: StarRatingProps) => {
  const [hover, setHover] = useState(0);
  const display = hover || value;

  return (
    <div
      className={cn("flex items-center", readOnly ? "gap-0.5" : "gap-1.5", className)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={`Rating: ${value} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const active = n <= display;
        const Cmp = readOnly ? "span" : "button";
        return (
          <Cmp
            key={n}
            {...(!readOnly && {
              type: "button" as const,
              onClick: () => onChange?.(n),
              onMouseEnter: () => setHover(n),
              onMouseLeave: () => setHover(0),
              "aria-label": `Rate ${n} ${n === 1 ? "star" : "stars"}`,
              "aria-pressed": value === n,
            })}
            className={cn(
              "transition-transform",
              !readOnly &&
                "cursor-pointer hover:scale-110 active:scale-90 p-1 -m-1 touch-manipulation",
            )}
          >
            <Star
              className={cn(
                SIZE_CLASS[size],
                active
                  ? "fill-star text-star drop-shadow-sm"
                  : "fill-transparent text-muted-foreground/60",
              )}
            />
          </Cmp>
        );
      })}
    </div>
  );
};

export default StarRating;
