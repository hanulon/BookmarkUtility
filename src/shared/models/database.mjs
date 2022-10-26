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

    getBookmarkIds(store){
        return new Promise(async (resolve, reject) => {
            const db = await this.open();
            const req = db.getRWTransactionStore(store ?? this._store).getAll();
            req.onsuccess = ({target: {result}}) => resolve(result.map(r => r.id));
            req.onerror = reject;
        });
    }
    saveBookmarkIds(ids, store){
        return new Promise(async (resolve, reject) => {
            const db = await this.open();
            const transaction = db.getRWTransactionStore(store ?? this._store);

            const clearTx = transaction.clear();
            clearTx.onsuccess = () => resolve(transaction);
            clearTx.onerror = reject;
        }).then((transaction) => {
            return Promise.all(ids.map(id => new Promise((resolve, reject) => {
                const req = transaction.add({id});
                req.onsuccess = resolve;
                req.onerror = reject;
            })));
        });
    }

    async getAllSettings(){
        const data = { version: 1 };
        for(let store in Stores){
            const storeName = Stores[store];
            data[storeName] = await this.getBookmarkIds(storeName);
        }
        return data;
    }
    async saveAllSettings(settings){
        for(let store in Stores){
            const storeName = Stores[store];
            await this.saveBookmarkIds(settings[storeName], storeName);
        }
    }
}