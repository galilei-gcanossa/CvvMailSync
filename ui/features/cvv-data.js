const IMPORTED_BOARD_ITEMS_KEY="imported_board_items";

function feat_boards_getKnownIds(){
  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  return !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];
}

function feat_boards_setKnownIds(items){
  PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(items||[]));
}

function feat_dataStatus_getCacheKey(account){
  return `cvv_board_and_messages_status:${account.username}`;
}

function feat_dataStatus_clear(account){
  const cacheKey = feat_dataStatus_getCacheKey(account);
  CacheService.getUserCache().remove(cacheKey);
}

function feat_dataStatus_reset(account){
  const cacheKey = feat_dataStatus_getCacheKey(account);
  let result = {
    boards: [],
    messages: []
  };
  CacheService.getUserCache()
    .put(cacheKey, JSON.stringify(result), 5);
}

function feat_dataStatus_get(account){
  const cacheKey = feat_dataStatus_getCacheKey(account);
  let resultJSON = CacheService.getUserCache().get(cacheKey);
  let status = null;
  if(!!resultJSON){
    status = JSON.parse(resultJSON);
  }
  else{
    status = {
      boards: CvvService.board_get(account, true, false).reverse(),
      messages: CvvService.messages_get(account, true, 1, 50, false)
    };  
  
    CacheService.getUserCache()
      .put(cacheKey, JSON.stringify(status), 20);
  }
  
  status.knownBoardIds = feat_boards_getKnownIds();
  status.newBoards = status.boards
    .filter(p => !status.knownBoardIds.includes(p.id) && !status.messages.find(t => t.boardId == p.id));

  status.newMessages = status.messages
    .filter(p => !p.boardId || !status.knownBoardIds.includes(p.boardId));
    
  status.shouldUpdate = status.newBoards.length > 0 || status.newMessages.length > 0;

  return status;
}