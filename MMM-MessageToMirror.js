Module.register("MMM-MessageToMirror", {
  messages: [],

  getScripts: function () {
    return [
      // this.file('node_modules/firebase-admin/lib/firestore/firestore.js'),
      this.file("node_modules/firebase/firebase-app.js"),
      this.file("node_modules/firebase/firebase-auth.js"),
      this.file("node_modules/firebase/firebase-firestore.js"),
      this.file("firebase-config.js")
    ];
  },

  // Default module config
  defaults: {
    name: "Magic Mirror",
    database: "",
    functions: "",
    users: [],
    newMessageSound: "newmessage.wav",
    showSender: true,
    showTime: true,
    urlTimeoutSeconds: 3600,
    testScroller: false,
    scrollSpeed: 5,
    scrollUpCm: 15,
    scrollDownCm: 30,
    reverseScrolling: false
  },

  start: function () {
    console.log(this.name + " started. Id: ", this.identifier);
    var self = this;
    this.openMessageToMirrorConnection();
    setInterval(function () {
      self.updateDom();
    }, 5000);
  },

  openUrl: function (url) {
    this.sendSocketNotification("MESSAGETOMIRROR_URL", url);
  },

  startReceiving: function (screenKey) {
    var self = this;
    this.messages = [];

    isUrl = function (url) {
      return url.startsWith("https:");
    };

    this.openFirestoreConnection();

    var db = firebase.firestore();

    console.log(this.name + ": Getting data");
    path = "screens/" + screenKey + "/messages";
    db.collection(path)
      .orderBy("sentTime", "desc")
      .onSnapshot((querySnapshot) => {
        self.messages = [];
        querySnapshot.forEach((doc) => {
          sentTime = doc.data().sentTime.toDate();
          validMinutes = Number(doc.data().validMinutes);
          validTime =
            sentTime.getTime() + validMinutes * 60 * 1000 - Date.now();
          validTime = validTime > 0 ? validTime : 0;
          if (validTime > 1000) {
            url = doc.data().message;
            console.log("URL: ", url);
            if (isUrl(url)) {
              // this.sendNotification('SWD_URL', { url: [url] })
              // this.sendNotification('PAGE_CHANGED', 1)
              this.openUrl(url);
            } else {
              self.messages.push({
                message: doc.data().message,
                sentTime: sentTime,
                sentBy: doc.data().sentBy,
                validMinutes: validMinutes
              });
              setTimeout(self.removeOldMessages, validTime, self);
            }
          }
          if (!doc.data().receipt) {
            console.log("Sending receipt for message");
            self.sendReceipt(doc.ref);
          }
        });
        self.messages.length > 0
          ? self.playSound(self.config.newMessageSound)
          : null;
        self.updateDom(1000);
      });
  },

  playSound: function (soundfile) {
    const sound = document.createElement("audio");
    sound.src = this.file(soundfile);
    sound.setAttribute("autoplay", true);
    sound.loop = false;
    sound.volume = 1.0;
    sound.play();
  },

  removeOldMessages: function (self) {
    self.messages.forEach((msg, i, arr) => {
      if (
        msg.sentTime.getTime() + msg.validMinutes * 60 * 1000 <=
        Date.now() + 1000
      ) {
        arr.splice(i, 1);
      }
    });
    self.updateDom();
  },

  openMessageToMirrorConnection: function () {
    this.sendSocketNotification("MESSAGETOMIRROR_CONFIG", this.config);
  },

  sendReceipt: function (ref) {
    this.sendSocketNotification("MESSAGETOMIRROR_SEND_RECEIPT", ref.path);
  },

  openFirestoreConnection: function () {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  },

  socketNotificationReceived: function (notification, payload) {
    console.log(this.name + ": Received socketnotification: " + notification);
    if (notification == "SCREENKEY") {
      if (payload.name == this.config.name) {
        this.startReceiving(payload.screenKey);
      }
    }
  },

  calculateAge: function (time) {
    const sec = Math.round((Date.now() - time.getTime()) / 1000);
    if (sec < 45) return "now";
    const min = Math.round(sec / 60);
    if (min < 60) return min + " min";
    const h = Math.round(min / 60);
    if (h < 24) return h + " hours";
    const d = Math.round(h / 24);
    return d + " days";
  },

  getStyles: function () {
    return ["MessageToMirror.css"];
  },

  getDom: function () {
    var wrapper = document.createElement("table");
    wrapper.className = "medium";
    var first = true;

    self = this;

    if (self.messages.length === 0) {
      wrapper.innerHTML = self.loaded ? self.translate("EMPTY") : "";
      wrapper.className = "small dimmed";
      return wrapper;
    }

    self.messages.forEach(function (msg) {
      var msgWrapper = document.createElement("tr");

      // From
      if (msg.sentBy && self.config.showSender) {
        var byWrapper = document.createElement("td");
        byWrapper.innerHTML = msg.sentBy;
        byWrapper.className = "align-left small bright message-from";
        msgWrapper.appendChild(byWrapper);
      }

      // Time
      if (msg.sentTime && self.config.showTime) {
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
