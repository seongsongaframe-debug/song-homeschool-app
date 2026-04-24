// 저장소 추상화. v1은 LocalStorageAdapter로 동작.
// 추후 GoogleDriveAdapter 추가 시 동일 인터페이스만 구현하면 교체됨.

export interface StorageAdapter {
  read<T>(key: string): Promise<T | null>;
  write<T>(key: string, value: T): Promise<void>;
  list(prefix: string): Promise<string[]>;
  remove(key: string): Promise<void>;
}
