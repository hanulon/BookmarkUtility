import {Database, Stores} from "/src/shared/models/database.mjs";
import { getUpdaterBookmarks, getUpdaterBaseUrl, log } from "/src/shared/models/helpers.mjs";

//context action ids
const addToParentId = 'bookmark-utility-ad-link-parent'
const actionSettingsId = 'bookmark-utility-action-settings';
const addToIdTemplate = 'bookmark-utility-ad-link-to~';
const updaterIdTemplate = 'bookmark-utility-updater~';

const updaterUrls = new Map();

/***
 * Seems listeners CANNOT be set within any function, because
 * when the background service becomes inactive the func closures are erased?
 * So the setup has to happen straight here.
 */
log('Setting up service worker.');
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if(info.menuItemId === actionSettingsId){
        chrome.tabs.create({ 'url': "src/areas/settings/settings.html" });
    } else if(info.menuItemId.startsWith(addToIdTemplate)){
        log('Trying to Add link.', info.menuItemId);
        const folderId = info.menuItemId.replace(addToIdTemplate, '');
        let title = info.selectionText || "Undefined";
        try{
            log('Trying to get name for link.', info.menuItemId);
            const {linkName} = await chrome.tabs.sendMessage(tab.id, {type: "GetTargetLinkName"});
            title = linkName || title;
        }catch(e){}
        
        chrome.bookmarks.create({
            title: title,
            url: info.linkUrl,
            parentId: folderId
        });
        log('Creating bookmark.', info.menuItemId);
    } else if(info.menuItemId.startsWith(updaterIdTemplate)){
        const bookmarkId = info.menuItemId.replace(updaterIdTemplate, '');
        chrome.bookmarks.update(bookmarkId, {url: tab.url});
    }
});
setupContextMenus();
chrome.runtime.onMessage.addListener(async (request, _sender, _sendResponse) => {
    switch(request.type){
        case 'UpdateContextMenu':
            await setupContextMenus();
            break;
    }
});
chrome.tabs.query({}, tabs => tabs.forEach(({url, id}) => updateBadgeBasedOn(url, id)));
chrome.tabs.onCreated.addListener(({url, id}) =>{
    updateBadgeBasedOn(url, id)
});
chrome.tabs.onUpdated.addListener((tabId, {status}, {url}) => {
    if(status === 'loading'){
        updateBadgeBasedOn(url, tabId);
    }
});
log('Service worker is ready.');


async function updateBadgeBasedOn(url, tabId, active = true){
    const baseUrl = getUpdaterBaseUrl(url);
    const visible = updaterUrls.has(baseUrl) && active;
    const title = visible ? 'Bookmark Utility (Link update available)' : 'Bookmark Utility';

    chrome.action.setBadgeText({tabId, text: visible ? "U" : ''});
    chrome.action.setTitle({title, tabId});
}

async function setupContextMenus(){
    await chrome.contextMenus.removeAll();
    await setupUpdaterContextMenus();

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
    const bookmarks = await getUpdaterBookmarks();
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
}