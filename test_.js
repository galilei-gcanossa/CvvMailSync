/*function test() {

  // WARNING: PropertiesService.getUserProperties().deleteProperty(IMPORTED_BOARD_ITEMS_KEY);
  const account = CvvService.account_getActive(APP_NAME);
  //const boardIds = CvvService.board_get(account, false);
  const items = PropertiesService.getUserProperties().getProperty(IMPORTED_BOARD_ITEMS_KEY);
  //PropertiesService.getUserProperties().setProperty(IMPORTED_BOARD_ITEMS_KEY, JSON.stringify(boardIds.map(p => p.id)))

  console.log(items);

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