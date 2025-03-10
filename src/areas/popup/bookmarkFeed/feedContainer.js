import { Database, Stores, LogDao } from "/src/shared/models/database.mjs";

const template = await fetch('./bookmarkFeed/feedContainer.html').then(resp => resp.text());
const openerDocumentTemplate = await fetch('./bookmarkFeed/linksOpenerDocument.html').then(resp => resp.text());

class FeedContainer extends HTMLElement {
    constructor(){
        super();
        this._selectedFolderId = null;
        this._displayedLinksCount = 10;
        this._loadedLinkIds = [];
        this._dao = new Database(Stores.feed);
        this._log = new LogDao();
    }
    connectedCallback() {
        this.attachShadow({mode: 'open'});
        this.loadOptions().then(() => this.render());
    }

    async loadOptions(){
        const savedBookmarks = await this._dao.getBookmarkInfos();
        const results = await Promise.all(savedBookmarks.map(({id}) => chrome.bookmarks.get(id)));
        const nodes = results.map(r => r[0]);
        this._folderOptions = nodes.map(n => ({value: n.id, label: n.title}));
        this._selectedFolderId = this._folderOptions[0]?.value;
    }
    async render(){
        this.shadowRoot.innerHTML = template;
        this._loadedLinkIds = [];
        const container = this.shadowRoot.querySelector('.bookmark-feed-container');
        const selector = container.querySelector('.selector-container select');
        const listOfLinks = container.querySelector('.list-of-links ol');
        const counterInput = container.querySelector('.selector-container .counter input');
        
        this._folderOptions?.forEach(o => selector.innerHTML += `<option value="${o.value}">${o.label}</option>`);
        selector.value = this._selectedFolderId;
        counterInput.value = this._displayedLinksCount;

        selector.addEventListener('change', ({target: {value}}) => {
            this._selectedFolderId = value;
            this.render();
        });
        counterInput.addEventListener('keyup', ({target: {value}}) =>
            this._displayedLinksCount = value
        );
        counterInput.addEventListener('change', ({target: {value}}) =>
            this._displayedLinksCount = value
        );

        if(this._selectedFolderId){
            const nodes = await chrome.bookmarks.getChildren(this._selectedFolderId)
            let links = nodes.filter(n => !!n.url);
            container.querySelector('.counter span').textContent = links.length;
            for(let i = 0; i < Math.min(this._displayedLinksCount, links.length); i++){
                listOfLinks.innerHTML += `<li><a href="${links[i].url}">${links[i].title}</a></li>`;
                this._loadedLinkIds.push(links[i].id);
            }

            const downloadHtmlButton = container.querySelector('.download-loaded-as-html a');
            const downloadData = encodeURIComponent(openerDocumentTemplate.replace('<data-insert/>', listOfLinks.outerHTML));
            downloadHtmlButton.setAttribute('href', `data:text/plain;charset=utf-8,${downloadData}`);
            downloadHtmlButton.setAttribute('download', `bookmarks_${Date.now()}.html`);
        }

        container.querySelector('.copy-loaded-to-clipboard').addEventListener('click', () => {
            let linksText = '';
            for(let i=0; i<listOfLinks.children.length; i++){
                const item = listOfLinks.children[i];
                linksText += `${i+1}. [${item.textContent}](${item.querySelector('a').href})\n`;
            }
            navigator.clipboard.writeText(linksText.trimEnd());
            container.querySelector('notification-div').show('Links copied to clipboard');
        });

        container.querySelector('.delete-loaded').addEventListener('click', async () => {
            if(!this._loadedLinkIds.length) return;
            if(listOfLinks.children.length !== this._loadedLinkIds.length){
                throw Error("_loadedLinkIds are not the same as displayed links!");
            }
            await this._log.saveRemovedUrlsLog(listOfLinks.outerHTML);
            this.parentElement.querySelector('log-viewer').refreshLogs();
            for(const id of this._loadedLinkIds){
                await chrome.bookmarks.remove(id);
            }
            this.render();
        });

        container.querySelector('.reload-button').addEventListener('click', () => 
            this.render()
        );
    }
}

customElements.define('bookmark-feed', FeedContainer);