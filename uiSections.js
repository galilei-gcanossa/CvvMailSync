function createActionSection(){

  const section = CardService.newCardSection();

  let sectionTitle = "Actions";

  section.setHeader(sectionTitle)
    .setCollapsible(false);

  section.addWidget(CardService.newTextButton()
    .setText("Synchronize Board")
    .setAltText("Synchronize Board")
    .setOnClickAction(CardService.newAction().setFunctionName("syncBoard")));

  section.addWidget(CardService.newTextButton()
    .setText("Synchronize Messages")
    .setAltText("Synchronize Messages")
    .setOnClickAction(CardService.newAction().setFunctionName("syncMessages")));

  section.addWidget(CardService.newTextButton()
    .setText("Synchronize All Unread")
    .setAltText("Synchronize All Unread")
    .setOnClickAction(CardService.newAction().setFunctionName("syncAllUnread")));


  if(!PropertiesService.getUserProperties().getProperty(TRIGGER_SET_KEY)){
    section.addWidget(CardService.newTextButton()
      .setText("Setup time trigger")
      .setAltText("Setup time trigger")
      .setOnClickAction(CardService.newAction().setFunctionName("setUpTimeTrigger")));
  }
  else {
    section.addWidget(CardService.newTextButton()
      .setText("Teardown time trigger")
      .setAltText("Teardown time trigger")
      .setOnClickAction(CardService.newAction().setFunctionName("tearDownTimeTrigger")));
  }

  return section;
}