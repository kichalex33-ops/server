(function (global) {
  const DB_NAME = "painelLogisticoMotoristaDb";
  const DB_VERSION = 1;
  const STORES = [
    "deviceConfig",
    "viagens",
    "passageiros",
    "eventosPendentes",
    "localizacoesPendentes",
    "mensagens",
    "checklists",
    "ocorrencias",
    "despesas",
    "statusViagem"
  ];

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const storeName of STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id" });
          }
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return dbPromise;
  }

  async function put(storeName, value) {
    const db = await openDb();
    return txPromise(db, storeName, "readwrite", (store) => store.put(value));
  }

  async function putMany(storeName, values) {
    const db = await openDb();
    return txPromise(db, storeName, "readwrite", (store) => {
      for (const value of values) store.put(value);
    });
  }

  async function get(storeName, id) {
    const db = await openDb();
    return txPromise(db, storeName, "readonly", (store) => store.get(id));
  }

  async function getAll(storeName) {
    const db = await openDb();
    return txPromise(db, storeName, "readonly", (store) => store.getAll());
  }

  async function remove(storeName, id) {
    const db = await openDb();
    return txPromise(db, storeName, "readwrite", (store) => store.delete(id));
  }

  async function clear(storeName) {
    const db = await openDb();
    return txPromise(db, storeName, "readwrite", (store) => store.clear());
  }

  async function setConfig(config) {
    return put("deviceConfig", { id: "current", ...config, updated_at: new Date().toISOString() });
  }

  async function getConfig() {
    return get("deviceConfig", "current");
  }

  async function addPending(storeName, payload) {
    const now = new Date().toISOString();
    const item = {
      id: payload.id || `${storeName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      status: "pendente",
      tentativas: 0,
      created_at: now,
      updated_at: now,
      ...payload
    };
    await put(storeName, item);
    return item;
  }

  function txPromise(db, storeName, mode, callback) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      let requestResult;
      try {
        requestResult = callback(store);
      } catch (error) {
        reject(error);
        return;
      }
      if (requestResult && "onsuccess" in requestResult) {
        requestResult.onsuccess = () => resolve(requestResult.result);
        requestResult.onerror = () => reject(requestResult.error);
      }
      tx.oncomplete = () => {
        if (!requestResult || !("onsuccess" in requestResult)) resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  global.DriverOfflineStore = {
    openDb,
    put,
    putMany,
    get,
    getAll,
    remove,
    clear,
    setConfig,
    getConfig,
    addPending,
    stores: STORES
  };
})(window);
