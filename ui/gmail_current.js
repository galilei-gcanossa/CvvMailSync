/**
 * Callback for rendering the card for a specific Gmail message.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
 function ui_gmail_currentMessage(e) {

  const messageId = e.gmail.messageId;
  
  var accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var message = GmailApp.getMessageById(messageId);
  var subject = message.getThread().getFirstMessageSubject();

  if(/^Cvv \[.+\]/.test(subject) == false){
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("CvvMailSync detail"))
      .addSection(CardService.newCardSection()
        .setHeader("Detail")
        .addWidget(CardService.newDecoratedText().setText("Not a CvvMailSync message")))
        .build();
  }

  const idRegEx = /\[ID:([^\]]+)\]/;

  if(idRegEx.test(subject) == false){
    return CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader().setTitle("CvvMailSync detail"))
      .addSection(CardService.newCardSection()
        .setHeader("Detail")
        .addWidget(CardService.newDecoratedText().setText("Not an interactive message")))
        .build();
  }

  const itemId = idRegEx.exec(subject)[1]

  const card = CardService.newCardBuilder()
    .setName("Item")
    .setHeader(CardService.newCardHeader().setTitle(`Item: ${itemId}`));

  let item;
  if(!!itemId){
    const account = CvvService.account_getActive(APP_NAME);

    try {
      item = CvvService.board_getItem(account, itemId);
    }
    catch(ex){}
  }

  const section = CardService.newCardSection()
    .setHeader("Required actions");

  if(!!item?.expectConfirmAnswer){
    section.addWidget(CardService.newTextButton()
      .setText("Confirm")
      .setOnClickAction(CardService.newAction()
        .setParameters({
          messageId: messageId,
          accessToken: accessToken,
          itemId: itemId,
          answerId:item.expectConfirmAnswer.answerId
        })
        .setFunctionName("ui_gmail_currentMessage_confirmAnswer")));
  }
  else if(!!item?.expectTextAnswer){
    section.addWidget(CardService.newTextInput()
      .setFieldName("answer")
      .setTitle("Answer message")
      .setValue(item.expectTextAnswer.value)
      .setHint(item.expectTextAnswer.text));

    section.addWidget(CardService.newTextButton()
      .setText(item.expectTextAnswer.value ? "Change answer" : "Answer")
      .setOnClickAction(CardService.newAction()
        .setParameters({
          messageId: messageId,
          accessToken: accessToken,
          itemId: itemId,
          answerId: item.expectTextAnswer.answerId,
          value: item.expectTextAnswer.value
        })
        .setFunctionName("ui_gmail_currentMessage_textAnswer")));
  }
  else if(!!item?.expectAttachmentAnswer){
    section.addWidget(CardService.newDecoratedText()
      .setText("A file upload is needed, please go to ClasseViva."));
  }
  else{
    section.addWidget(CardService.newDecoratedText()
      .setText("No action required."));
  }

  card.addSection(section);

  return card.build();
}

function ui_gmail_currentMessage_confirmAnswer(e){

  try{
    const account = CvvService.account_getActive(APP_NAME);
    CvvService.board_confirmItem(account, e.commonEventObject.parameters.answerId);

    const messageId = e.commonEventObject.parameters.messageId;
    const accessToken = e.commonEventObject.parameters.accessToken;

    GmailApp.setCurrentMessageAccessToken(accessToken);  
    const message = GmailApp.getMessageById(messageId);

    const label = getOrCreateGmailLabel_("cvv/answered");
    message.getThread().addLabel(label);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Confirmation sent"))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Error: ${ex.message}`))
      .build();
  }
}

function ui_gmail_currentMessage_textAnswer(e){

  try{
    if(!e.formInputs.answer)
      throw new Error("Empty answer not allowed");
    
    const account = CvvService.account_getActive(APP_NAME);
    CvvService.board_answerItemWithText(account, e.commonEventObject.parameters.answerId, e.formInputs.answer);

    const messageId = e.commonEventObject.parameters.messageId;
    const accessToken = e.commonEventObject.parameters.accessToken;

    GmailApp.setCurrentMessageAccessToken(accessToken);  
    const message = GmailApp.getMessageById(messageId);

    const label = getOrCreateGmailLabel_("cvv/answered");
    message.getThread().addLabel(label);

    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText("Answer sent"))
      .build();
  }
  catch(ex){
    return CardService.newActionResponseBuilder()
      .setNotification(CardService.newNotification().setText(`Error: ${ex.message}`))
      .build();
  }
}

function getOrCreateGmailLabel_(labelPath) {

  var labels = labelPath.split("/");
  var gmail, label = "";

  for (var i=0; i<labels.length; i++) {

    if (labels[i] !== "") {
      label = label + ((i===0) ? "" : "/") + labels[i];
      gmail = GmailApp.getUserLabelByName(label) ?
        GmailApp.getUserLabelByName(label) : GmailApp.createLabel(label);
    }
  }

  return gmail;

}