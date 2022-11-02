var linkName = "";


addEventListener('contextmenu', ({target: {textContent}}) => 
    linkName = textContent
);

chrome.runtime.onMessage.addListener(({type}, _sender, sendResponse) => {
    if(type === "GetTargetLinkName"){
        sendResponse({linkName});
        linkName = "";
    }
});