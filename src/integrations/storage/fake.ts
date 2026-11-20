import type { StorageProvider } from "./types";

export const fakeStorage: StorageProvider = {
  async uploadUrl(key) {
    return `fake://upload/${key}`;
  },
  async downloadUrl(key, expiresInSec) {
    return `fake://download/${key}?exp=${Date.now() + expiresInSec * 1000}`;
  },
  async remove() {},
};
