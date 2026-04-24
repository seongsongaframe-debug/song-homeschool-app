import type { StorageAdapter } from "./StorageAdapter";

const NS = "songhs::";

export class LocalStorageAdapter implements StorageAdapter {
  async read<T>(key: string): Promise<T | null> {
    const raw = localStorage.getItem(NS + key);
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async write<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(NS + key, JSON.stringify(value));
  }

  async list(prefix: string): Promise<string[]> {
    const out: string[] = [];
    const fullPrefix = NS + prefix;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) out.push(k.slice(NS.length));
    }
    return out;
  }

  async remove(key: string): Promise<void> {
    localStorage.removeItem(NS + key);
  }
}
