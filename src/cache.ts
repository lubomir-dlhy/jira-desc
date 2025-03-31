interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

export class Cache<T> {
  private items = new Map<string, CacheEntry<T>>();
  private readonly ttl: number;

  constructor(ttlHours: number = 1) {
    this.ttl = ttlHours * 60 * 60 * 1000; // Convert hours to milliseconds
  }

  set(key: string, value: T): void {
    if (!key || value === undefined) {
      console.warn("Attempted to cache invalid key or value", { key, value });
      return;
    }

    try {
      this.items.set(key, {
        value,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Error setting cache value:", error);
    }
  }

  get(key: string): T | undefined {
    if (!key) {
      console.warn("Attempted to get cache with invalid key");
      return undefined;
    }

    try {
      const item = this.items.get(key);
      if (!item) return undefined;

      if (Date.now() - item.timestamp > this.ttl) {
        this.items.delete(key);
        return undefined;
      }

      return item.value;
    } catch (error) {
      console.error("Error getting cache value:", error);
      return undefined;
    }
  }

  has(key: string): boolean {
    if (!key) return false;
    const item = this.items.get(key);
    if (!item) return false;
    if (Date.now() - item.timestamp > this.ttl) {
      this.items.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    try {
      this.items.clear();
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }
}
