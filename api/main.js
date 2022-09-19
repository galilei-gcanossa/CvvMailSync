
const APP_NAME = "CvvMailSync";
const APP = this;
const SYNC_TIMEOUT = 30*1000;
const ACTIVE_HOURS = [7,8,9,10,11,12,13,14,16,18,22];


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


function syncAllUnreadWithMerge_(account, tsSource){

  const dataStatus = feat_dataStatus_get(account);

  for(let msg of dataStatus.newMessages){

    CvvService.messages_expand(account, msg);

    const found = dataStatus.newBoards
      .filter(p => p.type == 'docsdg' && p.title.startsWith(msg.subject));
    if(found.length == 1){
      msg.boardId = found[0].id;
      msg.boardItem = found[0];
    }
  }

  const mRes = handleMessagesSync_(account, tsSource, dataStatus.newMessages, dataStatus.knownBoardIds);
  if(!!mRes.error)
    throw new Error(mRes.error);

  const bRes = handleBoardSync_(account, tsSource, dataStatus.newBoards, dataStatus.knownBoardIds);
  if(!!bRes.error)
      throw new Error(bRes.error);

  return {
    boards: bRes,
    messages: mRes
  };
}

function handleMessagesSync_(account, tsSource, newMessages, knownBoardIds){
  const syncStatus = {
    total: newMessages.length,
    sent: 0,
    error: undefined
  };

  const readMessages = [];
  const readBoardItems = [];

  const complete = () => {
    if(readBoardItems.length>0){
      feat_boards_setKnownIds(knownBoardIds);
      CvvService.board_markItemsAsRead(account, readBoardItems);
    }

    if(readMessages.length>0){
      CvvService.messages_markAsRead(account, readMessages);
    }
  }

  for(let item of newMessages) {
    if(tsSource.elapsed()){
      complete();
      syncStatus.error = "Timeout exceeded.";
      return syncStatus;
    }
    else{
      messages_sendMessageForItem(account, item);

      readMessages.push(item);

      if(!!item.boardItem){
        knownBoardIds.push(item.boardItem.id);
        readBoardItems.push(item.boardItem);
      }

      syncStatus.sent++;
    }
  };

  complete();

  return syncStatus;
}

function handleBoardSync_(account, tsSource, boards, knownBoardIds){
  const readBoardItems = [];

  const syncStatus = {
    total: boards.length,
    sent: 0,
    error: undefined
  };

  const complete = () => {
    if(readBoardItems.length>0){
      feat_boards_setKnownIds(knownBoardIds);
      CvvService.board_markItemsAsRead(account, readBoardItems);
    }
  }

  for(let item of boards) {
    if(tsSource.elapsed()){
      complete();
      syncStatus.error = "Timeout exceeded.";
      return syncStatus;
    }
    else{
      item = CvvService.board_expandItem(account, item);
      messages_sendMessageForItem(account, item);
      knownBoardIds.push(item.id);
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
    feat_dataStatus_reset(account);

    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(ui_home()))
      .setNotification(
        CardService.newNotification()
        .setText(`All synced`))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNavigation(CardService.newNavigation().updateCard(ui_home()))
      .setNotification(CardService.newNotification().setText(`Error while syncing: ${ex.message}`))
      .build();
  }
}