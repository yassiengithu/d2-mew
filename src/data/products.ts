export interface Seller {
  name: string;
  logo: string;
  rating: number;
  location: string;
}

export type ProductSource = "Shopee" | "Temu" | "Amazon";

export interface Product {
  id: number;
  name: string;
  price: number;
  oldPrice: number;
  rating: number;
  reviews: number;
  sold: string;
  img: string;
  category: string;
  description: string;
  seller: Seller;
  source: ProductSource;
  affiliateUrl?: string;
}

const sellers: Record<string, Seller> = {
  techHub: { name: "TechHub PH", logo: "🏪", rating: 4.9, location: "Manila" },
  styleHouse: { name: "Style House", logo: "👜", rating: 4.7, location: "Cebu City" },
  fitGear: { name: "FitGear Co.", logo: "🏃", rating: 4.8, location: "Quezon City" },
  glowUp: { name: "GlowUp Beauty", logo: "💄", rating: 4.6, location: "Makati" },
  dailyFinds: { name: "Daily Finds", logo: "🛒", rating: 4.5, location: "Davao City" },
  homeNest: { name: "HomeNest", logo: "🏠", rating: 4.7, location: "Pasig" },
};

export const products: Product[] = [
  { id: 1, name: "Wireless Earbuds Pro Max", price: 1299, oldPrice: 2499, rating: 4.8, reviews: 2341, sold: "12.1k", img: "🎧", category: "Electronics", description: "Premium wireless earbuds with active noise cancellation, 36-hour battery life, and crystal-clear sound quality. IPX5 water resistant. Includes 3 ear tip sizes and wireless charging case.", seller: sellers.techHub, source: "Shopee", affiliateUrl: "https://shopee.ph/search?keyword=wireless%20earbuds%20pro%20max" },
  { id: 2, name: "Floral Print Midi Dress", price: 599, oldPrice: 999, rating: 4.6, reviews: 1280, sold: "8.5k", img: "👗", category: "Fashion", description: "Elegant floral midi dress perfect for summer outings. Lightweight breathable fabric with a flattering A-line silhouette. Available in 4 colors.", seller: sellers.styleHouse, source: "Temu", affiliateUrl: "https://www.temu.com/search_result.html?search_key=floral%20print%20midi%20dress" },
  { id: 3, name: "UltraBoost Running Shoes", price: 1899, oldPrice: 3499, rating: 4.9, reviews: 4120, sold: "21.3k", img: "👟", category: "Shoes", description: "High-performance running shoes with responsive cushioning and breathable mesh upper. Designed for comfort on every stride. Sizes 36-45.", seller: sellers.fitGear, source: "Amazon", affiliateUrl: "https://www.amazon.com/s?k=ultraboost%20running%20shoes" },
  { id: 4, name: "Smart Watch Fitness Tracker", price: 2499, oldPrice: 4999, rating: 4.7, reviews: 1890, sold: "9.4k", img: "⌚", category: "Electronics", description: "Feature-packed smartwatch with heart rate monitor, GPS tracking, sleep analysis, and 7-day battery life. Water resistant to 50m. Compatible with iOS & Android.", seller: sellers.techHub, source: "Shopee" },
  { id: 5, name: "Canvas Laptop Backpack", price: 899, oldPrice: 1599, rating: 4.5, reviews: 970, sold: "6.7k", img: "🎒", category: "Accessories", description: "Durable canvas backpack with padded 15.6\" laptop compartment, USB charging port, multiple organizer pockets, and ergonomic straps.", seller: sellers.dailyFinds, source: "Amazon" },
  { id: 6, name: "Hydrating Moisturizer SPF30", price: 349, oldPrice: 699, rating: 4.4, reviews: 3150, sold: "32k", img: "✨", category: "Beauty", description: "Lightweight daily moisturizer with SPF30 sun protection. Hydrates and nourishes skin with hyaluronic acid and vitamin E. Dermatologist tested.", seller: sellers.glowUp, source: "Temu" },
  { id: 7, name: "Portable Bluetooth Speaker", price: 799, oldPrice: 1299, rating: 4.3, reviews: 1560, sold: "11k", img: "🔊", category: "Electronics", description: "Compact speaker with 360° immersive sound, 20-hour playtime, and IPX7 waterproof rating. Perfect for outdoor adventures.", seller: sellers.techHub, source: "Shopee" },
  { id: 8, name: "Classic Denim Jacket", price: 1199, oldPrice: 1999, rating: 4.6, reviews: 2030, sold: "7.8k", img: "🧥", category: "Fashion", description: "Timeless classic-fit denim jacket crafted from premium cotton. Button closure, chest pockets, and a comfortable relaxed fit.", seller: sellers.styleHouse, source: "Amazon" },
  { id: 9, name: "Vitamin C Brightening Serum", price: 449, oldPrice: 899, rating: 4.7, reviews: 2780, sold: "25k", img: "💧", category: "Beauty", description: "Powerful brightening serum with 20% Vitamin C, niacinamide, and ferulic acid. Reduces dark spots and evens skin tone in 4 weeks.", seller: sellers.glowUp, source: "Temu" },
  { id: 10, name: "Insulated Water Bottle 750ml", price: 399, oldPrice: 699, rating: 4.5, reviews: 1920, sold: "18k", img: "🥤", category: "Accessories", description: "Double-wall vacuum insulated stainless steel bottle. Keeps cold 24hrs, hot 12hrs. BPA-free, leak-proof lid.", seller: sellers.dailyFinds, source: "Shopee" },
  { id: 11, name: "LED Desk Lamp Touch Control", price: 549, oldPrice: 999, rating: 4.4, reviews: 890, sold: "5.2k", img: "💡", category: "Home", description: "Modern LED desk lamp with 5 brightness levels, 3 color temperatures, and USB charging port. Eye-caring, flicker-free design.", seller: sellers.homeNest, source: "Amazon" },
  { id: 12, name: "Crossbody Sling Bag", price: 459, oldPrice: 799, rating: 4.3, reviews: 1340, sold: "9.1k", img: "👝", category: "Accessories", description: "Compact waterproof crossbody sling bag with anti-theft pocket. Adjustable strap, multiple compartments. Perfect for daily carry.", seller: sellers.dailyFinds, source: "Temu" },
];
