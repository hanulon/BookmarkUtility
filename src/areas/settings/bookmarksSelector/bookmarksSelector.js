import { Database, Stores } from "/src/shared/models/database.mjs";

const template = await fetch('./bookmarksSelector/bookmarksSelector.html').then(resp => resp.text());

class BookmarksSelector extends HTMLElement {
    constructor(){
        super();
        this._selectedBookmarkIds = new Set();
        this._bookmarksByFolder = new Map();
        this._bookmarksCount = 0;
        switch (this.getAttribute('for')) {
            case "feed":
                this._dao = new Database(Stores.feed);
                break;
            case "context":
                this._dao = new Database(Stores.context);
                break;
            case "updater":
                this._dao = new Database(Stores.updater);
                break;
        
            default:
                this._dao = new Database();
                break;
        }
    }
    connectedCallback(){
        this.render();
    }

    async render(){
        const ids = await this._dao.getBookmarkIds();
        this._selectedBookmarkIds = new Set(ids);

        this.innerHTML = template;
        this.querySelector('.item-container>h2').textContent = this.getAttribute('header');
        
        const roots = await chrome.bookmarks.getTree();
        const loadedBookmarks = this.getFoldersFlatList(roots[0].children, this.getAttribute('type'));
        this._bookmarksCount = loadedBookmarks.length;
        if(this.getAttribute('type') === 'url'){
            const folderSelector = this.querySelector('select');
            folderSelector.innerHTML = loadedBookmarks.map(({id, path}) => {
                return `<option value="${id}">${path}</option>`;
            }).join('');

            folderSelector.addEventListener('change', ({target: {value}}) => {
                this.renderBookmarksList(this._bookmarksByFolder.get(value));
            });
            this.renderBookmarksList(this._bookmarksByFolder.get(loadedBookmarks[0].id));
        } else {
            this.renderBookmarksList(loadedBookmarks);
        }
        
        this.querySelector('.action-bar .selection-summary .total-count').textContent = this._bookmarksCount;
        this.querySelector('.action-bar .selection-summary .selected-count').textContent = this._selectedBookmarkIds.size;

        this.querySelector('.action-bar .save-btn').addEventListener('click', async () => {
            await this._dao.saveBookmarkIds([...this._selectedBookmarkIds]);
            this.querySelector('notification-div').show('Feed bookmark folders saved');
            const savedEvent = new CustomEvent('selectedBookmarksSaved');
            this.dispatchEvent(savedEvent);
        });
    }
    renderBookmarksList(bookmarksList){
        const list = this.querySelector('.bookmarks-list');
        list.innerHTML = bookmarksList.map(({id, path}) => {
            const isSelected = this._selectedBookmarkIds.has(id);
            return `<div class="bookmark-item ${isSelected ? 'selected' : ''}" bookmark-id="${id}"><check-box ${isSelected ? 'checked="true"' : ''}></check-box>${path}</div>`;
        }).join('');

        list.querySelectorAll('.bookmark-item').forEach(item => item.addEventListener('click', () => {
            item.classList.toggle('selected');
            const isSelected = item.classList.contains('selected');
            item.querySelector('check-box').setAttribute('checked', isSelected);
            const bookmarkId = item.getAttribute('bookmark-id');
            if(isSelected){
                this._selectedBookmarkIds.add(bookmarkId);
            } else{
                this._selectedBookmarkIds.delete(bookmarkId);
            }
            this.querySelector('.action-bar .selection-summary .selected-count').textContent = this._selectedBookmarkIds.size;
        }));
    }

    getFoldersFlatList(bookmarksArr, type){
        const result = [];
        for(let bookmark of bookmarksArr){
            result.push(...this._getFlatTree(bookmark, '/', 0, type));
        }

        return result;
    }
    _getFlatTree(bookmark, parentPath, parentId, allowedType){
        const currentPath = `${parentPath}/${bookmark.title}`;
        const result = [];
        if(!bookmark.url){
            result.push({id: bookmark.id, title: bookmark.title, path: currentPath});
        }
        if(allowedType === 'url' && !!bookmark.url){
            const siblingArray = this._bookmarksByFolder.get(parentId) ?? [];
            if(!siblingArray.length){
                this._bookmarksByFolder.set(parentId, siblingArray);
            }
            siblingArray.push({id: bookmark.id, title: bookmark.title, path: bookmark.title || bookmark.url});
        }
        for(let child of bookmark.children ?? []){
            result.push(...this._getFlatTree(child, currentPath, bookmark.id, allowedType));
        }

        return result;
    }
}

customElements.define('bookmarks-selector', BookmarksSelector);