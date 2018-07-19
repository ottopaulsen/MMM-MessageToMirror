var request = require('request');
var uuidv4 = require('uuid/v4');
var NodeHelper = require("node_helper");
const fs = require("fs");
const replace = require('replace-in-file');

const defaultScreenKey = 'MMM-MessageToMirror-WILL_BE_REPLACED_AT_FIRST_STARTUP';

module.exports = NodeHelper.create({

	start: function() {
		console.log('Starting node helper for: ' + this.name);
        this.loaded = false;
    },

    replaceInConfigFile: function(oldText, newText){
        // Replaces text in config file.
        var self = this;
        var configFilename = __dirname + "/../../config/config.js";
        const options = {
            files: configFilename,
            from: oldText,
            to: newText,
        };        

        replace(options)
        .then(changes => {
            console.log(self.name + ': Screen key saved to config file');
        })
        .catch(error => {
            console.error(self.name + ': Error saving screen key to config file: ', error);
        });
    },

    verifyScreenKey: function() {
        var screenKey = this.config.screenKey;

        if (!screenKey) {
            console.error(this.name + ': ERROR: screenKey missing in config file.');
            return '';
        }
        if (screenKey == defaultScreenKey) {
            console.log(this.name + ': Generating new screen key');
            screenKey = uuidv4();
            this.replaceInConfigFile(defaultScreenKey, screenKey);
        }
        
        return screenKey;
    },

    registerScreen: function() {
        var self = this;

        console.log('Registering screen');

        var screenKey = self.verifyScreenKey();
        if(screenKey){

            emails = {};
            self.config.users.forEach(email => {
                emails[email.replace(/\./g, '+','g')] = true;
            });

            var data = {
                name: self.config.name,
                secret: screenKey,
                emails: emails
            };

            request({
                headers: {
                'Content-Type': 'application/json; charset=utf-8'
                },
                uri: self.config.functions + '/screens',
                method: 'POST',
                body: JSON.stringify(data)
            }, function(err, res, body){
                if(err) {
                    console.log(self.name + ': Error registering screen: ', err);
                } else {
                    console.log(self.name + ': Screen registered');
                }
            });
        };


    },

	socketNotificationReceived: function(notification, payload) {
        var self = this;

		if (notification === 'MESSAGETOMIRROR_CONFIG') {
            self.config = payload;

            self.registerScreen();

            self.loaded = true;
            self.options = {};

            // messages[0] = "Loading messages..."

            // self.sendSocketNotification('MESSAGETOMIRROR_PAYLOAD', {
            //     messages: messages
            // });
		}
	},        
});