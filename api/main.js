
const APP_NAME = "CvvMailSync";
const SYNC_TIMEOUT = 30*1000;
const ACTIVE_HOURS = [7,8,9,10,11,12,13,14,16,18,22];

/*function test() {

  //PropertiesService.getUserProperties().deleteProperty(IMPORTED_BOARD_ITEMS_KEY);
  //syncBoard()
  //const account = CvvService.account_getActive("prova");

  //const items = CvvService.board_get(account).slice(0,1);

  //syncAllUnread()

  return

  items.map(item=> {
    MailApp.sendEmail(Session.getActiveUser().getEmail(),item.title, item.text, {
      noReply: true,
      attachments: item.attachments.map(p => {
        const a = client.downloadBoardAttachment(p);
        return a;
        
        //const file = DriveApp.createFile(a);
        //return file.getAs(MimeType.PDF);
      })
    });
  })
}*/

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

function syncBoard_(account, tsSource, unreadOnly=false){
  const items = CvvService.board_get(account, unreadOnly, false).reverse();

  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  const importedBoardItemIds = !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];

  const readBoardItems = [];
  const processingItems = items.filter(p => !importedBoardItemIds.find(t => t == p.id));

  console.log(`Found ${processingItems.length} new board items.`);

  const syncStatus = {
    total: processingItems.length,
    sent: 0,
    error: undefined
  };

  const complete = () => {
    PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(importedBoardItemIds));

    CvvService.board_markItemsAsRead(account, readBoardItems);
  }

  for(let item of processingItems) {
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

function syncMessages_(account, tsSource){
  const messages = CvvService.messages_get(account, true, 1, 50);

  const syncStatus = {
    total: messages.length,
    sent: 0,
    error: undefined
  };

  console.log(`Found ${messages.length} new messages.`);

  const importedBoardItemIdsJson = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  const importedBoardItemIds = !!importedBoardItemIdsJson ? JSON.parse(importedBoardItemIdsJson) : [];

  const processingMessages = messages.filter(p => !p.boardItem || !importedBoardItemIds.find(t => t == p.boardItem.id));
  const readMessages = [];

  const complete = () => {
    PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(importedBoardItemIds));

    CvvService.messages_markAsRead(account, readMessages);
  }

  for(let item of processingMessages) {
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
      }

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

    const msgStatus = syncMessages_(account, tsSource);
    if(!!msgStatus.error)
      throw new Error(msgStatus.error);

    const brdStatus = syncBoard_(account, tsSource, true);
    if(!!brdStatus.error)
      throw new Error(brdStatus.error);

    return CardService.newActionResponseBuilder()
      .setNotification(
        CardService.newNotification()
        .setText(`All synced: ${msgStatus.sent}/${msgStatus.total} messages, ${brdStatus.sent}/${brdStatus.total} boards.`))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Error while syncing: ${ex.message}`))
      .build();
  }
}