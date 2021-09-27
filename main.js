function test() {

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
}

const APP_NAME = "CvvMailSync";
const SYNC_TIMEOUT = 30*1000;
const activeHours = [7,8,9,10,11,12,13,14,16,18,22];

/**
 * Callback for rendering the homepage card.
 * @return {CardService.Card} The card to show to the user.
 */
function onHomepage(e) {
  
  const builder = CardService.newCardBuilder();

  builder.addSection(CvvService.addons_createAccountSection(APP_NAME, "CvvService", "onHomepage"));
  builder.addSection(createActionSection());

  return builder.build();
}

function onTimeTrigger(){
  const now = new Date();
  if(!!activeHours.find(p=>p==now.getHours())){
    console.log(`Skipping for hour: ${now.toLocaleTimeString()}`)
    return;
  }

  const account = CvvService.account_getActive(APP_NAME);
  if (!CvvService.account_signedIn(account) && !CvvService.account_signIn(account)){
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
    console.log(`Skipping for invalid credentials of ${account.username}.`)
    return;
  }
  
  try {
    const startTime = new Date();
    const timeoutCheck = () => new Date() - startTime > SYNC_TIMEOUT;
    syncMessages_(account, timeoutCheck);
    syncBoard_(account, timeoutCheck, true);
  }
  catch(ex){
    MailApp.sendEmail(Session.getActiveUser().getEmail(), 
      `CvvMailSync ERROR`, 
      `Error while syncing: ${ex.message}`, 
      {
        noReply: true
      }
    );
    throw ex;
  }
}

function formatCreatedAt_(createdAt){
  return new Date(createdAt).toLocaleString("it");
}

function formatMailSubject_(item){
  if(item.sender !== undefined && item.subject !== undefined){
    if(!!item.boardItem){
      return `Cvv [BOARD][MESSAGE][${formatCreatedAt_(item.createdAt)}][ID:${item.boardItem.id}][${item.sender}] ${item.subject.slice(0,50)}`;
    }
    else if(!!item.contentItem){
      return `Cvv [CONTENT][MESSAGE][${formatCreatedAt_(item.createdAt)}][${item.sender}] ${item.subject.slice(0,50)}`;
    }
    else {
      return `Cvv [MESSAGE][${formatCreatedAt_(item.createdAt)}][${item.sender}] ${item.subject.slice(0,50)}`;
    }
  }
  else{
    return `Cvv [BOARD][${formatCreatedAt_(item.createdAt)}][ID:${item.id}] ${item.title.slice(0,50)}`
  }
}

function getMailBody_(item){
  if(item.sender !== undefined && item.subject !== undefined){
    if(!!item.boardItem){
      return {
        text:`${item.subject} \n ${item.body||""} \n ${item.boardItem.title||""}`,
        html:`<h2>${item.subject}</h2> <br> ${item.body||""} <br> ${item.boardItem.title||""}`
      }
    }
    else if(!!item.contentItem){
      return {
        text:`${item.subject} \n ${item.body||""} \n ${item.contentItem.title||""} \n 
          ${item.contentItem.attachments.filter(p => !!p.link).map(p=>p.link)}`,
        html:`<h2>${item.subject}</h2> <br> ${item.body||""} <br> ${item.contentItem.title||""} <br> 
          ${item.contentItem.attachments.filter(p => !!p.link).map(p => `<a href="${p.link}">${p.link}</a>`)}`
      }
    }
    else{      
      return {
        text:`${item.subject} \n ${item.body||""}`,
        html:`<h2>${item.subject}</h2> <br> ${item.body||""}`
      }
    }
  }
  else{    
      return {
        text:`${item.title} \n ${item.text||""}`,
        html:`<h2>${item.title}</h2> <br> ${item.text||""}`
      }
  }
}

function getAttachments_(item){
  if(item.sender !== undefined && item.subject !== undefined){
    if(!!item.boardItem){
      return item.boardItem.attachments;
    }
    else if(!!item.contentItem){
      return item.contentItem.attachments.filter(p => !!p.url);
    }
    else{
      return undefined;
    }
  }
  else{
    return item.attachments;
  }
}

function sendItem(account, item){
  const body = getMailBody_(item);
  const attachments = getAttachments_(item);

  MailApp.sendEmail(Session.getActiveUser().getEmail(), 
    formatMailSubject_(item), 
    body.text, 
    {
      noReply: true,
      htmlBody: body.html,
      attachments: attachments?.map(p => CvvService.utils_downloadResource(account, p))
    }
  );
}