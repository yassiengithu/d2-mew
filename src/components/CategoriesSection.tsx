import { Shirt, Smartphone, Footprints, Watch, Sparkles, Sofa } from "lucide-react";
import { useNavigate } from "react-router-dom";

const categories = [
  { icon: Shirt, name: "Fashion" },
  { icon: Smartphone, name: "Electronics" },
  { icon: Footprints, name: "Shoes" },
  { icon: Watch, name: "Accessories" },
  { icon: Sparkles, name: "Beauty" },
  { icon: Sofa, name: "Home" },
];

const CategoriesSection = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-foreground leading-tight tracking-tight">Categories</h2>
          <p className="mt-0.5 text-[11px] font-medium text-muted-foreground leading-tight">Browse by need</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {categories.map((cat) => (
          <button
            key={cat.name}
            onClick={() => navigate("/products")}
            className="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl bg-card p-2.5 shadow-card transition-all active:scale-95 hover:shadow-elevated"
          >
            <div className="rounded-lg bg-secondary p-2">
              <cat.icon className="h-4.5 w-4.5 text-secondary-foreground" />
            </div>
            <span className="max-w-full truncate text-[10px] font-semibold text-foreground leading-none">{cat.name}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoriesSection;
