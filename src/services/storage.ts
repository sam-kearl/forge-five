/**
 * Local key–value storage. Everything Forge Five remembers stays on the device.
 * The interface is tiny so it can be backed by AsyncStorage (native + web
 * localStorage) or an in-memory map (tests, private browsing fallback).
 */
export interface StorageService {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export class MemoryStorage implements StorageService {
  private map = new Map<string, string>();
  async getItem(key: string) {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  async setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  async removeItem(key: string) {
    this.map.delete(key);
  }
}

/** Every key the app writes. Listed in docs/PRIVACY_INVENTORY.md. */
export const STORAGE_KEYS = {
  settings: 'ff.settings.v1',
  stats: 'ff.stats.v1',
  game: 'ff.game.v1',
  tutorial: 'ff.tutorial.v1',
  entitlements: 'ff.entitlements.v1',
  recent: 'ff.recent.v1',
} as const;

/** Read and parse JSON, falling back safely on missing or corrupt data. */
export async function loadJson<T>(storage: StorageService, key: string, fallback: T, validate?: (v: unknown) => v is T): Promise<T> {
  try {
    const raw = await storage.getItem(key);
    if (raw == null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (validate && !validate(parsed)) return fallback;
    return parsed as T;
  } catch {
    return fallback;
  }
}

export async function saveJson(storage: StorageService, key: string, value: unknown): Promise<void> {
  try {
    await storage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable (e.g. blocked web storage). Play continues regardless.
  }
}
