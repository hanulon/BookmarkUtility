import {Database, Stores} from "/src/shared/models/database.mjs";

const addToIdParent = 'bookmark-utility-ad-link-parent'
const addToIdTemplate = 'bookmark-utility-ad-link-to~';
const updaterIdTemplate = 'bookmark-utility-updater~';

chrome.runtime.onInstalled.addListener(async () => {
    chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
        if(request.type === "UpdateContextMenu"){
            chrome.contextMenus.removeAll(() => setup());
        }
    });
    setup();
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId.startsWith(addToIdTemplate)){
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
    } else if (info.menuItemId.startsWith(updaterIdTemplate)){
        const bookmarkId = info.menuItemId.replace(updaterIdTemplate, '');
        chrome.bookmarks.update(bookmarkId, {url: tab.url});
    }
});

async function setup(){
    setupUpdaterContextMenus('./updaterData.json');

    const dao = new Database(Stores.context);
    const ids = await dao.getBookmarkIds();
    const folders = (await Promise.all(ids.map(id => chrome.bookmarks.get(id)))).map(r => r[0]);
    await chrome.contextMenus.create({
        title: `Add link to...`,
        id: addToIdParent,
        contexts: ['link']
    })
    folders.forEach(folder => chrome.contextMenus.create({
        title: `...${folder.title}`,
        id: addToIdTemplate + folder.id,
        contexts: ['link'],
        parentId: addToIdParent
    }));
}

async function setupUpdaterContextMenus(path){
    const dao = new Database(Stores.updater);
    const ids = await dao.getBookmarkIds();
    const bookmarks = (await Promise.all(ids.map(id => chrome.bookmarks.get(id)))).map(r => r[0]);

    for(let bookmark of bookmarks){
        const lastStashPosition = bookmark.url.lastIndexOf('/');
        chrome.contextMenus.create({
            title: `Update '${bookmark.title}' bookmark`,
            id: updaterIdTemplate + bookmark.id,
            documentUrlPatterns: [bookmark.url.substring(0, lastStashPosition + 1) + '*']
        });
    }
}