const memory = new Map<string, string>();

export const storage = {
  getItem(key: string) {
    return window.localStorage?.getItem(key) ?? memory.get(key) ?? null;
  },
  setItem(key: string, value: string) {
    if (window.localStorage) window.localStorage.setItem(key, value);
    else memory.set(key, value);
  },
  removeItem(key: string) {
    if (window.localStorage) window.localStorage.removeItem(key);
    else memory.delete(key);
  }
};
