let bookmarksByFolderId = new Map();

export function getFoldersFlatList(bookmarksArr, type){
    const loadedFolders = [];
    bookmarksByFolderId = new Map();
    for(let bookmark of bookmarksArr){
        loadedFolders.push(...getFlatTree(bookmark, '/', 0, type));
    }

    return {
        loadedFolders,
        bookmarksByFolderId
    };
}
function getFlatTree(bookmark, parentPath, parentId, allowedType){
    const currentPath = `${parentPath}/${bookmark.title}`;
    const result = [];
    if(!bookmark.url){
        result.push({id: bookmark.id, title: bookmark.title, path: currentPath});
    }
    if(allowedType === 'url' && !!bookmark.url){
        const siblingArray = bookmarksByFolderId.get(parentId) ?? [];
        if(!siblingArray.length){
            bookmarksByFolderId.set(parentId, siblingArray);
        }
        siblingArray.push({id: bookmark.id, title: bookmark.title, path: bookmark.title || bookmark.url});
    }
    for(let child of bookmark.children ?? []){
        result.push(...getFlatTree(child, currentPath, bookmark.id, allowedType));
    }

    return result;
}