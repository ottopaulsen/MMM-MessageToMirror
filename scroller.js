const Gpio = require('onoff').Gpio;

const cl = new Gpio(17, 'in', 'both', {debounceTimeout: 5});
const dt = new Gpio(18, 'in', 'both', {debounceTimeout: 5});
const sw = new Gpio(27, 'in', 'both', {debounceTimeout: 20});
let end_program = false;

const speed = 10

const STATUS_REST = 1
const STATUS_CL0 = 2
const STATUS_CL1 = 3
let status = STATUS_REST
let dtValue = 0
let switchCounter = 0
let rotaryHandler = null;
let switchHandler = null;

console.log("Starting, v: ", process.version)

exports.close = function () {
  cl.unexport();
  dt.unexport();
  sw.unexport();
  console.log("Closing scroller")
}

exports.setRotaryHandler = function (handler) {
  rotaryHandler = handler
}
exports.setSwitchHandler = function (handler) {
  switchHandler = handler
}

process.on('SIGINT', _ => {
  close()
});

cl.watch((err, value) => {
    if (err) {
        console.log("scroller cl error:", err)
        return
    }
    if (status === STATUS_REST && value === 0) {
        status = STATUS_CL0
        return
    }
    if (status === STATUS_CL0 && value === 1) {
        status = STATUS_CL1
        handleRotary(dtValue ? -1 : 1)
        setTimeout(() => {
            status = STATUS_REST
        }, 10)
    }
})
dt.watch((err, value) => {
    if (err) {
        console.log("scroller dt error:", err)
        return
    }
    dtValue = value
    
})
sw.watch((err, value) => {
    if (err) {
        console.log("scroller sw error:", err)
    }
    handleSwitch(value)
})

function handleRotary (value) {
  if (rotaryHandler) {
    rotaryHandler(value)
  }
}

function handleSwitch(value) {
  if (value === 0 && status === STATUS_REST) {
    // Read 5 times more to be sure
    let ok = true
    for(i in 5) {
      setTimeout(() => {
        if(sw.readSync() !== value) {
          ok = false
        }
      }, i * 3)
    }
    setTimeout(() => {
      if (ok) {
        switchCounter++;
        setTimeout(() => {
            switchCounter = 0
        }, 3000)
        if (switchHandler) {
          switchHandler(switchCounter)
        }    
      }
    }, 17)
  }
}

// setInterval(() => {
//     if (end_program) {
//         cl.unexport();
//         dt.unexport();
//         sw.unexport();
//         console.log("Exiting")
//         robot.keyTap("f4", "alt")
//         process.exit()
//     }
// }, 1000)
