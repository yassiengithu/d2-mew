const PLATFORM_COMMISSION_RATE = 0.05;

/** Round to 2 decimals (matches DB trigger ROUND(x, 2)). */
const round2 = (n: number) => Math.round(n * 100) / 100;

export const calculatePlatformFee = (subtotal: number) => round2(subtotal * PLATFORM_COMMISSION_RATE);

export const calculateSellerEarnings = (total: number) => round2(total - calculatePlatformFee(total));

export const PLATFORM_COMMISSION_LABEL = `Platform fee (${Math.round(PLATFORM_COMMISSION_RATE * 100)}%)`;