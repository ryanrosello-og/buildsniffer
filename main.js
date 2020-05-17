const { screen, app, Menu, Tray, dialog, shell, BrowserWindow } = require('electron')
const Poller = require('./poller')
const utils = require('./lib')
const request = require('request');
const log = require('electron-log');
const path = require('path')
const firstRun = require('electron-first-run');
const isFirstRun = firstRun()

var appConfig = {}
let tray = null
let lastestBuild = null
var mainWindow = null
let initialized = false

// this should be placed at top of main.js to handle setup events quickly
if (handleSquirrelEvent()) {
  // squirrel event handled and app will exit in 1000ms, so don't do anything else
  utils.initConfig()
  log.info('App first run. Config initialized')
  return;
}

function handleSquirrelEvent() {
  if (process.argv.length === 1) {
    return false;
  }

  const ChildProcess = require('child_process');
  const path = require('path');

  const appFolder = path.resolve(process.execPath, '..');
  const rootAtomFolder = path.resolve(appFolder, '..');
  const updateDotExe = path.resolve(path.join(rootAtomFolder, 'Update.exe'));
  const exeName = path.basename(process.execPath);

  const spawn = function(command, args) {
    let spawnedProcess, error;

    try {
      spawnedProcess = ChildProcess.spawn(command, args, {detached: true});
    } catch (error) {}

    return spawnedProcess;
  };

  const spawnUpdate = function(args) {
    return spawn(updateDotExe, args);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      // Optionally do things such as:
      // - Add your .exe to the PATH
      // - Write to the registry for things like file associations and
      //   explorer context menus

      // Install desktop and start menu shortcuts
      spawnUpdate(['--createShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-uninstall':
      // Undo anything you did in the --squirrel-install and
      // --squirrel-updated handlers

      // Remove desktop and start menu shortcuts
      spawnUpdate(['--removeShortcut', exeName]);

      setTimeout(app.quit, 1000);
      return true;

    case '--squirrel-obsolete':
      // This is called on the outgoing version of your app before
      // we update to the new version - it's the opposite of
      // --squirrel-updated

      app.quit();
      return true;
  }
};

if(isFirstRun) {
  utils.initConfig()
  log.info('App first run. Config initialized')
}

appConfig = utils.getConfig()

app.setLoginItemSettings({
  openAtLogin: true,
  path: app.getPath("exe")
});

function startPolling() {
  let poller = new Poller(appConfig.pollInterval);
  let failCount = 0;
  let stillAlive = true;
  let display = screen.getPrimaryDisplay();
  let width = display.bounds.width;
  let h = display.bounds.height;

  tray = new Tray(utils.getResource('./images/img_icons8-final-state-40.png'))

  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      devTools: false
    },    
    width: 400,
    height: 600,
    frame: false,
    transparent: true, 
    x: width - 400,
    y: h - 650
  }) 
  mainWindow.loadFile('index.html')
  if(isFirstRun) {
    const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Restart App',
      icon: utils.getResource('./images/img_restart.png'),
      click: function () {
        log.info('Restarting ...')
        app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) })
        app.exit(0)
      }
    }])    
    tray.setContextMenu(contextMenu)    
    mainWindow.show();
    return // don't start polling
  } else {
    mainWindow.hide();
    poller.onPoll(() => {    
      if (failCount < appConfig.failureThreshold) {
        request({ url: utils.getUrl(appConfig), headers: { 'Authorization': utils.generateAuthToken(appConfig.username, appConfig.pat) } }, function (error, response, body) {
          if (!error && response.statusCode == 200) {
            build = utils.parseResponse(body)
  
            if (build == null) {
              log.info('No deploymets found')
              failCount++
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
            log.info(`updated tray [${build}] | lastestBuild[${lastestBuild}] | build.releaseName[${build.releaseName}]`)
            if (initialized && lastestBuild != build.releaseName) {
              showWindowsToast(build.releaseName, build.requestedFor, build.deploymentStatus, build.branch)
            }
            lastestBuild = build.releaseName
            initialized = true
          } else {
            const contextMenu = Menu.buildFromTemplate([
            {
              label: 'Reconnect',
              icon: utils.getResource('./images/img_restart.png'),
              click: function () {
                log.info('Restarting ...')
                app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) })
                app.exit(0)
              }
            },             
            {
              label: 'Show error(s)',
              icon: utils.getResource('./images/img_problem.png'),
              click: function () {
                log.error('error => ', error)
                dialog.showErrorBox('Failed to retrieve build information', `${error.message} \n ${error.stack}`)
              }
            }].concat(commonMenuOpts))
            tray.setToolTip('Offline')
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
      mainWindow.show();      
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

function showWindowsToast(title, message, status, branch) {
  var child = require('child_process').execFile;
  var executablePath = path.join(__dirname, './node_modules/node-notifier/vendor/snoreToast/snoretoast-x64.exe');  
  var parameters = ['-t', `${title}`, '-m', `${message}`, '-p', `${utils.getResource(`./images/img_${status}_large.png`)}`,'-appID', branch];

  child(executablePath, parameters, function(err, data) {
      log.error(err)
  });
}

function showConfigIsValid() {
  dialog.showMessageBox({
    title:'Configuration Validation Successful', 
    message: 'The application will now restart.',
    buttons:['Ok'],
    icon: utils.getResource(`./images/img_succeeded_large.png`)
  }).then(()=>{
    log.info('Restarting ...')
    app.relaunch({ args: process.argv.slice(1).concat(['--relaunch']) })
    app.exit(0)
  })
}

exports.showConfigIsValid = showConfigIsValid;