
const APP_NAME = "CvvMailSync";
const APP = this;
const SYNC_TIMEOUT = 30*1000;
const ACTIVE_HOURS = [7,8,9,10,11,12,13,14,16,18,22];

const IMPORTED_BOARD_ITEMS_KEY="imported_board_items";

function onInvalidCredentials_(account){
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 
    `CvvMailSync CHANGE INVALID CREDENTIALS`, 
    `The credentials for ${account.username} are no longer valid. Please update it or change account. \n
    Navigate to: https://script.google.com/a/macros/galileiostiglia.edu.it/s/AKfycbxCnmbye9VO7qYzEErvNTRl1hLOvJR0viK-Nvn9JroLpNHMpobFCJV4dx2zlj3rTcP4Dw/exec?app=${APP_NAME}`, 
    {
      noReply: true,
      htmlBody: `The credentials for ${account.username} are no longer valid. Please update it or change account. <br>
      <a href="https://script.google.com/a/macros/galileiostiglia.edu.it/s/AKfycbxCnmbye9VO7qYzEErvNTRl1hLOvJR0viK-Nvn9JroLpNHMpobFCJV4dx2zlj3rTcP4Dw/exec?app=${APP_NAME}" target="_blank">Change there</a>`,
    }
  );
}

function onTimeTriggerError_(ex){
  MailApp.sendEmail(Session.getActiveUser().getEmail(), 
    `CvvMailSync ERROR`, 
    `Error while syncing: ${ex.message}`, 
    {
      noReply: true
    }
  );
}

function onTimeTrigger(){
  const now = new Date();
  if(!!ACTIVE_HOURS.find(p=>p==now.getHours())){
    console.log(`Skipping for hour: ${now.toLocaleTimeString()}`)
    return;
  }

  const account = CvvService.account_getActive(APP_NAME);
  if (!CvvService.account_signedIn(account) && !CvvService.account_signIn(account)){
    onInvalidCredentials_(account);    
    console.log(`Skipping for invalid credentials of ${account.username}.`)
    return;
  }
  
  try {
    syncAllUnread();
  }
  catch(ex){
    onTimeTriggerError_(ex);
    throw ex;
  }
}

function getImportedBoardItems_(){
  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  return !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];
}

function setImportedBoardItems_(items){
  PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(items||[]));
}

function clearCvvBoardAndMessagesStatus(account){
  const cacheKey = `cvv_board_and_messages_status:${account.username}`;
  CacheService.getUserCache().remove(cacheKey);
}

function resetCvvBoardAndMessagesStatus(account){
  const cacheKey = `cvv_board_and_messages_status:${account.username}`;
  let result = {
    knownBoardItemIds: [],
    newBoardItems: [],
    cvvMsgItems: [],
    shouldUpdate: false
  };
  CacheService.getUserCache()
    .put(cacheKey, JSON.stringify(result), 20);
}

function loadCvvBoardAndMessagesStatus(account){
  const cacheKey = `cvv_board_and_messages_status:${account.username}`;
  let resultJSON = CacheService.getUserCache().get(cacheKey);
  if(!!resultJSON)
    return JSON.parse(resultJSON);
    
  const cvvBoardItems = CvvService.board_get(account, true, false).reverse();
  let knownBoardItemIds = getImportedBoardItems_();

  const cvvMsgItems = CvvService.messages_get(account, true, 1, 50, false); 
  // console.log(`Found ${cvvMsgItems.length} new messages.`);
  
  let newBoardItems = cvvBoardItems
    .filter(p => !knownBoardItemIds.find(t => t == p.id) && !cvvMsgItems.find(t => t.boardId == p.id));
  // console.log(`Found ${newBoardItems.length} new board items.`);

  let result = {
    knownBoardItemIds: knownBoardItemIds,
    newBoardItems: newBoardItems,
    cvvMsgItems: cvvMsgItems,
    cvvBoardItems: cvvBoardItems,
    shouldUpdate: newBoardItems.length > 0 || cvvMsgItems.length > 0
  };

  CacheService.getUserCache()
    .put(cacheKey, JSON.stringify(result), 20);

  return result;
}

