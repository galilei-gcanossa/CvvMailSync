const TRIGGER_SET_KEY="trigger_set";
const IMPORTED_BOARD_ITEMS_KEY="imported_board_items";

function resetAccountChanges(e){
  return onHomepage();
}

function saveAccountChanges(e){
  try{
    if(!e.formInput.password){
      CvvService.Accounts.setActive(e.formInput.activeAccount, APP_NAME);
    }
    else{
      CvvService.Accounts.createOrUpdate(e.formInput.username, e.formInput.password);
      if(!CvvService.Accounts.verify(e.formInput.username)){
        throw new Error("Invalid credentials.");
      }
    }

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Saved`))
      .build();
  }
  catch(ex){

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`ERROR: ${ex.message}`))
      .build();
  }
}

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

function syncBoard_(client, isTimeout, unreadOnly=false){
  const items = client.getBoard(unreadOnly).reverse();

  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  const importedBoardItemIds = !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];

  const newimportedBoardItemIds = [];

  const complete = () => {
    PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(importedBoardItemIds));

    client.markBoardItemsAsRead(newimportedBoardItemIds);
  }

  items.filter(p => !importedBoardItemIds.find(t => t == p.id)).map(item => {
    if(isTimeout()){
      complete();
      throw new Error("Timeout exceeded.")
    }
    else{
      sendItem(client, item);
      importedBoardItemIds.push(item.id);
      newimportedBoardItemIds.push(item.id);
    }
  });

  complete();
}

function syncBoard(){
  const client = CvvService.Accounts.getCurrentActive(APP_NAME).getClient();
  try {
    const startTime = new Date();
    syncBoard_(client, () => new Date() - startTime > SYNC_TIMEOUT);

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

function syncMessages_(client, isTimeout){
  const messages = client.getMessages(true, 1, 50);

  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  const importedBoardItemIds = !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];

  const complete = () => {
    PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(importedBoardItemIds));

    client.markMessagesAsRead(messages.map(p => p.id));
  }

  messages.filter(p => !p.boardItem || !importedBoardItemIds.find(t => t == p.boardItem.id)).map(item => {
    if(isTimeout()){
      complete();
      throw new Error("Timeout exceeded.")
    }
    else{
      sendItem(client, item);

      if(!!item.boardItem){
        importedBoardItemIds.push(item.boardItem.id);
      }
    }
  });

  complete();
}

function syncMessages(){
  const client = CvvService.Accounts.getCurrentActive(APP_NAME).getClient();
  
  try {
    const startTime = new Date();
    syncMessages_(client, () => new Date() - startTime > SYNC_TIMEOUT);

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