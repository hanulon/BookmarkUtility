var linkName = "";


addEventListener('contextmenu', (evt) => {
    linkName = evt.target.textContent;
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if(request.type === "GetTargetLinkName"){
        sendResponse({linkName});
        linkName = "";
    }
});