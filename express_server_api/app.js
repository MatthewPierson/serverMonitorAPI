const express = require('express')
var exec = require('child_process').exec
const checkDiskSpace = require('check-disk-space').default
const app = express()
const port = 3000
const ip = require("ip").address();

app.get('/alive', (req, res) => {
  res.send({response: 200})
})  

app.get('/services', (req, res) => {
  shadowPlayStatus = false
  expressAPIStatus = false

  exec("systemctl status shadowplaymover", function(error, stdout, stderr) {
    if (!error) {
      if (stdout.includes("active (running)")) {
        shadowPlayStatus = true
      }
    }
    exec("systemctl status expressAPI", function(error, stdout, stderr) {
      if (!error) {
        if (stdout.includes("active (running)")) {
          expressAPIStatus = true
        }
      }
      res.send({shadowplay: shadowPlayStatus, expressAPI: expressAPIStatus})
    });
  });
})

app.get('/name', (req, res) => {
    exec("uname -n", function(error, stdout, stderr) {
    if (!error) {
      res.send({name: stdout})
    } else {
      console.log(error)
      res.send(error)
    }
  });
})

app.get('/ip', (req, res) => {
  res.send({ip: ip})
})

app.get('/cpuUsage', (req, res) => {
  exec("bash ./cpuUsage.sh", function(error, stdout, stderr) {
    if (!error) {
      res.send({cpuUsage: (Number(stdout).toFixed(2)).replace('\n', '')})
    } else {
      console.log(error)
      res.send(error)
    }
  });
})

app.get('/cpuTemp', (req, res) => {
  exec("cat /sys/class/thermal/thermal_zone*/temp", function(error, stdout, stderr) {
    if (!error) {
      res.send({cpuTemp: stdout / 1000})
    } else {
      console.log(error)
      res.send(error)
    }
  });
})

app.get('/memoryUsage', (req, res) => {
  exec("cat /proc/meminfo | grep \"MemTotal\"", function(error, stdout, stderr) {
    if (!error) {
        totalMem = ((stdout.split(":")[1].trim().split(" kB")[0]) / 1000).toFixed(2)      
        exec("cat /proc/meminfo | grep \"MemAvailable\"", function(error, stdout, stderr) {
          if (!error) {
            freeMem = ((stdout.split(":")[1].trim().split(" kB")[0]) / 1000).toFixed(2)
            res.send({freeMem: freeMem, totalMem: totalMem, percentFree: (100 - (freeMem / totalMem) * 100).toFixed(2)})
          } else {
            console.log(error)
            res.send(error)
          }
        });
    } else {
      console.log(error)
      res.send(error)
    }
  });
})

app.get('/diskUsage', (req, res) => {
  rootDataFree = ""
  timeMachineDataFree = ""
  sambaDataFree = ""
  shadowplayDataFree = ""
  rootDataTotal = ""
  timeMachineDataTotal = ""
  sambaDataTotal = ""
  shadowplayDataTotal = ""
  // I don't like this being nested but doing it other ways prevented res.send from working
  // Will look at re-writing this at some point :)
  checkDiskSpace('/').then((diskSpace) => {
    rootDataFree = (diskSpace.free / 1000).toFixed(2)
    rootDataTotal = (diskSpace.size / 1000).toFixed(2)
    checkDiskSpace('/home/matty/time-machine').then((diskSpace) => {
      timeMachineDataFree = (diskSpace.free / 1000).toFixed(2)
      timeMachineDataTotal = (diskSpace.size / 1000).toFixed(2)
      checkDiskSpace('/home/matty/sambashare').then((diskSpace) => {
        sambaDataFree = (diskSpace.free / 1000).toFixed(2)
        sambaDataTotal = (diskSpace.size / 1000).toFixed(2)
        checkDiskSpace('/home/matty/ShadowPlayFolder').then((diskSpace) => {
          shadowplayDataFree = (diskSpace.free / 1000).toFixed(2)
          shadowplayDataTotal = (diskSpace.size / 1000).toFixed(2)
          res.send({root: rootDataFree, rootSize: rootDataTotal, timeMachine: timeMachineDataFree, timeMachineSize: timeMachineDataTotal, samba: sambaDataFree, sambaSize: sambaDataTotal, shadowPlay: shadowplayDataFree, shadowPlaySize: shadowplayDataTotal})
        })
      })
    })
  })
})

app.listen(port, () => {
  console.log(`api running on port ${port}`)
})
