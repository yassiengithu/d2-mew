// Courier registry — add new couriers here. Core logic doesn't change.
import type { CourierHandler } from "./types";
import { easyshipHandler } from "./handlers/easyship";
import { jtHandler } from "./handlers/jt";

const handlers = new Map<string, CourierHandler>();

export const registerCourier = (handler: CourierHandler) => {
  handlers.set(handler.code, handler);
};

export const getCourier = (code: string): CourierHandler => {
  const h = handlers.get(code);
  if (!h) throw new Error(`Unknown courier: ${code}`);
  return h;
};

export const listCouriers = (): CourierHandler[] => Array.from(handlers.values());

// Register defaults. To add Flash Express / Ninja Van later:
//   1. Implement CourierHandler in handlers/<code>.ts
//   2. registerCourier(<handler>) below
//   3. Insert a row into the `couriers` table
registerCourier(easyshipHandler);
registerCourier(jtHandler);
