const TRIGGER_SET_KEY="trigger_set";

function feat_timeTrigger_isEnabled() {
  return !!PropertiesService.getUserProperties().getProperty(TRIGGER_SET_KEY);
}

function feat_timeTrigger_actions_toggle(e) {
  if(feat_timeTrigger_isEnabled()){
    feat_timeTrigger_disable();
  }
  else {
    feat_timeTrigger_enable();
  }

  var nav = CardService.newNavigation().updateCard(APP[e.parameters.updateFn]());
  return CardService.newActionResponseBuilder()
    .setNavigation(nav)
    .build();
}

function feat_timeTrigger_enable(){
  ScriptApp.newTrigger("onTimeTrigger")
    .timeBased()
    .everyHours(1)
    .create();

  PropertiesService.getUserProperties().setProperty(TRIGGER_SET_KEY, "true");
}

function feat_timeTrigger_disable(){
  ScriptApp.getProjectTriggers()
    .filter(p => p.getHandlerFunction() == "onTimeTrigger")
    .map(t => ScriptApp.deleteTrigger(t));

  PropertiesService.getUserProperties().deleteProperty(TRIGGER_SET_KEY);
}

function feat_timeTrigger_control(updateFnName){
  let isTriggerEnabled = feat_timeTrigger_isEnabled();
  let timeTriggerSwitchAction = CardService.newAction()
    .setFunctionName('feat_timeTrigger_actions_toggle')
    .setParameters({
      updateFn: updateFnName
    });

  let timeTriggerSwitch = CardService.newSwitch()
    .setControlType(CardService.SwitchControlType.SWITCH)
    .setFieldName('toggleTimeTrigger')
    .setOnChangeAction(timeTriggerSwitchAction)
    .setSelected(isTriggerEnabled);

  let timeTriggerControl = CardService.newDecoratedText()
    .setText(!isTriggerEnabled ?
      'Setup time trigger' : 'Teardown time trigger')
    .setSwitchControl(timeTriggerSwitch);

  return timeTriggerControl;
}