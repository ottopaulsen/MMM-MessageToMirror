# Message to mirror

![Screenshot](doc/screenshot.png)

Module for [MagicMirror](https://github.com/MichMich/MagicMirror/) showing messages sent from web page.

## Installasjon

Go to `MagicMirror/modules` and write

    git clone git@github.com:ottopaulsen/MMM-MessageToMirror.git
    cd MMM-MessageToMirror
    npm install



## Configuration

This is the default configuration with description. Put it in the `MagicMirror/config/config.js`:



## Design

The user can send messages from a web app, identified with Google account.

The magic mirror is configured with google account for legal users.

Use a Firebase database to store data. Common for all users. Data shall show when the mirror gets up after shutdown. Messages will have a timeout that can be selected.

Must be logged in to Google account.

Create a web page to add messages. 

The database keeps track of which users can add messages to the mirror.

If the user can add messages to multiple mirrors, select one mirror. Last used is default.

Enter message in text field. Click "Send". Show status when the message is displayed on the mirror.

## User stories

* Display a message from Firebase on the screen. Just that.
* Set the message from a mobile phone web app.
* Save multiple messages from the app and show multiple messages on the screen.
* Show time message was sent
* Show only messages less than 12 hours old
* Show who sent the message


