import { getUpdaterBookmarks, getUpdaterBaseUrl } from "/src/shared/models/helpers.mjs";

window.onload = async () =>{
    const bookmarksTask = getUpdaterBookmarks();
    const navBar = document.querySelector('nav-bar');

    navBar.addEventListener('change', ({detail: {tabId}}) => {
        if(tabId === 'settings'){
            chrome.tabs.create({ 'url': "src/areas/settings/settings.html" });
            return;
        }
        const allCards = document.querySelectorAll('.card');
        allCards.forEach(c => {
            c.classList.remove('selected');
            if(c.getAttribute('type') === tabId){
                c.classList.add('selected');
            }
        });
    });

    setTimeout(() => navBar.setDefault(), 100);
    chrome.windows.getCurrent({populate:true}, async w => {
        const activeTab = w.tabs.find(t => t.active);
        console.log(activeTab, activeTab.title, activeTab.url, activeTab.id);
        chrome.action.getBadgeText({tabId:activeTab.id}, async name => {
            if(name === 'U'){
                const bookmarks = await bookmarksTask;
                const baseUrl = getUpdaterBaseUrl(activeTab.url);
                const bookmark = bookmarks.find(b => getUpdaterBaseUrl(b.url) === baseUrl);
                const updateButton = document.querySelector('#update-page-btn');
                updateButton.textContent = `Update '${bookmark.title}' bookmark`;
                updateButton.style.display = 'inline-block';
                updateButton.addEventListener('click', () => {
                    chrome.bookmarks.update(bookmark.id, {url: activeTab.url});
                });
            }
        })
    })
}

