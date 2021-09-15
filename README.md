# CvvMailSync for Google Apps Script

This project allows to sync messages from the web school register [ClasseViva](https://web.spaggiari.eu/) and convert them in gmail recevied messages with attachments.


Script ID: `1fXqM_G9knAvDXltAR4NsIZHk7XQF2VNOwntiIc21HnEPCjoPRkVzHbwu`

# Usage

Once added to the google workspace, you will be presented with a two section card interface:
1. An account section, where you can add or update your ClasseViva credentials and select among saved accounts.
2. A set of three actions:
    1. Sync board: will try to fetch all the items of the "Bacheca" section of ClasseViva
    2. Sync messages: will try to fetch all the unread messages from ClasseViva
    3. Set up/Tear down time trigger: will configure an hourly based trigger that tries to sync both the unread board items and the unread message items.

When opening a message which requires you to send an answer, the card interface will display you an input interface in accordance with the type of requested answer.

# Cloning intstructions

In order to be able to use this add-on code, without installing the add-on from the marketplace follow this steps:
1. Create a new AppScript project in your account
2. Create a .gs file for each .js file of this repository
3. In the project settings select the "Show the manifest appsscript.json in the file section"
4. Copy the *.js files content in the *.gs files
5. Copy the content of the appsscript.json of thi repository in the appsscript.json of the project
6. Click on **Deploy > Test Deploy**
7. Click on **Install**

Refreshing/Opening your gmail tab you should see in the add-on menu (right side) the icon of ClasseViva. Clicking it you will access the main card of the add-on.