import type { ProductSource } from "@/data/products";

const sourceStyles: Record<ProductSource, string> = {
  Shopee: "bg-source-shopee text-white",
  Temu: "bg-source-temu text-white",
  Amazon: "bg-source-amazon text-white",
};

const SourceBadge = ({ source, className = "" }: { source: ProductSource; className?: string }) => (
  <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold leading-none ${sourceStyles[source]} ${className}`}>
    {source}
  </span>
);

export default SourceBadge;
