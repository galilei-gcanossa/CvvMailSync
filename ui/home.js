/**
 * Callback for rendering the homepage card.
 * @return {CardService.Card} The card to show to the user.
 */
function ui_home(e) {
  
  const builder = CardService.newCardBuilder();

  builder.addSection(CvvService.addons_createAccountSection(APP_NAME, "CvvService", "ui_home"));
  builder.addSection(ui_home_createCommonActionSection());

  return builder.build();
}

function ui_home_createCommonActionSection(){

  const account = CvvService.account_getActive(APP_NAME);

  const section = CardService.newCardSection();

  let sectionTitle = "Actions";

  section.setHeader(sectionTitle)
    .setCollapsible(false);

  let result = null;
  try{
    result = feat_dataStatus_get(account);
  }
  catch(e){
    section.addWidget(CardService.newDecoratedText().setText(e));
  }

  section.addWidget(feat_timeTrigger_control('ui_home'));

  const syncButton = CardService.newTextButton()
    .setText("Sync")
    .setAltText("Synchronize Unread")
    .setTextButtonStyle(CardService.TextButtonStyle.TEXT)
    .setDisabled(!result?.shouldUpdate)
    .setOnClickAction(CardService.newAction().setFunctionName("syncAllUnread"));

  section.addWidget(CardService.newDecoratedText()
    .setText(`${result?.newMessages?.length||0} messages, ${result?.newBoards?.length||0} boards`)
    .setButton(syncButton)
    .setStartIcon(CardService.newIconImage()
      .setIcon(CardService.Icon.EMAIL))
  );

  return section;
}