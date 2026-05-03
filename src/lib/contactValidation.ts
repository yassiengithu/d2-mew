import { z } from "zod";

// Normalize phone by stripping spaces, dashes, parentheses
export const normalizePhone = (raw: string) => raw.replace(/[\s\-()]/g, "");

// Philippine mobile number patterns:
//   09XXXXXXXXX        (11 digits)
//   +639XXXXXXXXX      (13 chars)
//   639XXXXXXXXX       (12 digits)
// Also allow generic international: + followed by 8–14 digits (fallback)
const PH_MOBILE = /^(09\d{9}|\+639\d{9}|639\d{9})$/;
const INTL_FALLBACK = /^\+\d{8,14}$/;

export const isValidPhone = (raw: string) => {
  const n = normalizePhone(raw);
  return PH_MOBILE.test(n) || INTL_FALLBACK.test(n);
};

export const nameSchema = z
  .string()
  .trim()
  .min(2, { message: "Name must be at least 2 characters" })
  .max(100, { message: "Name is too long" })
  .regex(/^[\p{L}\s.'-]+$/u, { message: "Name can only contain letters, spaces, . ' -" });

export const phoneSchema = z
  .string()
  .trim()
  .min(1, { message: "Phone number is required" })
  .refine((v) => isValidPhone(v), {
    message: "Enter a valid PH mobile (e.g. 09171234567 or +639171234567)",
  });

export const addressSchema = z
  .string()
  .trim()
  .min(10, { message: "Address must be at least 10 characters" })
  .max(500, { message: "Address is too long" })
  .refine((v) => /\d/.test(v), {
    message: "Include a house, building, or street number",
  })
  .refine((v) => /[,\s]/.test(v), {
    message: "Include street, barangay, and city",
  });

export const labelSchema = z
  .string()
  .trim()
  .max(30, { message: "Label too long" })
  .optional()
  .or(z.literal(""));

export const contactSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  address: addressSchema,
});

export const addressFormSchema = contactSchema.extend({
  label: labelSchema,
});

export type ContactFieldErrors = Partial<Record<"name" | "phone" | "address" | "label", string>>;

export type ValidateContactResult =
  | { ok: true; data: { name: string; phone: string; address: string; label?: string } }
  | { ok: false; errors: ContactFieldErrors };

export const validateContact = (input: {
  name: string;
  phone: string;
  address: string;
  label?: string;
}): ValidateContactResult => {
  const result = addressFormSchema.safeParse(input);
  if (result.success) {
    return {
      ok: true,
      data: {
        name: result.data.name,
        phone: normalizePhone(result.data.phone),
        address: result.data.address,
        label: result.data.label || undefined,
      },
    };
  }
  const errors: ContactFieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof ContactFieldErrors;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
};
