# Message to mirror

NB! This is not finished!

This is the MMM-MessageToMirror module, which is a module for MagicMirror. See my [magic](https://github.com/ottopaulsen/magic) repository for more information.

![Screenshot](doc/screenshot.png)

Module for [MagicMirror](https://github.com/MichMich/MagicMirror/) showing messages sent from an app.

## Installation

Go to `MagicMirror/modules` and write

    git clone git@github.com:ottopaulsen/MMM-MessageToMirror.git
    cd MMM-MessageToMirror
    npm install


## Configuration

This is the default configuration with description. Put it in the `MagicMirror/config/config.js`:

``` json
                {
                	module: 'MMM-MessageToMirror',
                    position: 'middle_center',
                    disabled: false,
                	config: {
                        name: 'My Magic Mirror',
                        database: 'database-name',
                        functions: '<uri to functions>',
                        screenKey: 'MMM-MessageToMirror-WILL_BE_REPLACED_AT_FIRST_STARTUP', // MMM-MessageToMirror-WILL_BE_REPLACED_AT_FIRST_STARTUP
                        users: [
                            {email: 'user1-email', name: 'User1 Name'},
                            {email: 'user2-email', name: 'User2 Name'},
                            {email: 'user3-email', name: 'User3 Name'}
                        ],
                        newMessageSound: 'newmessage.wav'
                	}
                },
```

The `name` comes up in the app. You can use it to select between multiple mirrors.

The `database` is the name of the Firestore database you are using. 

The `functions` is the URI to the server code.

The `screenKey` must be set to `MMM-MessageToMirror-WILL_BE_REPLACED_AT_FIRST_STARTUP` before you start the first time. At startup, the screen is registered in the MagicMessage server, and given a unique key. The module will automatically update the config file with the key when it is created. On subsequent startups, the key will be reused, and the legal users will be updated on the server. Screens that are not used for some time may be deleted from the server.

The `users` array contains email and display name for all users that are allowed to send messages to the mirror. Currently only Google accounts are supported.

You may change the sound used for new messages by changing the newMessageSound file, provided you also add another sound file.

See [magic-message](https://github.com/ottopaulsen/magic-message) for more details on the server and app code.

## Licensed content

The default sound file for new messages, ´newmessage.wav´, is a copy of dingding.wav by ljudman, downloaded from [freesound.org](https://freesound.org/s/33244/)

