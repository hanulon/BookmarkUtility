import { Database, Stores } from "/src/shared/models/database.mjs";

document.querySelector('bookmarks-selector[for="context"]').addEventListener('selectedBookmarksSaved', () => {
    chrome.runtime.sendMessage({type: "UpdateContextMenu"});
});
document.querySelector('bookmarks-selector[for="updater"]').addEventListener('selectedBookmarksSaved', () => {
    chrome.runtime.sendMessage({type: "UpdateContextMenu"});
});

document.querySelector('.export-btn').addEventListener('click', async () => {
    const settingsData = await new Database().getAllSettings();
    const exportData = JSON.stringify(settingsData);

    const downloaderEl = document.querySelector('#export');
    downloaderEl.setAttribute('href', `data:text/plain;charset=utf-8,${exportData}`);
    downloaderEl.setAttribute('download',`bookmark_utility_exported_settings_${new Date().toISOString().replace('.','_')}.json` );
    downloaderEl.click();
});

document.querySelector('#import').addEventListener('change', ({target: {files}}) => {
    if(!files[0]) return;
    const reader = new FileReader();
    reader.onload = async ({target: {result}}) => {
        try{
            await new Database().saveAllSettings(JSON.parse(result));
            document.querySelectorAll('bookmarks-selector').forEach(bs => bs.render());
            document.querySelector('notification-div').showSuccess("Settings imported successfully");
        }catch(e){
            document.querySelector('notification-div').showError("Failed to import settings");
        }
    };
    reader.readAsText(files[0]);
});

document.querySelector('.import-btn').addEventListener('click', () => {
    document.querySelector('#import').click();
});