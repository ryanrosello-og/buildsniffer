const { app, Menu, Tray, dialog, shell, BrowserWindow } = require('electron')
const Poller = require('./poller')
const utils = require('./lib')
const request = require('request');
const log = require('electron-log');
const WindowsToaster = require('node-notifier').WindowsToaster;

var appConfig = {}
let tray = null
let lastestBuild = null
var mainWindow = null
let initialized = false

var notifier = new WindowsToaster({
  withFallback: false,
  customPath: undefined
});

appConfig = utils.getConfig('./config.json')

app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath("exe")
});

function startPolling() {
  let poller = new Poller(appConfig.pollInterval);
  let failCount = 0;
  let stillAlive = true;
  tray = new Tray(utils.getResource('./images/img_icons8-final-state-40.png'))

  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    },    
    width: 800,
    height: 600,
    frame: false
  }) 
  mainWindow.loadFile('index.html')
  mainWindow.hide();

  poller.onPoll(() => {    
    if (failCount < appConfig.failureThreshold) {
      request({ url: utils.getUrl(appConfig), headers: { 'Authorization': utils.generateAuthToken(appConfig.username, appConfig.pat) } }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          build = utils.parseResponse(body)

          if (build == null) {
            log.info('No deploymets found')
            return
          }

          if (build.deploymentStatus != 'succeeded' && build.deploymentStatus != 'failed') {
            return
          }

          const contextMenu = Menu.buildFromTemplate([
          {
            label: '' + build.msg,
            icon: utils.getResource('./images/' + build.icon),
            click: function () {
              shell.openExternal(build.releaseUrl)
              log.info('User navigated to', build.releaseUrl)
            }
          }].concat(commonMenuOpts))
          tray.setToolTip('' + build.tooltip)
          tray.setContextMenu(contextMenu)
          tray.setImage(utils.getResource('./images/' + build.icon))
          log.info('updated tray => ', build)
          log.info('lastestBuild => ', lastestBuild)
          log.info('build.releaseName => ', build.releaseName)
          if (initialized && lastestBuild != build.releaseName) {
            showWindowsToast(build.tooltip, build.toastMessage, build.releaseUrl)
          }
          lastestBuild = build.releaseName
          initialized = true
        } else {
          const contextMenu = Menu.buildFromTemplate([
          {
            label: 'Show error(s)',
            icon: utils.getResource('./images/img_problem.png'),
            click: function () {
              log.error('error => ', error)
              dialog.showErrorBox('Failed to retrieve build information', `${error.message} \n ${error.stack}`)
            }
          }].concat(commonMenuOpts))
          tray.setToolTip('Something bad happened...')
          tray.setContextMenu(contextMenu)
          tray.setImage(utils.getResource('./images/img_problem.png'))
          log.error('error => ', error)
          failCount++
        }
      })
    } else if (failCount == 10 && stillAlive) {
      log.error('Too many failures, stopped trying. ')
      stillAlive = false;
    }

    poller.poll();
  });
  poller.poll();
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {  // prevent multiple instances firing up
  app.quit()
} else {
  app.whenReady().then(startPolling)
}

let commonMenuOpts = [
  { type: 'separator' },
  {
    label: 'Configure',
    icon: utils.getResource('./images/img_config.png'),
    click: function () {
      mainWindow.webContents.openDevTools()
      mainWindow.show();
      mainWindow.webContents.send('some_js_Method', 'window created!');
    }
  },
  {
    label: 'Show Logs',
    icon: utils.getResource('./images/img_logs.png'),
    click: function () {
      let homeDir = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
      shell.openItem(`${homeDir}/AppData/Roaming/yuarpp/logs/main.log`)
    }
  },
  {
    label: 'Exit',
    icon: utils.getResource('./images/img_exit.png'),
    click: function () {
      log.info('Exiting ...')
      app.quit()
    }
  }
]

function showWindowsToast(title, message, releaseUrl) {
  notifier.notify({ title: title, message: message, appID: 'Build notification', wait: true },
    function (error, response) {
      if (error) {
        log.error(error)
      }      
    }
  );

  notifier.on('click', function(notifierObject, options, event) {
    shell.openExternal(releaseUrl)
  });
}
