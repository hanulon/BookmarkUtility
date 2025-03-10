const DbName = "BookmarkUtilityDb";
const DbVersion = 1;
export const Stores = {
    feed: 'FeedStore',
    context: 'ContextStore',
    updater: 'UpdaterStore'
};

export class Database {
    constructor(store){
        this._store = store;
    }

    open(){
        return new Promise((resolve, reject) => {
            const request = globalThis.indexedDB.open(DbName, DbVersion);
            
            request.onerror = reject;
            request.onupgradeneeded = ({target:{result}}) => {
                const createdStores = [];
                for(let storeName in Stores){
                    createdStores.push(result.createObjectStore(Stores[storeName], {keyPath: "id"}));
                }
            }
            request.onsuccess = ({target: {result}}) => {
                result.getRWTransactionStore = (key) =>
                    result.transaction(key, 'readwrite').objectStore(key);
                resolve(result);
            }
        })
    }

    getBookmarkInfos(store){
        return new Promise(async (resolve, reject) => {
            const db = await this.open();
            const req = db.getRWTransactionStore(store ?? this._store).getAll();
            req.onsuccess = ({target: {result}}) => {
                result.sort((a, b) => a.order - b.order);
                resolve(result)
            };
            req.onerror = reject;
        });
    }
    saveBookmarkInfos(bookmarks, store){
        return new Promise(async (resolve, reject) => {
            const db = await this.open();
            const transaction = db.getRWTransactionStore(store ?? this._store);

            const clearTx = transaction.clear();
            clearTx.onsuccess = () => resolve(transaction);
            clearTx.onerror = reject;
        }).then((transaction) => {
            return Promise.all(bookmarks.map(({id, order}) => new Promise((resolve, reject) => {
                const req = transaction.add({id, order});
                req.onsuccess = resolve;
                req.onerror = reject;
            })));
        });
    }

    async getAllSettings(){
        const data = { version: 1 };
        for(let store in Stores){
            const storeName = Stores[store];
            data[storeName] = await this.getBookmarkInfos(storeName);
        }
        return data;
    }
    async saveAllSettings(settings){
        for(let store in Stores){
            const storeName = Stores[store];
            await this.saveBookmarkInfos(settings[storeName], storeName);
        }
    }
}

export class LogDao{
    #store = 'LogRemovedFromFeed';
    DbName = "BookmarkUtilityLog";
    DbVersion = 1;
    
    open(){
        return new Promise((resolve, reject) => {
            const request = globalThis.indexedDB.open(this.DbName, this.DbVersion);
            
            request.onerror = reject;
            request.onupgradeneeded = ({target:{result}}) => {
                result.createObjectStore(this.#store, {keyPath: "createdOn"})
            }
            request.onsuccess = ({target: {result}}) => {
                result.getRWTransactionStore = (key) =>
                    result.transaction(key, 'readwrite').objectStore(key);
                resolve(result);
            }
        });
    }

    getRemovedUrlsLog(){
        return new Promise(async (resolve, reject) => {
            const db = await this.open();
            const req = db.getRWTransactionStore(this.#store).getAll();
            req.onsuccess = ({target: {result}}) => {
                result.sort((a, b) => a.createdOn - b.createdOn);
                resolve(result)
            };
            req.onerror = reject;
        });
    }
    saveRemovedUrlsLog(logEntry){
        return new Promise(async (resolve, reject) => {
            const db = await this.open();
            const transaction = db.getRWTransactionStore(this.#store);

            const req = transaction.add({createdOn:Date.now(), logEntry});
            req.onsuccess = resolve;
            req.onerror = reject;
        });
    }
    clearRemovedUrlsLog(){
        return new Promise(async (resolve, reject) => {
            const db = await this.open();
            const transaction = db.getRWTransactionStore(this.#store);

            const clearTx = transaction.clear();
            clearTx.onsuccess = resolve;
            clearTx.onerror = reject;
        });
    }
}