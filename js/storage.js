/**
 * IndexedDB Abstraction Layer
 */

export const APP_VERSION = '1.0.1'; // Bumped for storage migration

const DB_NAME = 'clinical_tracker_db';
const DB_VERSION = 1;
const STORES = {
    ENTRIES: 'entries',
    SETTINGS: 'settings',
    SUGGESTIONS: 'suggestions'
};

const DEFAULT_SUGGESTIONS = {
    food_labels: ['Rice', 'Porridge', 'Meat', 'Vegetable', 'Fruit', 'Supplement'],
    fluid_labels: ['Water', 'Milk', 'Soup', 'Juice', 'Electrolyte'],
    meds_labels: ['Dexamethasone', 'Prednisolone', 'Methotrexate', 'Vincristine', 'Ondansetron', 'Allopurinol'],
    food_units: ['bowl', 'plate', 'g', 'pcs'],
    fluid_units: ['ml', 'cup', 'oz'],
    meds_units: ['mg', 'pill', 'dose', 'ml']
};

const DEFAULT_SETTINGS = {
    cycles: [], // Array of { id, name, startDate, endDate }
    emergency_temp: 38.0,
    emergency_anc: 0.5
};

let db = null;

/**
 * Initialize the database
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORES.ENTRIES)) {
                db.createObjectStore(STORES.ENTRIES, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
                db.createObjectStore(STORES.SETTINGS);
            }
            if (!db.objectStoreNames.contains(STORES.SUGGESTIONS)) {
                db.createObjectStore(STORES.SUGGESTIONS);
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            reject('IndexedDB error: ' + event.target.errorCode);
        };
    });
};

/**
 * Migration from LocalStorage
 */
const migrateData = async () => {
    const isMigrated = localStorage.getItem('idb_migrated');
    if (isMigrated) return;

    console.log('Migrating data from LocalStorage to IndexedDB...');
    
    // Migrate Entries
    const entriesData = localStorage.getItem('clinical_entries');
    if (entriesData) {
        const entries = JSON.parse(entriesData);
        for (const entry of entries) {
            await storage.saveEntry(entry);
        }
    }

    // Migrate Settings
    const settingsData = localStorage.getItem('clinical_settings');
    if (settingsData) {
        await storage.saveSettings(JSON.parse(settingsData));
    }

    // Migrate Suggestions
    const suggestionsData = localStorage.getItem('clinical_suggestions');
    if (suggestionsData) {
        const custom = JSON.parse(suggestionsData);
        for (const category in custom) {
            for (const value of custom[category]) {
                await storage.addSuggestion(category, value);
            }
        }
    }

    localStorage.setItem('idb_migrated', 'true');
    console.log('Migration complete.');
};

export const storage = {
    init: async () => {
        await initDB();
        await migrateData();
    },

    /**
     * Get all suggestions
     */
    getSuggestions: async () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.SUGGESTIONS], 'readonly');
            const store = transaction.objectStore(STORES.SUGGESTIONS);
            const request = store.get('custom');

            request.onsuccess = () => {
                const custom = request.result || {};
                const merged = {};
                Object.keys(DEFAULT_SUGGESTIONS).forEach(key => {
                    const set = new Set([...DEFAULT_SUGGESTIONS[key], ...(custom[key] || [])]);
                    merged[key] = Array.from(set);
                });
                resolve(merged);
            };
        });
    },

    /**
     * Add a new suggestion
     */
    addSuggestion: async (category, value) => {
        if (!value) return;
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.SUGGESTIONS], 'readwrite');
            const store = transaction.objectStore(STORES.SUGGESTIONS);
            const request = store.get('custom');

            request.onsuccess = () => {
                const custom = request.result || {};
                if (!custom[category]) custom[category] = [];
                
                if (!DEFAULT_SUGGESTIONS[category].includes(value) && !custom[category].includes(value)) {
                    custom[category].push(value);
                    store.put(custom, 'custom');
                }
                resolve();
            };
        });
    },

    /**
     * Get all entries
     */
    getEntries: async () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.ENTRIES], 'readonly');
            const store = transaction.objectStore(STORES.ENTRIES);
            const request = store.getAll();

            request.onsuccess = () => {
                const entries = request.result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                resolve(entries);
            };
        });
    },

    /**
     * Save a new entry
     */
    saveEntry: async (entry) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
            const store = transaction.objectStore(STORES.ENTRIES);
            const newEntry = {
                id: entry.id || crypto.randomUUID(),
                timestamp: entry.timestamp || new Date().toISOString(),
                app_version: APP_VERSION,
                source: entry.source || 'manual',
                ...entry
            };
            store.put(newEntry);
            transaction.oncomplete = () => resolve(newEntry);
        });
    },

    /**
     * Update an existing entry
     */
    updateEntry: async (id, updatedData) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
            const store = transaction.objectStore(STORES.ENTRIES);
            const request = store.get(id);

            request.onsuccess = () => {
                const entry = request.result;
                if (entry) {
                    const updated = { ...entry, ...updatedData, id, app_version: APP_VERSION };
                    store.put(updated);
                    resolve(updated);
                } else {
                    resolve(null);
                }
            };
        });
    },

    /**
     * Delete an entry
     */
    deleteEntry: async (id) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
            const store = transaction.objectStore(STORES.ENTRIES);
            store.delete(id);
            transaction.oncomplete = () => resolve();
        });
    },

    /**
     * Get app settings
     */
    getSettings: async () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readonly');
            const store = transaction.objectStore(STORES.SETTINGS);
            const request = store.get('app_settings');

            request.onsuccess = () => {
                resolve(request.result || DEFAULT_SETTINGS);
            };
        });
    },

    /**
     * Save app settings
     */
    saveSettings: async (settings) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.SETTINGS], 'readwrite');
            const store = transaction.objectStore(STORES.SETTINGS);
            store.put(settings, 'app_settings');
            transaction.oncomplete = () => resolve();
        });
    },

    /**
     * Delete entries by source
     */
    deleteEntriesBySource: async (source) => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.ENTRIES], 'readwrite');
            const store = transaction.objectStore(STORES.ENTRIES);
            const request = store.getAll();

            request.onsuccess = () => {
                const entries = request.result;
                const toDelete = entries.filter(e => e.source === source);
                toDelete.forEach(e => store.delete(e.id));
                transaction.oncomplete = () => resolve();
            };
        });
    },

    /**
     * Clear all data
     */
    clearAll: async () => {
        return new Promise((resolve) => {
            const transaction = db.transaction([STORES.ENTRIES, STORES.SETTINGS, STORES.SUGGESTIONS], 'readwrite');
            transaction.objectStore(STORES.ENTRIES).clear();
            transaction.objectStore(STORES.SETTINGS).clear();
            transaction.objectStore(STORES.SUGGESTIONS).clear();
            transaction.oncomplete = () => {
                localStorage.removeItem('idb_migrated');
                resolve();
            };
        });
    }
};
