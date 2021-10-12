function messages_formatCreatedAt_(createdAt){
  return new Date(createdAt).toLocaleString("it");
}

function messages_formatMailSubject_(item){
  const attributes = [];
  let subject = "";

  if(item.sender !== undefined && item.subject !== undefined){
    subject = item.subject;

    if(!!item.boardItem){
      attributes.push("BOARD", "MESSAGE", messages_formatCreatedAt_(item.createdAt), `ID:${item.boardItem.id}`, item.sender);
      if(!!item.boardItem.expectConfirmAnswer || !!item.boardItem.expectTextAnswer || !!item.boardItem.expectAttachmentAnswer)
        attributes.push("AREQ");
    }
    else if(!!item.contentItem){
      attributes.push("CONTENT", "MESSAGE", messages_formatCreatedAt_(item.createdAt), item.sender);
    }
    else {
      attributes.push("MESSAGE", messages_formatCreatedAt_(item.createdAt), item.sender);
    }
  }
  else{
    attributes.push("BOARD", messages_formatCreatedAt_(item.createdAt), `ID:${item.id}`);
    if(!!item.expectConfirmAnswer || !!item.expectTextAnswer || !!item.expectAttachmentAnswer)
      attributes.push("AREQ");

    subject = item.title;
  }

  return `Cvv ${attributes.map(p=>`[${p}]`).join("")} ${subject.slice(0,50)}`;
}

function messages_buildMailBody_(item){
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

function messages_getAttachments_(item){
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

function messages_sendMessageForItem(account, item){
  const body = messages_buildMailBody_(item);
  const attachments = messages_getAttachments_(item);

  MailApp.sendEmail(Session.getActiveUser().getEmail(), 
    messages_formatMailSubject_(item), 
    body.text, 
    {
      noReply: true,
      htmlBody: body.html,
      attachments: attachments?.map(p => CvvService.utils_downloadResource(account, p))
    }
  );
}