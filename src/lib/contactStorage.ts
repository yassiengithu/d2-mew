export const CONTACT_STORAGE_KEY = "shop:checkout-contact";
export const ADDRESSES_STORAGE_KEY = "shop:saved-addresses";
export const CONTACT_UPDATED_EVENT = "shop:contact-updated";

export type SavedContact = { name: string; phone: string; address: string };

export type SavedAddress = SavedContact & {
  id: string;
  label?: string;
  isDefault?: boolean;
};

export const EMPTY_CONTACT: SavedContact = { name: "", phone: "", address: "" };

const genId = () =>
  `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const emitUpdate = () => {
  try {
    window.dispatchEvent(new CustomEvent(CONTACT_UPDATED_EVENT));
  } catch {
    /* ignore */
  }
};

// ----- Legacy single contact (kept for migration / back-compat) -----

export const loadSavedContact = (): SavedContact => {
  // Prefer default from the addresses list when present
  const addrs = loadSavedAddresses();
  const def = addrs.find((a) => a.isDefault) ?? addrs[0];
  if (def) return { name: def.name, phone: def.phone, address: def.address };

  try {
    const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
    if (!raw) return { ...EMPTY_CONTACT };
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed?.name === "string" ? parsed.name : "",
      phone: typeof parsed?.phone === "string" ? parsed.phone : "",
      address: typeof parsed?.address === "string" ? parsed.address : "",
    };
  } catch {
    return { ...EMPTY_CONTACT };
  }
};

export const saveContact = (contact: SavedContact) => {
  const trimmed: SavedContact = {
    name: contact.name.trim(),
    phone: contact.phone.trim(),
    address: contact.address.trim(),
  };
  try {
    localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota errors */
  }

  // Also reflect into the addresses list: update default if exists, else upsert
  const addrs = loadSavedAddresses();
  const idx = addrs.findIndex((a) => a.isDefault);
  if (idx >= 0) {
    addrs[idx] = { ...addrs[idx], ...trimmed };
    persistAddresses(addrs);
  } else if (addrs.length > 0) {
    addrs[0] = { ...addrs[0], ...trimmed, isDefault: true };
    persistAddresses(addrs);
  } else {
    persistAddresses([{ id: genId(), ...trimmed, isDefault: true }]);
  }
  emitUpdate();
};

export const clearSavedContact = () => {
  try {
    localStorage.removeItem(CONTACT_STORAGE_KEY);
    localStorage.removeItem(ADDRESSES_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emitUpdate();
};

// ----- Multi-address API -----

const persistAddresses = (addrs: SavedAddress[]) => {
  try {
    localStorage.setItem(ADDRESSES_STORAGE_KEY, JSON.stringify(addrs));
  } catch {
    /* ignore quota errors */
  }
};

export const loadSavedAddresses = (): SavedAddress[] => {
  try {
    const raw = localStorage.getItem(ADDRESSES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const cleaned = parsed
          .filter((a) => a && typeof a === "object")
          .map((a) => ({
            id: typeof a.id === "string" && a.id ? a.id : genId(),
            name: typeof a.name === "string" ? a.name : "",
            phone: typeof a.phone === "string" ? a.phone : "",
            address: typeof a.address === "string" ? a.address : "",
            label: typeof a.label === "string" ? a.label : undefined,
            isDefault: Boolean(a.isDefault),
          }));
        // Ensure exactly one default if any exist
        if (cleaned.length > 0 && !cleaned.some((a) => a.isDefault)) {
          cleaned[0].isDefault = true;
        }
        return cleaned;
      }
    }
  } catch {
    /* fall through to migration */
  }

  // Migrate legacy single contact, if present
  try {
    const raw = localStorage.getItem(CONTACT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const c: SavedContact = {
        name: typeof parsed?.name === "string" ? parsed.name : "",
        phone: typeof parsed?.phone === "string" ? parsed.phone : "",
        address: typeof parsed?.address === "string" ? parsed.address : "",
      };
      if (c.name || c.phone || c.address) {
        const migrated: SavedAddress[] = [{ id: genId(), ...c, isDefault: true }];
        persistAddresses(migrated);
        return migrated;
      }
    }
  } catch {
    /* ignore */
  }

  return [];
};

export const upsertAddress = (
  input: Omit<SavedAddress, "id" | "isDefault"> & { id?: string; isDefault?: boolean },
): SavedAddress => {
  const addrs = loadSavedAddresses();
  const trimmed = {
    name: input.name.trim(),
    phone: input.phone.trim(),
    address: input.address.trim(),
    label: input.label?.trim() || undefined,
  };

  let saved: SavedAddress;
  if (input.id) {
    const idx = addrs.findIndex((a) => a.id === input.id);
    if (idx >= 0) {
      saved = { ...addrs[idx], ...trimmed };
      addrs[idx] = saved;
    } else {
      saved = { id: input.id, ...trimmed };
      addrs.push(saved);
    }
  } else {
    saved = { id: genId(), ...trimmed };
    addrs.push(saved);
  }

  // Make default if requested OR this is the only address
  if (input.isDefault || addrs.length === 1) {
    addrs.forEach((a) => (a.isDefault = a.id === saved.id));
    saved.isDefault = true;
  }

  persistAddresses(addrs);

  // Sync legacy key when default changes
  const def = addrs.find((a) => a.isDefault);
  if (def) {
    try {
      localStorage.setItem(
        CONTACT_STORAGE_KEY,
        JSON.stringify({ name: def.name, phone: def.phone, address: def.address }),
      );
    } catch {
      /* ignore */
    }
  }

  emitUpdate();
  return saved;
};

export const deleteAddress = (id: string) => {
  const addrs = loadSavedAddresses();
  const filtered = addrs.filter((a) => a.id !== id);
  const removedDefault = addrs.find((a) => a.id === id)?.isDefault;
  if (removedDefault && filtered.length > 0) {
    filtered[0].isDefault = true;
  }
  persistAddresses(filtered);

  if (filtered.length === 0) {
    try {
      localStorage.removeItem(CONTACT_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  } else {
    const def = filtered.find((a) => a.isDefault) ?? filtered[0];
    try {
      localStorage.setItem(
        CONTACT_STORAGE_KEY,
        JSON.stringify({ name: def.name, phone: def.phone, address: def.address }),
      );
    } catch {
      /* ignore */
    }
  }
  emitUpdate();
};

export const setDefaultAddress = (id: string) => {
  const addrs = loadSavedAddresses();
  if (!addrs.some((a) => a.id === id)) return;
  addrs.forEach((a) => (a.isDefault = a.id === id));
  persistAddresses(addrs);
  const def = addrs.find((a) => a.isDefault);
  if (def) {
    try {
      localStorage.setItem(
        CONTACT_STORAGE_KEY,
        JSON.stringify({ name: def.name, phone: def.phone, address: def.address }),
      );
    } catch {
      /* ignore */
    }
  }
  emitUpdate();
};
