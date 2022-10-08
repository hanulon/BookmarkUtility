const addToDefaultId = 'bookmark-utility-ad-link-to-default';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        title: 'Add link to default',
        id: addToDefaultId,
        contexts: ['link']
    });
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
    }
});