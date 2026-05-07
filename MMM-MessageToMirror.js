Module.register("MMM-MessageToMirror", {
  messages: [],

  getScripts: function () {
    return [
      this.file("node_modules/firebase/firebase-app-compat.js"),
      this.file("node_modules/firebase/firebase-firestore-compat.js"),
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
    playMessageCommand: "aplay -D plughw:0,0",
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
    this.loaded = true;
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
    this.initialSnapshotLoaded = false;

    if (this.unsubscribeFirestore) {
      this.unsubscribeFirestore();
    }

    const isUrl = function (url) {
      return url.startsWith("https:");
    };

    this.openFirestoreConnection();

    var db = firebase.firestore();

    console.log(this.name + ": Getting data");
    const path = "screens/" + screenKey + "/messages";
    this.unsubscribeFirestore = db.collection(path)
      .orderBy("sentTime", "desc")
      .onSnapshot((querySnapshot) => {
        self.messages = [];
        querySnapshot.forEach((doc) => {
          const sentTime = doc.data().sentTime.toDate();
          const validMinutes = Number(doc.data().validMinutes);
          let validTime =
            sentTime.getTime() + validMinutes * 60 * 1000 - Date.now();
          validTime = validTime > 0 ? validTime : 0;
          if (validTime > 1000) {
            const url = doc.data().message;
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
        if (self.initialSnapshotLoaded) {
          const hasNewValidMessages = querySnapshot.docChanges().some((change) => {
            if (change.type !== "added") return false;
            const data = change.doc.data();
            const t = data.sentTime.toDate().getTime();
            const validTime = t + Number(data.validMinutes) * 60 * 1000 - Date.now();
            return validTime > 1000 && !isUrl(data.message);
          });
          if (hasNewValidMessages) self.playSound(self.config.newMessageSound);
        } else {
          self.initialSnapshotLoaded = true;
        }
        self.updateDom(1000);
      });
  },

  playSound: function (soundfile) {
    // This works on mac
    const sound = document.createElement("audio");
    sound.src = this.file(soundfile);
    sound.setAttribute("autoplay", true);
    sound.loop = false;
    sound.volume = 1.0;
    sound.play().catch((err) => {
      console.log(this.name + ": Could not play sound: " + err.message);
    });

    // Use node-helper to play sound. Works on RPi,
    this.sendSocketNotification("MESSAGETOMIRROR_BELL");
  },

  removeOldMessages: function (self) {
    self.messages = self.messages.filter(
      (msg) => msg.sentTime.getTime() + msg.validMinutes * 60 * 1000 > Date.now() + 1000
    );
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

    const self = this;

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
