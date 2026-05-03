import SearchHeader from "@/components/SearchHeader";
import PromoBanner from "@/components/PromoBanner";
import CategoriesSection from "@/components/CategoriesSection";
import FeaturedProducts from "@/components/FeaturedProducts";
import YouMayAlsoLike from "@/components/YouMayAlsoLike";
import BottomNav from "@/components/BottomNav";

const Index = () => (
  <div className="relative mx-auto min-h-screen max-w-md bg-background">
    <h1 className="sr-only">ShopHub — Discover great deals from trusted sellers</h1>
    <SearchHeader />
    <main className="flex flex-col gap-6 pt-3 pb-24">
      <PromoBanner />
      <CategoriesSection />
      <FeaturedProducts />
      <YouMayAlsoLike />
    </main>
    <BottomNav />
  </div>
);

export default Index;

