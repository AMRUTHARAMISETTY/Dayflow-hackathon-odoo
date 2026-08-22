const memory = new Map<string, string>();

function safeStorage(kind: "localStorage" | "sessionStorage"): Storage | null {
  try {
    return window[kind];
  } catch {
    return null;
  }
}

function make(kind: "localStorage" | "sessionStorage") {
  return {
    getItem(key: string) {
      return safeStorage(kind)?.getItem(key) ?? memory.get(`${kind}:${key}`) ?? null;
    },
    setItem(key: string, value: string) {
      const store = safeStorage(kind);
      if (store) store.setItem(key, value);
      else memory.set(`${kind}:${key}`, value);
    },
    removeItem(key: string) {
      const store = safeStorage(kind);
      if (store) store.removeItem(key);
      else memory.delete(`${kind}:${key}`);
    }
  };
}

/** Session credentials. Note: production deployments should move refresh tokens into an httpOnly
 * cookie; localStorage is used here for a self-contained SPA without a same-site cookie domain. */
export const storage = make("localStorage");

/** Last-known-good API responses, kept only for this tab, shown while offline (spec section 20). */
export const cache = make("sessionStorage");
