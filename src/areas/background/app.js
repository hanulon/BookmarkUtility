import {Database, Stores} from "/src/shared/models/database.mjs";

const addToParentId = 'bookmark-utility-ad-link-parent'
const addToIdTemplate = 'bookmark-utility-ad-link-to~';
const updaterIdTemplate = 'bookmark-utility-updater~';
const actionSettingsId = 'bookmark-utility-action-settings';

let updaterUrls = new Set();
function getUpdaterBaseUrl(url){
    return url?.substring(0, url?.lastIndexOf('/') + 1);
}

chrome.runtime.onInstalled.addListener(async () => {
    chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
        if(request.type === "UpdateContextMenu"){
            chrome.contextMenus.removeAll(() => setup());
        }
    });
    setup();
    chrome.tabs.onActivated.addListener(async ({tabId}) => {
        const {url} = await chrome.tabs.get(tabId);
        const baseUrl = getUpdaterBaseUrl(url);
        chrome.action.setBadgeText({text: updaterUrls.has(baseUrl) ? "Updt" : ""});
    });
    chrome.tabs.onUpdated.addListener((_id, _change, {url, active}) => {
        const baseUrl = getUpdaterBaseUrl(url);
        chrome.action.setBadgeText({text: updaterUrls.has(baseUrl) && active ? "Updt" : ""});
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if(info.menuItemId === actionSettingsId){
        chrome.tabs.create({ 'url': "src/areas/settings/settings.html" });
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

async function setup(){
    setupUpdaterContextMenus();

    const dao = new Database(Stores.context);
    const savedBookmarks = await dao.getBookmarkInfos();
    const folders = (await Promise.all(savedBookmarks.map(({id}) => chrome.bookmarks.get(id)))).map(r => r[0]);
    await chrome.contextMenus.create({
        title: `Add link to...`,
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
    updaterUrls = new Set();

    for(let bookmark of bookmarks){
        const baseUrl = getUpdaterBaseUrl(bookmark.url);
        updaterUrls.add(baseUrl);
        chrome.contextMenus.create({
            title: `Update '${bookmark.title}' bookmark`,
            id: updaterIdTemplate + bookmark.id,
            documentUrlPatterns: [baseUrl + '*']
        });
    }
}