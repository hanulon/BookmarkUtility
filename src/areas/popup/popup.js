window.onload = () =>{
    document.querySelector('nav-bar').addEventListener('change', ({detail}) => {
        if(detail.tabId === 'settings'){
            chrome.tabs.create({ 'url': "src/areas/settings/settings.html" });
        }
    });
}