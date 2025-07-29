var linkName = "";


addEventListener('contextmenu', ({target: {textContent}}) => {
    log('Setting linkName:', textContent);
    linkName = textContent;
});

chrome.runtime.onMessage.addListener(({type}, _sender, sendResponse) => {
    if(type === "GetTargetLinkName"){
        log('Responding for link name', linkName);
        sendResponse({linkName});
        linkName = "";
    }
});

//cannot use modules... so needet to duplicate method from 'src/shared/models/helpers.mjs'
function log(...args){
    const date = new Date().toISOString();
    const change = {};
    change[date] = args.join(' ');
    chrome.storage.local.set(change, function() {
        console.log(date, ...args);
    });
}