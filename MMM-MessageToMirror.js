
Module.register("MMM-MessageToMirror",{

    messages: [],

    getScripts: function() {
        return [
            this.file('node_modules/firebase-admin/lib/firestore/firestore.js'),
            this.file('node_modules/firebase/firebase.js'),
            this.file('firebase-config.js')
            // 'firestore.js'
        ];
    },

    // Default module config
    defaults: {
        name: 'Magic Mirror',
        database: '',
        functions: '',
        screenKey: '',
        users: []
    },

	start: function() {
        console.log(this.name + ' started.');

        var self = this;
        this.messages = [];

        console.log(this.name + ': openFirestoreConnection');
        this.openFirestoreConnection();

        console.log(this.name + ': openMessageToMirrorConnection');
        this.openMessageToMirrorConnection();

        var db = firebase.firestore();

        console.log(this.name + ': Getting data');
        path = "screens/" + this.config.screenKey + "/messages";
        db.collection(path)
        .orderBy('sentTime', 'desc').onSnapshot((querySnapshot) => {
            self.messages = [];
            querySnapshot.forEach((doc) => {
                sentTime = new Date(doc.data().sentTime);
                validMinutes = Number(doc.data().validMinutes);
                validTime = sentTime.getTime() + validMinutes * 60 * 1000 - Date.now();
                validTime = validTime > 0 ? validTime : 0;
                if(validTime > 1000) {
                    self.messages.push({
                        message: doc.data().message,
                        sentTime: sentTime,
                        sentBy: doc.data().sentBy,
                        validMinutes: validMinutes
                    });
                    setTimeout(this.removeOldMessages, validTime, this);
                }
            });
            this.updateDom(1000);
        });
        setInterval(function(){
            self.updateDom(100);
        }, 5000);
    },

    removeOldMessages: function(self) {
        self.messages.forEach((msg, i, arr) => {
            if((msg.sentTime.getTime() + msg.validMinutes * 60 * 1000) <= (Date.now() + 1000)) {
                console.log('Removing old message: ', msg.message);
                arr.splice(i, 1);
            }
        })
        self.updateDom(1000);
    },
    
	openMessageToMirrorConnection: function() { 
        this.sendSocketNotification('MESSAGETOMIRROR_CONFIG', this.config);
	},
    
    openFirestoreConnection: function() {
        firebase.initializeApp(firebaseConfig);

    },

    calculateAge: function(time) {
        const sec = Math.round((Date.now() - time.getTime()) / 1000)
        if(sec < 45) return 'now'
        const min = Math.round(sec / 60)
        if(min < 60) return min + ' min'
        const h = Math.round(min / 60)
        if(h < 24) return h + ' hours'
        const d = Math.round(h / 24)
        return d + ' days'
    },


    getStyles: function() {
        return [
            'MessageToMirror.css'
        ];
    },

	getDom: function() {

		var wrapper = document.createElement("table");
        wrapper.className = "medium";
        var first = true;

        self = this;
    
        if (this.messages.length === 0) {
            wrapper.innerHTML = (self.loaded) ? this.translate("EMPTY") : this.translate("LOADING");
            wrapper.className = "small dimmed";
            console.log(this.name + ': No values');
            return wrapper;
        }        

        this.messages.forEach(function(msg){
            var msgWrapper = document.createElement("tr");
    
            // From
            if (msg.sentBy){
                var byWrapper = document.createElement("td");
                byWrapper.innerHTML = msg.sentBy;
                byWrapper.className = "align-left small bright message-from";
                msgWrapper.appendChild(byWrapper);
            }

            // Time
            if (msg.sentTime){
                var fromWrapper = document.createElement("td");
                fromWrapper.innerHTML = " (" + self.calculateAge(msg.sentTime) + "):";
                fromWrapper.className = "align-left small message-time";
                msgWrapper.appendChild(fromWrapper);
            }

            // Message
            var messageWrapper = document.createElement("td");
            messageWrapper.innerHTML = msg.message;
            messageWrapper.className = "align-left bright message-message";

            msgWrapper.appendChild(messageWrapper);
            wrapper.appendChild(msgWrapper);
        });

        return wrapper;
    }
});