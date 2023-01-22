const request = require("request");
const { v4: uuidv4 } = require("uuid");
const NodeHelper = require("node_helper");
const fs = require("fs");
const { BrowserWindow } = require("electron");
const isPi = require("detect-rpi");
const { exec } = require("child_process");

if (isPi()) {
  // Trouble with epoll not being up to date
  //const scroller = require("./scroller");
}

module.exports = NodeHelper.create({
  start: function () {
    console.log(this.name + ": Starting node_helper");
    this.loaded = false;
  },

  browserWindow: null,

  stop: function () {
    if (this.scroller) {
      this.scroller.close();
    }
  },

  getScreenKey: function (config) {
    var path = this.path + "/keys";
    var filename = path + "/" + config.name.replace(" ", "_") + ".key";

    if (!fs.existsSync(path)) {
      console.log(
        this.name + ": Creating directory for screen key files: ",
        path
      );
      fs.mkdirSync(path);
    }

    if (fs.existsSync(filename)) {
      screenKey = fs.readFileSync(filename, { encoding: "utf8" });
      console.log(this.name + ": Found screen key: " + screenKey);
    } else {
      console.log(this.name + ": Generating new screen key file: ", filename);
      screenKey = uuidv4();
      fs.writeFileSync(filename, screenKey);
    }

    return screenKey;
  },

  registerScreen: function (config) {
    var self = this;

    console.log(this.name + ": Registering screen ", config.name);

    var screenKey = self.getScreenKey(config);
    if (screenKey) {
      users = {};
      config.users.forEach((user) => {
        users[user.email.replace(/\./g, "+", "g")] = user.name;
      });

      var data = {
        name: config.name,
        secret: screenKey,
        users: users
      };

      console.log(
        "Registering screen on ",
        config.functions + "/screens" + ". Data = ",
        data
      );

      request(
        {
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          uri: config.functions + "/screens",
          method: "POST",
          body: JSON.stringify(data)
        },
        function (err, res, body) {
          if (err) {
            console.error(self.name + ": Error registering screen: ", err);
          } else {
            console.log(self.name + ": Screen registered: ", config.name);
          }
        }
      );

      this.sendScreenKey(config.name, screenKey);
    }
  },

  sendScreenKey: function (name, screenKey) {
    console.log(
      this.name + ": Sending screen key " + screenKey + " to " + name
    );
    this.sendSocketNotification("SCREENKEY", {
      name: name,
      screenKey: screenKey
    });
  },

  socketNotificationReceived: function (notification, payload) {
    var self = this;

    if (notification === "MESSAGETOMIRROR_CONFIG") {
      self.config = payload;
      self.registerScreen(payload);
      self.loaded = true;
      self.options = {};
    } else if (notification === "MESSAGETOMIRROR_SEND_RECEIPT") {
      ref = payload;
      self.sendReceipt(ref);
    } else if (notification === "MESSAGETOMIRROR_URL") {
      url = payload;
      self.openUrl(url);
    } else if (notification === "MESSAGETOMIRROR_BELL") {
      self.playBell();
    }
  },

  sendReceipt: function (path) {
    console.log("Sending receipt for ", path);
    self = this;
    request(
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8"
        },
        uri: self.config.functions + "/receipts",
        method: "POST",
        body: JSON.stringify({ messagePath: path })
      },
      function (err) {
        if (err) {
          console.error(self.name + ": Error sending receipt: ", err);
        } else {
          console.log(self.name + ": Receipt sent");
        }
      }
    );
  },

  playBell: function () {
    console.log("Playing bell");
    exec("omxplayer " + this.path + "/newmessage.wav");
  },

  openUrl: async function (url) {
    console.log(this.name + ": Opening URL: ", url);
    const self = this;
    let switchCount = 0;

    function closeBrowser() {
      console.log(self.name + ": Closing browser window");
      self.browserWindow.close();
      scroller.setRotaryHandler(null);
      scroller.setSwitchHandler(null);
    }

    function switchClicked() {
      switchCount++;
      if (switchCount === 3) {
        closeBrowser();
      }
      setTimeout(() => {
        switchCount = 0;
      }, 3000);
    }

    function scroll(direction) {
      self.browserWindow.webContents
        .executeJavaScript(
          "window.scrollBy(0, " + direction * 5 * self.config.scrollSpeed + ")",
          true
        )
        .then(null)
        .catch((error) => {
          console.log(self.name + ": Scroll error: ", error);
        });
    }

    if (!this.browserWindow) {
      console.log(this.name + ": Opening new browser window");
      this.browserWindow = new BrowserWindow({ fullscreen: true });
      this.browserWindow.on("close", () => {
        this.browserWindow = null;
      });
    }

    this.browserWindow.loadURL(url);
    scroller.setRotaryHandler(scroll);
    scroller.setSwitchHandler(switchClicked);

    const inactivityTimeout = this.config.urlTimeoutSeconds * 1000;
    clearTimeout(this.browserTimeout);
    this.browserTimeout = setTimeout(closeBrowser, inactivityTimeout);
  }
});
