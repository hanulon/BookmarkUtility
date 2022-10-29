import { getFoldersFlatList } from "/src/shared/models/helpers.mjs";

const template = await fetch('./multiImporter/multiImporter.html').then(resp => resp.text());
const importPlaceholder = `Paste here json data formatted like this:
[{
    "url":"http://google.com",
    "title":"Google"
},{
    "url":"http://duckduckgo.com",
    "title":"DuckDuckGo"
}]`;

class MultiImporter extends HTMLElement {
    constructor(){
        super();
        this._targetFolderId = null;
    }
    connectedCallback(){
        this.render();
    }

    async render(){
        this.innerHTML = template;
        const roots = await chrome.bookmarks.getTree();
        const importTargetSelector = this.querySelector('.import-target select');
        importTargetSelector.addEventListener('change', ({target:{value}}) => this._targetFolderId = value);
        const {loadedFolders} = getFoldersFlatList(roots[0].children, 'folder');
        importTargetSelector.innerHTML = loadedFolders.map(({id, path}) => {
            path = path.substring(2) + '//';
            return `<option value="${id}">${path}</option>`;
        }).join('');
        this._targetFolderId = loadedFolders[0]?.id;

        const importTextarea = this.querySelector('.insert-container textarea');
        importTextarea.placeholder = importPlaceholder;
        this.querySelector('.import-bookmarks-btn').addEventListener('click', async () => {
            const notification = this.querySelector('notification-div');
            try {
                const inputObj = JSON.parse(importTextarea.value);
                const data = [];
                //validate data format
                if(!Array.isArray(inputObj))
                    throw new Error('Inserted JSON is not an array!');
                for(let obj of inputObj){
                    if(typeof obj !== 'object')
                        throw new Error('All values in the array must be proper objects!');
                    const {url, title} = obj;
                    if(!url || !title)
                        throw new Error('All values in the array must both "url" and "title" property!');
                    if(typeof url !== 'string' || typeof title !== 'string')
                        throw new Error('Both "url" and "title" properties must be strings!');
                    data.push({url, title});
                }

                if(!data.length)
                    throw new Error('Inserted JSON was empty.');
                
                //proceed with save
                await Promise.all(data.map(({url, title}) => chrome.bookmarks.create({
                    title, url, parentId: this._targetFolderId
                })));
                notification.show("Bookmarks saved successfully");
            } catch (error) {
                notification.show(error);
            }
        })
    }
}

customElements.define('multi-importer', MultiImporter);