function syncAllUnreadWithMerge_(account, tsSource){

  const result = loadCvvBoardAndMessagesStatus(account);
  let knownBoardItemIds = result.knownBoardItemIds;
  let newBoardItems = result.newBoardItems;
  const cvvMsgItems = result.cvvMsgItems;
  const cvvBoardItems = result.cvvBoardItems;

  const partialMsgItems = cvvMsgItems.filter(p => !p.boardId || !knownBoardItemIds.find(t => t == p.boardId));

  for(let msg of partialMsgItems){
    const fItems = newBoardItems.filter(p => p.type == 'docsdg' && p.title.startsWith(msg.subject));
    if(fItems.length == 1){
      msg.boardItem = fItems[0];
    }

    CvvService.messages_expand(account, msg);
  }

  const mRes = handleMessagesSync_(account, tsSource, partialMsgItems, knownBoardItemIds);
  if(!!mRes.error)
    throw new Error(mRes.error);

  knownBoardItemIds = getImportedBoardItems_();
  newBoardItems = cvvBoardItems.filter(p => !knownBoardItemIds.find(t => t == p.id));

  const bRes = handleBoardSync_(account, tsSource, newBoardItems, knownBoardItemIds);
  if(!!bRes.error)
      throw new Error(bRes.error);

  return {
    bStatus: bRes,
    mStatus: mRes
  };
}

function handleMessagesSync_(account, tsSource, messages, importedBoardItemIds){
  const syncStatus = {
    total: messages.length,
    sent: 0,
    error: undefined
  };

  const readMessages = [];
  const readBoardItems = [];

  const complete = () => {
    if(readBoardItems.length>0){
      setImportedBoardItems_(importedBoardItemIds);
      CvvService.board_markItemsAsRead(account, readBoardItems);
    }

    if(readMessages.length>0){
      CvvService.messages_markAsRead(account, readMessages);
    }
  }

  for(let item of messages) {
    if(tsSource.elapsed()){
      complete();
      syncStatus.error = "Timeout exceeded.";
      return syncStatus;
    }
    else{
      messages_sendMessageForItem(account, item);

      readMessages.push(item);

      if(!!item.boardItem){
        importedBoardItemIds.push(item.boardItem.id);
        readBoardItems.push(item.boardItem);
      }

      syncStatus.sent++;
    }
  };

  complete();

  return syncStatus;
}

function handleBoardSync_(account, tsSource, boardItems, importedBoardItemIds){
  const readBoardItems = [];

  const syncStatus = {
    total: boardItems.length,
    sent: 0,
    error: undefined
  };

  const complete = () => {
    if(readBoardItems.length>0){
      setImportedBoardItems_(importedBoardItemIds);
      CvvService.board_markItemsAsRead(account, readBoardItems);
    }
  }

  for(let item of boardItems) {
    if(tsSource.elapsed()){
      complete();
      syncStatus.error = "Timeout exceeded.";
      return syncStatus;
    }
    else{
      item = CvvService.board_expandItem(account, item);
      messages_sendMessageForItem(account, item);
      importedBoardItemIds.push(item.id);
      readBoardItems.push(item);
      syncStatus.sent++;
    }
  };

  complete();

  return syncStatus;
}

function syncAllUnread(){
  const account = CvvService.account_getActive(APP_NAME);
  
  try {
    const tsSource = CvvService.utils_createTimeoutSource(SYNC_TIMEOUT);

    const rStatus = syncAllUnreadWithMerge_(account, tsSource);
    resetCvvBoardAndMessagesStatus(account);

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
        .setText(`All synced: ${rStatus.mStatus.sent}/${rStatus.mStatus.total} messages, ${rStatus.bStatus.sent}/${rStatus.bStatus.total} boards.`))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Error while syncing: ${ex.message}`))
      .build();
  }
}