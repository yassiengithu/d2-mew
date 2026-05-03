import { ImageIcon, type LucideIcon } from "lucide-react";
import { useState, type ImgHTMLAttributes } from "react";

interface SmartImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Icon shown when src is missing or fails to load. */
  fallbackIcon?: LucideIcon;
  /** Optional className for the fallback wrapper. */
  fallbackClassName?: string;
}

/**
 * <img> wrapper that renders an icon fallback when the image is missing
 * or fails to load (broken URL, offline, blocked host, etc.).
 */
const SmartImage = ({
  src,
  alt = "",
  fallbackIcon: FallbackIcon = ImageIcon,
  fallbackClassName = "h-full w-full flex items-center justify-center bg-secondary",
  className,
  ...rest
}: SmartImageProps) => {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    return (
      <div className={fallbackClassName} role="img" aria-label={alt || "Image unavailable"}>
        <FallbackIcon className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={className}
      {...rest}
    />
  );
};

export default SmartImage;
