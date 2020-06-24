const request = require('request')
const uuidv4 = require('uuid/v4')
const NodeHelper = require('node_helper')
const fs = require('fs')
const { BrowserWindow } = require('electron')
const { chunksToLinesAsync, chomp } = require('@rauschma/stringio')

module.exports = NodeHelper.create({
  start: function () {
    console.log(this.name + ': Starting node_helper')
    this.loaded = false
  },

  scrollerChild: null,
  browserWindow: null,

  stop: function () {
    this.scrollerChild.kill()
  },

  getScreenKey: function (config) {
    var path = this.path + '/keys'
    var filename = path + '/' + config.name.replace(' ', '_') + '.key'

    if (!fs.existsSync(path)) {
      console.log(
        this.name + ': Creating directory for screen key files: ',
        path
      )
      fs.mkdirSync(path)
    }

    if (fs.existsSync(filename)) {
      screenKey = fs.readFileSync(filename, { encoding: 'utf8' })
      console.log(this.name + ': Found screen key: ' + screenKey)
    } else {
      console.log(this.name + ': Generating new screen key file: ', filename)
      screenKey = uuidv4()
      fs.writeFileSync(filename, screenKey)
    }

    return screenKey
  },

  registerScreen: function (config) {
    var self = this

    console.log(this.name + ': Registering screen ', config.name)

    var screenKey = self.getScreenKey(config)
    if (screenKey) {
      users = {}
      config.users.forEach(user => {
        users[user.email.replace(/\./g, '+', 'g')] = user.name
      })

      var data = {
        name: config.name,
        secret: screenKey,
        users: users
      }

      console.log(
        'Registering screen on ',
        config.functions + '/screens' + '. Data = ',
        data
      )

      request(
        {
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          uri: config.functions + '/screens',
          method: 'POST',
          body: JSON.stringify(data)
        },
        function (err, res, body) {
          if (err) {
            console.error(self.name + ': Error registering screen: ', err)
          } else {
            console.log(self.name + ': Screen registered: ', config.name)
          }
        }
      )

      this.sendScreenKey(config.name, screenKey)
    }
  },

  sendScreenKey: function (name, screenKey) {
    console.log(this.name + ': Sending screen key ' + screenKey + ' to ' + name)
    this.sendSocketNotification('SCREENKEY', {
      name: name,
      screenKey: screenKey
    })
  },

  socketNotificationReceived: function (notification, payload) {
    var self = this

    if (notification === 'MESSAGETOMIRROR_CONFIG') {
      self.config = payload
      config = payload

      self.registerScreen(config)

      self.loaded = true
      self.options = {}
    } else if (notification === 'MESSAGETOMIRROR_SEND_RECEIPT') {
      ref = payload
      self.sendReceipt(ref)
    } else if (notification === 'MESSAGETOMIRROR_URL') {
      url = payload
      self.openUrl(url)
    }
  },

  sendReceipt: function (path) {
    console.log('Sending receipt for ', path)
    self = this
    request(
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        uri: self.config.functions + '/receipts',
        method: 'POST',
        body: JSON.stringify({ messagePath: path })
      },
      function (err, res, body) {
        if (err) {
          console.error(self.name + ': Error sending receipt: ', err)
        } else {
          console.log(self.name + ': Receipt sent')
        }
      }
    )
  },

  openUrl: async function (url) {
    console.log(this.name + ': Opening URL: ', url)
    const self = this
    if (!this.browserWindow) {
      console.log(this.name + ': Opening new browser window')
      this.browserWindow = new BrowserWindow({ fullscreen: true })
    }
    this.browserWindow.loadURL(url)

    if (!this.scrollerChild) {
      const { spawn } = require('child_process')

      console.log(this.name + ': Spawning scroller child process')
      this.scrollerChild = spawn(
        'python3',
        [
          this.config.testScroller
            ? 'modules/MMM-MessageToMirror/test-scroller.py'
            : 'modules/MMM-MessageToMirror/scroller.py'
        ],
        { stdio: ['ignore', 'pipe', process.stderr] }
      )

      this.scrollerChild.on('exit', function (code, signal) {
        console.log(
          this.name +
            ': Scroller exited with ' +
            `code ${code} and signal ${signal}`
        )
      })

      this.scrollerChild.on('error', function (error) {
        console.log(this.name + ': Scroller error: ' + error)
      })
    }

    function closeBrowser () {
      console.log(self.name + ': Closing browser window')
      self.browserWindow.close()
    }

    const inactivityTimeout = this.config.urlTimeoutSeconds * 1000
    clearTimeout(this.browserTimeout)
    this.browserTimeout = setTimeout(closeBrowser, inactivityTimeout)

    function scroll (browserWindow, direction) {
      browserWindow.webContents
        .executeJavaScript(
          'window.scrollBy(0, ' + direction * self.config.scrollSpeed + ')'
        )
        .then(null)
        .catch(error => {
          console.log(self.name + ': Scroll error: ', error)
        })
    }

    async function browserControl (input, browserWindow) {
      let scrollInterval = null
      for await (const line of chunksToLinesAsync(input)) {
        const distance = chomp(line)
        const rev = self.config.reverseScrolling ? -1 : 1
        const direction =
          distance < self.config.scrollUpCm
            ? -rev
            : distance < self.config.scrollDownCm
            ? rev
            : 0
        console.log(self.name + ': Distance: ' + distance)
        console.log(self.name + ': Direction: ' + direction)
        clearInterval(scrollInterval)
        if (direction) {
          clearTimeout(self.browserTimeout)
          self.browserTimeout = setTimeout(closeBrowser, inactivityTimeout)
          scroll(browserWindow, direction)
          scrollInterval = setInterval(() => {
            scroll(browserWindow, direction)
          }, 20)
        }
      }
    }

    console.log(this.name + ': Starting browserControl')
    await browserControl(this.scrollerChild.stdout, this.browserWindow)

    console.log(this.name + ': Reading scroller done')
  }
})
