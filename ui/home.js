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

  const section = CardService.newCardSection();

  let sectionTitle = "Actions";

  section.setHeader(sectionTitle)
    .setCollapsible(false);

  section.addWidget(CardService.newTextButton()
    .setText("Synchronize All Unread")
    .setAltText("Synchronize All Unread")
    .setOnClickAction(CardService.newAction().setFunctionName("syncAllUnread")));


  if(!PropertiesService.getUserProperties().getProperty(TRIGGER_SET_KEY)){
    section.addWidget(CardService.newTextButton()
      .setText("Setup time trigger")
      .setAltText("Setup time trigger")
      .setOnClickAction(CardService.newAction().setFunctionName("ui_home_commonActions_setUpTimeTrigger")));
  }
  else {
    section.addWidget(CardService.newTextButton()
      .setText("Teardown time trigger")
      .setAltText("Teardown time trigger")
      .setOnClickAction(CardService.newAction().setFunctionName("ui_home_commonActions_tearDownTimeTrigger")));
  }

  return section;
}

const TRIGGER_SET_KEY="trigger_set";
const IMPORTED_BOARD_ITEMS_KEY="imported_board_items";

function ui_home_commonActions_setUpTimeTrigger(){
  if(!PropertiesService.getUserProperties().getProperty(TRIGGER_SET_KEY)){
    ScriptApp.newTrigger("onTimeTrigger")
      .timeBased()
      .everyHours(1)
      .create();

    PropertiesService.getUserProperties().setProperty(TRIGGER_SET_KEY, "true");
  }

  return ui_home();
}

function ui_home_commonActions_tearDownTimeTrigger(){
  ScriptApp.getProjectTriggers().filter(p => p.getHandlerFunction() == "onTimeTrigger").map(t => ScriptApp.deleteTrigger(t));

  PropertiesService.getUserProperties().deleteProperty(TRIGGER_SET_KEY);

  return ui_home();
}