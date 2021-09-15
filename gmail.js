/**
 * Callback for rendering the card for a specific Gmail message.
 * @param {Object} e The event object.
 * @return {CardService.Card} The card to show to the user.
 */
function onGmailMessage(e) {

  const messageId = e.gmail.messageId;
  
  var accessToken = e.gmail.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var message = GmailApp.getMessageById(messageId);
  var subject = message.getThread().getFirstMessageSubject();

  const itemId = /\[ID:([^\]]+)\]/.exec(subject)[1]

  const card = CardService.newCardBuilder()
    .setName("Item")
    .setHeader(CardService.newCardHeader().setTitle(`Item: ${itemId}`));

  let item;
  if(!!itemId){
    const client = CvvService.Accounts.getCurrentActive(APP_NAME).getClient();

    item = client.getBoardItem(itemId);
  }

  const section = CardService.newCardSection()
    .setHeader("Required actions");

  if(!!item?.expectConfirmAnswer){
    section.addWidget(CardService.newTextButton()
      .setText("Confirm")
      .setOnClickAction(CardService.newAction()
        .setParameters({
          itemId: itemId,
          answerId:item.expectConfirmAnswer.answerId
        })
        .setFunctionName("confirmAnswer")));
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
          itemId: itemId,
          answerId: item.expectTextAnswer.answerId,
          value: item.expectTextAnswer.value
        })
        .setFunctionName("textAnswer")));
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

function confirmAnswer(e){

  try{    
    const client = CvvService.Accounts.getCurrentActive(APP_NAME).getClient();
    client.confirmBoardItem(e.commonEventObject.parameters.answerId);

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

function textAnswer(e){

  try{
    if(!e.formInputs.answer)
      throw new Error("Empty answer not allowed");
    
    const client = CvvService.Accounts.getCurrentActive(APP_NAME).getClient();
    client.answerBoardItemWithText(e.commonEventObject.parameters.answerId, e.formInputs.answer);

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
