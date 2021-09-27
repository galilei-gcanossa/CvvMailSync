const TRIGGER_SET_KEY="trigger_set";
const IMPORTED_BOARD_ITEMS_KEY="imported_board_items";

function setUpTimeTrigger_(){

  if(!PropertiesService.getUserProperties().getProperty(TRIGGER_SET_KEY)){
    ScriptApp.newTrigger("onTimeTrigger")
      .timeBased()
      .everyHours(1)
      .create();

    PropertiesService.getUserProperties().setProperty(TRIGGER_SET_KEY, "true");
  }
}

function setUpTimeTrigger(){
  setUpTimeTrigger_();
  return onHomepage();
}

function tearDownTimeTrigger(){
  ScriptApp.getProjectTriggers().filter(p => p.getHandlerFunction() == "onTimeTrigger").map(t => ScriptApp.deleteTrigger(t));

  PropertiesService.getUserProperties().deleteProperty(TRIGGER_SET_KEY);

  return onHomepage();
}

function syncBoard_(account, isTimeout, unreadOnly=false){
  const items = CvvService.board_get(account, unreadOnly, false).reverse();

  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  const importedBoardItemIds = !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];

  const readBoardItems = [];
  const processingItems = items.filter(p => !importedBoardItemIds.find(t => t == p.id));

  console.log(`Found ${processingItems.length} new board items.`);

  const complete = () => {
    PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(importedBoardItemIds));

    CvvService.board_markItemsAsRead(account, readBoardItems);
  }

  processingItems.map(item => {
    if(isTimeout()){
      complete();
      throw new Error("Timeout exceeded.")
    }
    else{
      item = CvvService.board_expandItem(account, item);
      sendItem(account, item);
      importedBoardItemIds.push(item.id);
      readBoardItems.push(item);
    }
  });

  complete();
}

function syncBoard(){
  const account = CvvService.account_getActive(APP_NAME);
  try {
    const startTime = new Date();
    syncBoard_(account, () => new Date() - startTime > SYNC_TIMEOUT);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Board synced`))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Error while syncing board: ${ex.message}`))
      .build();
  }
}

function syncMessages_(account, isTimeout){
  const messages = CvvService.messages_get(account, true, 1, 50);

  console.log(`Found ${messages.length} new messages.`);

  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  const importedBoardItemIds = !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];

  const processingMessages = messages.filter(p => !p.boardItem || !importedBoardItemIds.find(t => t == p.boardItem.id));
  const readMessages = [];

  const complete = () => {
    PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(importedBoardItemIds));

    CvvService.messages_markAsRead(account, readMessages);
  }

  processingMessages.map(item => {
    if(isTimeout()){
      complete();
      throw new Error("Timeout exceeded.")
    }
    else{
      sendItem(account, item);

      readMessages.push(item);

      if(!!item.boardItem){
        importedBoardItemIds.push(item.boardItem.id);
      }
    }
  });

  complete();
}

function syncMessages(){
  const account = CvvService.account_getActive(APP_NAME);
  
  try {
    const startTime = new Date();
    syncMessages_(account, () => new Date() - startTime > SYNC_TIMEOUT);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Messages synced`))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Error while syncing messages: ${ex.message}`))
      .build();
  }
}

function syncAllUnread(){
  const account = CvvService.account_getActive(APP_NAME);
  
  try {
    const startTime = new Date();
    const timeoutCheck = () => new Date() - startTime > SYNC_TIMEOUT;
    syncMessages_(account, timeoutCheck);
    syncBoard_(account, timeoutCheck, true);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`All synced`))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Error while syncing: ${ex.message}`))
      .build();
  }
}