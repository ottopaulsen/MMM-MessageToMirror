var request = require('request');
var uuidv4 = require('uuid/v4');
var NodeHelper = require("node_helper");
const fs = require("fs");

module.exports = NodeHelper.create({

	start: function() {
		console.log(this.name + ': Starting node_helper');
        this.loaded = false;
    },

    getScreenKey: function(config) {
        var path = this.path + '/keys';      
        var filename = path + '/' + config.name.replace(' ', '_') + '.key';

        if (!fs.existsSync(path)) {
            console.log(this.name + ': Creating directory for screen key files: ', path);
            fs.mkdirSync(path);
        }

        if (fs.existsSync(filename)) {
            screenKey = fs.readFileSync(filename, {encoding: 'utf8'});
            console.log(this.name + ': Found screen key: ' + screenKey);
        } else {
            console.log(this.name + ': Generating new screen key file: ', filename);
            screenKey = uuidv4();
            fs.writeFileSync(filename, screenKey);
        }
        
        return screenKey;
    },

    registerScreen: function(config) {
        var self = this;

        console.log(this.name + ': Registering screen ', config.name);

        var screenKey = self.getScreenKey(config);
        if(screenKey){

            users = {};
            config.users.forEach(user => {
                users[user.email.replace(/\./g, '+','g')] = user.name;
            });

            var data = {
                name: config.name,
                secret: screenKey,
                users: users
            };

            console.log('Registering screen on ', config.functions + '/screens' + '. Data = ', data);

            request({
                headers: {
                'Content-Type': 'application/json; charset=utf-8'
                },
                uri: config.functions + '/screens',
                method: 'POST',
                body: JSON.stringify(data)
            }, function(err, res, body){
                if(err) {
                    console.error(self.name + ': Error registering screen: ', err);
                } else {
                    console.log(self.name + ': Screen registered: ', config.name);
                }
            });

            this.sendScreenKey(config.name, screenKey);
        };


    },

    sendScreenKey: function(name, screenKey) {
        console.log(this.name + ': Sending screen key ' + screenKey + ' to ' + name);
        this.sendSocketNotification('SCREENKEY', {name: name, screenKey: screenKey});
    },

	socketNotificationReceived: function(notification, payload) {
        var self = this;

		if (notification === 'MESSAGETOMIRROR_CONFIG') {
            self.config = payload;
            config = payload;

            self.registerScreen(config);

            self.loaded = true;
            self.options = {};
		} else if (notification === 'MESSAGETOMIRROR_SEND_RECEIPT') {
            ref = payload;
            self.sendReceipt(ref);
        }
    },

    sendReceipt: function(path) {
        console.log('Sending receipt for ', path)
        self = this;
        request({
            headers: {
            'Content-Type': 'application/json; charset=utf-8'
            },
            uri: self.config.functions + '/receipts',
            method: 'POST',
            body: JSON.stringify({messagePath: path})
        }, function(err, res, body){
            if(err) {
                console.error(self.name + ': Error sending receipt: ', err);
            } else {
                console.log(self.name + ': Receipt sent');
            }
        });
    },    
});