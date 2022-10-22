const addToDefaultId = 'bookmark-utility-ad-link-to-default';
const updaterIdTemplate = 'bookmark-utility-updater~';

setupUpdaterContextMenus('./updaterData.json');

chrome.contextMenus.create({
    title: 'Add link to default',
    id: addToDefaultId,
    contexts: ['link']
});


chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if(info.menuItemId === addToDefaultId){
        const {linkName} = await chrome.tabs.sendMessage(tab.id, {type: "GetTargetLinkName"});
        const title = linkName.length > 0 ? linkName : "Undefined";
        chrome.bookmarks.create({
            title: title,
            url: info.linkUrl,
            parentId: '1' //adding to bookmarks bar
        });
    } else if (info.menuItemId.startsWith(updaterIdTemplate)){
        const bookmarkId = info.menuItemId.replace(updaterIdTemplate, '');
        chrome.bookmarks.update(bookmarkId, {url: tab.url});
    }
});

async function setupUpdaterContextMenus(path){
    const fetchedText = await fetch('./updaterData.json').then(resp => resp.text());
    const bookmarkId = JSON.parse(fetchedText).id;
    const bookmarks = await chrome.bookmarks.get(bookmarkId);
    for(let bookmark of bookmarks){
        const lastStashPosition = bookmark.url.lastIndexOf('/');
        chrome.contextMenus.create({
            title: `Update '${bookmark.title}' bookmark`,
            id: updaterIdTemplate + bookmark.id,
            documentUrlPatterns: [bookmark.url.substring(0, lastStashPosition + 1) + '*']
        });
    }
}