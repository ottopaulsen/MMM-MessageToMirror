
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

        // console.log(this.name + ': getDom')
        console.log(this.name + ': Getting data');
        path = "screens/" + this.config.screenKey + "/messages";
        db.collection(path).onSnapshot((querySnapshot) => {
            self.messages = [];
            querySnapshot.forEach((doc) => {
                console.log('Innhold: ' + doc.data().message);
                self.messages.push({
                    message: doc.data().message,
                    sentTime: new Date(doc.data().sentTime),
                    sentBy: doc.data().sentBy
                })
            });
            self.updateDom(1000);
        });
    },
    
	openMessageToMirrorConnection: function() { 
        this.sendSocketNotification('MESSAGETOMIRROR_CONFIG', this.config);
	},
    
    openFirestoreConnection: function() {
        // var config = firebase-config.firebaseConfig;
        firebase.initializeApp(firebaseConfig);

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
    
        if (this.messages.length === 0) {
            wrapper.innerHTML = (self.loaded) ? this.translate("EMPTY") : this.translate("LOADING");
            wrapper.className = "small dimmed";
            console.log(this.name + ': No values');
            return wrapper;
        }        

        this.messages.forEach(function(msg){
            console.log(this.name + ": Calling foreach with msg: " + msg)
            var msgWrapper = document.createElement("tr");
    
            // From & Time
            if (msg.sentTime && msg.sentBy){
                var fromWrapper = document.createElement("td");
                fromWrapper.innerHTML = msg.sentBy + " (" + msg.sentTime.getHours() + ":" + msg.sentTime.getMinutes() + "):";
                fromWrapper.className = "align-left small message-from";
                msgWrapper.appendChild(fromWrapper);
            }
    

            // Message
            var messageWrapper = document.createElement("td");
            messageWrapper.innerHTML = msg.message;
            messageWrapper.className = "align-left bright message-message";
            // tdWrapper.appendChild(messageWrapper);

            msgWrapper.appendChild(messageWrapper);
            wrapper.appendChild(msgWrapper);
        });

        return wrapper;
    }
});