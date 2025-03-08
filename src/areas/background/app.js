import {Database, Stores} from "/src/shared/models/database.mjs";

//context action ids
const addToParentId = 'bookmark-utility-ad-link-parent'
const actionSettingsId = 'bookmark-utility-action-settings';
const actionUpdaterId = 'bookmark-utility-action-updater';
const addToIdTemplate = 'bookmark-utility-ad-link-to~';
const updaterIdTemplate = 'bookmark-utility-updater~';

const updaterUrls = new Map();

chrome.runtime.onInstalled.addListener(async () => {
    chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
        if(request.type === "UpdateContextMenu"){
            chrome.contextMenus.removeAll(() => setup());
        }
    });
    await setup();
    
    chrome.tabs.query({}, tabs => tabs.forEach(({url, id}) => updateBadgeBasedOn(url, id)));
    chrome.tabs.onCreated.addListener(({url, id}) => 
        updateBadgeBasedOn(url, id)
    );
    chrome.tabs.onUpdated.addListener((tabId, _change, {url}) => 
        updateBadgeBasedOn(url, tabId)
    );
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if(info.menuItemId === actionSettingsId){
        chrome.tabs.create({ 'url': "src/areas/settings/settings.html" });
    } else if(info.menuItemId === actionUpdaterId){
        const bookmarkId = updaterUrls.get(getUpdaterBaseUrl(tab.url));
        chrome.bookmarks.update(bookmarkId, {url: tab.url});
    } else if(info.menuItemId.startsWith(addToIdTemplate)){
        const folderId = info.menuItemId.replace(addToIdTemplate, '');
        let title = info.selectionText || "Undefined";
        try{
            const {linkName} = await chrome.tabs.sendMessage(tab.id, {type: "GetTargetLinkName"});
            title = linkName || title;
        }catch(e){}
        
        chrome.bookmarks.create({
            title: title,
            url: info.linkUrl,
            parentId: folderId
        });
    } else if(info.menuItemId.startsWith(updaterIdTemplate)){
        const bookmarkId = info.menuItemId.replace(updaterIdTemplate, '');
        chrome.bookmarks.update(bookmarkId, {url: tab.url});
    }
});


function getUpdaterBaseUrl(url){
    return url?.substring(0, url?.lastIndexOf('/') + 1);
}

async function updateBadgeBasedOn(url, tabId, active = true){
    const baseUrl = getUpdaterBaseUrl(url);
    const visible = updaterUrls.has(baseUrl) && active;
    const title = visible ? `Right click within page to see a menu option to update '${await getBookmark(updaterUrls.get(baseUrl))}'.` : 'Bookmark Utility';

    chrome.action.setBadgeText({tabId, text: visible ? "U" : ''});
    chrome.action.setTitle({title, tabId});
    chrome.contextMenus.update(actionUpdaterId, {visible});
}

async function setup(){
    setupUpdaterContextMenus();

    const dao = new Database(Stores.context);
    const savedBookmarks = await dao.getBookmarkInfos();
    const folders = (await Promise.all(savedBookmarks.map(({id}) => chrome.bookmarks.get(id)))).map(r => r[0]);
    await chrome.contextMenus.create({
        title: 'Add link to...',
        id: addToParentId,
        contexts: ['link']
    })
    folders.forEach(folder => chrome.contextMenus.create({
        title: `...${folder.title}`,
        id: addToIdTemplate + folder.id,
        contexts: ['link'],
        parentId: addToParentId
    }));

    chrome.contextMenus.create({
        title: 'Settings',
        id: actionSettingsId,
        contexts: ['action']
    });
}

async function setupUpdaterContextMenus(){
    const dao = new Database(Stores.updater);
    const savedBookmarks = await dao.getBookmarkInfos();
    const bookmarks = (await Promise.all(savedBookmarks.map(({id}) => chrome.bookmarks.get(id)))).map(r => r[0]);
    updaterUrls.clear();

    for(let bookmark of bookmarks){
        const baseUrl = getUpdaterBaseUrl(bookmark.url);
        updaterUrls.set(baseUrl, bookmark.id);
        chrome.contextMenus.create({
            title: `Update '${bookmark.title}' bookmark`,
            id: updaterIdTemplate + bookmark.id,
            documentUrlPatterns: [baseUrl + '*']
        });
    }
    chrome.contextMenus.create({
        title: 'Update link',
        id: actionUpdaterId,
        contexts: ['action'],
        visible: false
    });
}

function getBookmark(id){
    return new Promise(resolve => chrome.bookmarks.get(id, ([b]) => resolve(b)));
}