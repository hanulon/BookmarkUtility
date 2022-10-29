window.onload = () =>{
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
}

