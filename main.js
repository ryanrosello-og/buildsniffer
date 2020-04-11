const { app, BrowserWindow, Menu, Tray, dialog } = require('electron')
const Poller = require('./poller')
const path = require('path')
const fs = require('fs')
const request = require('request');
const log = require('electron-log');
var childProcess = require('child_process');
var appConfig = {}
let tray = null

require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules/.bin/electron.cmd')
})

getConfig()

app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath("exe")
});

function startPolling() {
  let poller = new Poller(appConfig.pollInterval);
  let failCount = 0;
  let stillAlive = true;

  poller.onPoll(() => {
    if (failCount < appConfig.failureThreshold) {
      request(`${appConfig.tfsBaseUrl}/status?project=${appConfig.project}&pipeline=${appConfig.pipeline}`, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          build = getToolTip(body)
          let jsonResp = JSON.parse(body)
          const contextMenu = Menu.buildFromTemplate([
            {
              label: '' + build.msg,
              icon: `./resources/${build.icon}`,
              click: function () {
                let url = `${appConfig.tfsBaseUrl}/search?q=${jsonResp.build_info.build_number}`
                childProcess.exec('start chrome --kiosk ' + url);
                log.info('User navigated to', url)
              }
            },
            {
              label: 'Exit',
              icon: './resources/exit.png',
              click: function () {
                log.info('Exiting ...')
                app.quit()
              }
            }
          ])
          tray.setToolTip('' + build.tooltip)
          tray.setContextMenu(contextMenu)
          tray.setImage(`./resources/${build.icon}`)
          log.info('updated tray => ', build)
        } else {
          const contextMenu = Menu.buildFromTemplate([
            {
              label: 'Show error(s)',
              click: function () {
                log.error('error => ', error)
                dialog.showErrorBox('Failed to retrieve build information', `${error.message} \n ${error.stack}`)
              }
            },
            {
              label: 'Exit',
              icon: './resources/exit.png',
              click: function () {
                log.info('Exiting ...')
                app.quit()
              }
            }
          ])
          tray.setToolTip('Something bad happened...')
          tray.setContextMenu(contextMenu)
          tray.setImage(`./resources/problem.png`)
          log.error('error => ', error)
          failCount++
        }
      })
    } else if (failCount == 10 && stillAlive) {
      log.error('Too many failures, stopped trying. ')
      stillAlive = false;
    }

    poller.poll(); // Go for the next poll        
  });

  // Initial start
  poller.poll();
}

app.whenReady().then(startPolling)

app.on('ready', () => {
  tray = new Tray('./resources/icons8-final-state-40.png')
})

function getToolTip(data) {
  let buildInfo, icon = ''
  buildData = JSON.parse(data)
  msg = `${buildData.build_info.build_number} 5 minutes ago`

  if (buildData.build_info.status == 'running') {
    buildInfo = `ᕕ(ᐛ)ᕗ ${msg}`
    icon = 'icons8-final-state-40.png'
  } else if (buildData.build_info.status == 'failed') {
    buildInfo = `❌ ${msg}`
    icon = 'fail.png'
  } else {
    buildInfo = `✅ ${msg}`
    icon = 'pass.png'
  }

  return { tooltip: buildInfo, icon: icon, msg: msg }
}

function getConfig() {
  let dataPath = path.join(__dirname, 'config.json');
  let data = JSON.parse(fs.readFileSync(dataPath));

  appConfig.project = data.project
  appConfig.pat = data.pat
  appConfig.pipeline = data.pipeline
  appConfig.tfsBaseUrl = data.tfsBaseUrl
  appConfig.pollInterval = data.pollInterval
  appConfig.failureThreshold = data.failureThreshold
  log.info('Loaded config: ', appConfig)
}