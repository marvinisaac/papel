const DB_NAME = 'papel-offline';
const DB_VERSION = 1;
const NOTE_STORE = 'notes';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(NOTE_STORE)) {
        db.createObjectStore(NOTE_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(NOTE_STORE, mode);
    const store = tx.objectStore(NOTE_STORE);
    const request = fn(store);

    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });
}

export const idbClient = {
  getAll<T>(): Promise<T[]> {
    return withStore('readonly', (store) => store.getAll() as IDBRequest<T[]>);
  },
  get<T>(id: string): Promise<T | undefined> {
    return withStore('readonly', (store) => store.get(id) as IDBRequest<T | undefined>);
  },
  put<T>(value: T): Promise<IDBValidKey> {
    return withStore('readwrite', (store) => store.put(value) as IDBRequest<IDBValidKey>);
  },
  delete(id: string): Promise<void> {
    return withStore('readwrite', (store) => store.delete(id) as IDBRequest<void>);
  },
};
