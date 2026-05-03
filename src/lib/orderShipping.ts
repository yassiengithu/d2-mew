// Lightweight order-state storage for the currently selected shipping courier.
// Decoupled from any DB schema so it can be attached to an order at checkout.
import type { CourierRate } from "@/components/CourierSelector";

const KEY = "order:selected_courier";

export type SelectedCourier = {
  id: string;
  rate: CourierRate;
  selected_at: string;
};

export const saveSelectedCourier = (id: string, rate: CourierRate) => {
  const payload: SelectedCourier = { id, rate, selected_at: new Date().toISOString() };
  try {
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / privacy mode errors
  }
};

export const getSelectedCourier = (): SelectedCourier | null => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SelectedCourier) : null;
  } catch {
    return null;
  }
};

export const clearSelectedCourier = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};
