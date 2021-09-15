function createAccountSection(){

  const activeAccount = CvvService.Accounts.getCurrentActive(APP_NAME);
  const accounts = CvvService.Accounts.list();

  const section = CardService.newCardSection();

  let sectionTitle = "ClasseViva Account";
  if(accounts.length == 0){
    sectionTitle = `${sectionTitle} - Create an account.`
  }
  else if(!CvvService.Accounts.verify(activeAccount.username)){
    sectionTitle = `${sectionTitle} - Update current account credentials.`;
  }

  section.setHeader(sectionTitle)
    .setCollapsible(false);

  const wAccounts = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName("activeAccount")
    .setTitle("Active account");

  accounts.map(p => wAccounts.addItem(p.username, p.username, p.username == activeAccount));

  section.addWidget(wAccounts);

  const wUsername = CardService.newTextInput()
    .setFieldName("username")
    .setHint("ClasseViva username")
    .setTitle("Username")
    .setValue(activeAccount.username || "");

  section.addWidget(wUsername);

  const wPassword = CardService.newTextInput()
    .setFieldName("password")
    .setHint("ClasseViva password")
    .setTitle("Password");

  section.addWidget(wPassword);

  const wCvvButtons = CardService.newButtonSet()
    .addButton(CardService.newTextButton()
      .setText("Cancel")
      .setAltText("Reset changes")
      .setBackgroundColor("#cccccc")
      .setOnClickAction(CardService.newAction().setFunctionName("resetAccountChanges")))
    .addButton(CardService.newTextButton()
      .setText("Save")
      .setAltText("Save changes")
      .setOnClickAction(CardService.newAction().setFunctionName("saveAccountChanges")));

  section.addWidget(wCvvButtons);

  return section;
}

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