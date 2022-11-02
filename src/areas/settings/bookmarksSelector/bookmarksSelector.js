import { Database, Stores } from "/src/shared/models/database.mjs";
import { getFoldersFlatList } from "/src/shared/models/helpers.mjs";

const template = await fetch('./bookmarksSelector/bookmarksSelector.html').then(resp => resp.text());

class BookmarksSelector extends HTMLElement {
    constructor(){
        super();
        this._selectedBookmarks = [];
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
        const savedBookmarks = await this._dao.getBookmarkInfos();
        this._selectedBookmarks = savedBookmarks;

        this.innerHTML = template;
        this.querySelector('.item-container>h2').textContent = this.getAttribute('header');
        
        const roots = await chrome.bookmarks.getTree();
        const {loadedFolders, bookmarksByFolderId} = getFoldersFlatList(roots[0].children, this.getAttribute('type'));
        this._bookmarksByFolder = bookmarksByFolderId;
        this._bookmarksCount = loadedFolders.length;
        if(this.getAttribute('type') === 'url'){
            const folderSelector = this.querySelector('select');
            folderSelector.innerHTML = loadedFolders.map(({id, path}) =>
                `<option value="${id}">${path}</option>`
            ).join('');

            folderSelector.addEventListener('change', ({target: {value}}) =>
                this.renderBookmarksList(this._bookmarksByFolder.get(value))
            );
            this.renderBookmarksList(this._bookmarksByFolder.get(loadedFolders[0].id));
        } else {
            this.renderBookmarksList(loadedFolders);
        }
        this.renderSelectedList();
        
        this.querySelector('.action-bar .selection-summary .total-count').textContent = this._bookmarksCount;
        this.querySelector('.action-bar .selection-summary .selected-count').textContent = this._selectedBookmarks.length;

        this.querySelector('.action-bar .save-btn').addEventListener('click', async () => {
            await this._dao.saveBookmarkInfos(this._selectedBookmarks);
            this.querySelector('notification-div').showSuccess('Feed bookmark folders saved');
            const savedEvent = new CustomEvent('selectedBookmarksSaved');
            this.dispatchEvent(savedEvent);
        });
    }
    renderBookmarksList(bookmarksList){
        const list = this.querySelector('.bookmarks-list');
        list.innerHTML = (bookmarksList ?? []).map(({id, path}) => {
            const isSelected = !!this._selectedBookmarks.find(b => b.id === id);
            return `<div class="bookmark-item ${isSelected ? 'selected' : ''}" bookmark-id="${id}"><check-box ${isSelected ? 'checked="true"' : ''}></check-box>${path}</div>`;
        }).join('') || 'None';

        list.querySelectorAll('.bookmark-item').forEach(item => item.addEventListener('click', () => {
            item.classList.toggle('selected');
            const isSelected = item.classList.contains('selected');
            item.querySelector('check-box').setAttribute('checked', isSelected);
            const bookmarkId = item.getAttribute('bookmark-id');
            if(isSelected){
                this._selectedBookmarks.push({id: bookmarkId, order: this._selectedBookmarks.length});
            } else{
                this.handleSelectedRemove(bookmarkId);
            }
            this.querySelector('.action-bar .selection-summary .selected-count').textContent = this._selectedBookmarks.length;
            this.renderSelectedList();
        }));
    }
    renderSelectedList(){
        const list = this.querySelector('.selected-list');
        const pathsById = new Map();
        if(this.getAttribute('type') === 'folder'){
            this.querySelectorAll('.bookmarks-list .bookmark-item.selected').forEach(el => pathsById.set(el.getAttribute('bookmark-id'), el.textContent));
        } else {
            [...this._bookmarksByFolder.values()].forEach(group => group.forEach(b => pathsById.set(b.id, b.path)));
        }
        list.innerHTML = this._selectedBookmarks.map(({id}) => {
            const path = pathsById.get(id);
            return `<div class="bookmark-item" bookmark-id="${id}"><div class="order-buttons"><img order-change="-1" src="/media/chevron-up.svg"><img order-change="1" src="/media/chevron-down.svg"></div>${path}<img class="remove-selected" src="/media/x.svg"></div>`;
        }).join('');

        list.querySelectorAll('.remove-selected').forEach(el => el.addEventListener('click', ({target}) => {
            const bookmarkId = target.parentElement.getAttribute('bookmark-id');
            const relatedItem = this.querySelector(`.bookmarks-list .bookmark-item[bookmark-id="${bookmarkId}"]`);
            if(relatedItem){
                relatedItem.click();
            } else {
                this.handleSelectedRemove(bookmarkId);
            }
            
            this.renderSelectedList();
        }));

        list.querySelectorAll('.order-buttons').forEach(el => el.addEventListener('click', ({target}) => {
            const bookmarkId = target.parentElement.parentElement.getAttribute('bookmark-id');
            const index = this._selectedBookmarks.findIndex(b => b.id === bookmarkId);
            const targetOrder = index + Number(target.getAttribute('order-change'));
            if(targetOrder < 0 || targetOrder >= this._selectedBookmarks.length) return;

            this._selectedBookmarks[index].order = targetOrder;
            this._selectedBookmarks[targetOrder].order = index;
            this._selectedBookmarks.sort((a, b) => a.order - b.order);
            
            this.renderSelectedList();
        }));
    }
    handleSelectedRemove(bookmarkId){
        const deleteIndex = this._selectedBookmarks.findIndex(b => b.id === bookmarkId);
        this._selectedBookmarks.splice(deleteIndex, 1);
        for(let i=0; i<this._selectedBookmarks.length; i++){
            this._selectedBookmarks[i].order = i;
        }
    }
}

customElements.define('bookmarks-selector', BookmarksSelector);