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
    var filename = path + "/" + config.name.replace(/ /g, "_") + ".key";

    if (!fs.existsSync(path)) {
      console.log(
        this.name + ": Creating directory for screen key files: ",
        path
      );
      fs.mkdirSync(path);
    }

    if (fs.existsSync(filename)) {
      screenKey = fs.readFileSync(filename, { encoding: "utf8" }).trim();
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
      const users = {};
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

      fetch(config.functions + "/screens", {
          method: "POST",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(data)
        })
        .then((res) => {
          if (!res.ok) {
            return res.text().then((body) => {
              console.warn(self.name + ": Screen registration returned HTTP " + res.status + " (screen may already be registered): " + body);
            });
          }
          console.log(self.name + ": Screen registered: ", config.name);
        })
        .catch((err) => {
          console.warn(self.name + ": Could not reach registration endpoint: ", err.message);
        });

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
      const ref = payload;
      self.sendReceipt(ref);
    } else if (notification === "MESSAGETOMIRROR_URL") {
      const url = payload;
      self.openUrl(url);
    } else if (notification === "MESSAGETOMIRROR_BELL") {
      self.playBell();
    }
  },

  sendReceipt: function (path) {
    console.log("Sending receipt for ", path);
    const self = this;
    fetch(self.config.functions + "/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ messagePath: path })
    })
      .then((res) => {
        if (!res.ok) throw new Error("HTTP " + res.status);
        console.log(self.name + ": Receipt sent");
      })
      .catch((err) => {
        console.error(self.name + ": Error sending receipt: ", err.message);
      });
  },

  playBell: function () {
    if (!isPi()) return;
    const playCommand = `${this.config.playMessageCommand} ${this.path}/${this.config.newMessageSound}`;
    console.log(this.name + ": Playing bell: " + playCommand);
    exec(playCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(this.name + ": Error playing bell: ", error.message);
      }
      if (stderr) {
        console.error(this.name + ": Bell stderr: ", stderr);
      }
    });
  },

  openUrl: async function (url) {
    console.log(this.name + ": Opening URL: ", url);

    if (!this.browserWindow) {
      console.log(this.name + ": Opening new browser window");
      this.browserWindow = new BrowserWindow({ fullscreen: true });
      this.browserWindow.on("close", () => {
        this.browserWindow = null;
      });
    }

    this.browserWindow.loadURL(url);

    const inactivityTimeout = this.config.urlTimeoutSeconds * 1000;
    clearTimeout(this.browserTimeout);
    this.browserTimeout = setTimeout(() => {
      console.log(this.name + ": Closing browser window");
      this.browserWindow.close();
    }, inactivityTimeout);
  }
});
