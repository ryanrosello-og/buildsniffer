const { app, BrowserWindow, Menu, Tray, dialog } = require('electron')
const Poller = require('./poller')
const path = require('path')
const request = require('request');

require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules/.bin/electron.cmd')
})

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  win.loadFile('index.html')
  win.hide()
 
  let poller = new Poller(5000);   

  poller.onPoll(() => {
    request('http://localhost:3000/status?project=ekk&pipeline=big', function (error, response, body) {
      if (!error && response.statusCode == 200) {
        build = getToolTip(body)
        const contextMenu = Menu.buildFromTemplate([
          {
            label: '' + build.tooltip,
            click: function () {
              dialog.showMessageBoxSync(BrowserWindow, {
                title: 'yo',
                message: 'dis'
              })
            }
          },
          {
            label: 'Exit',
            click: function () {
              app.quit()
            }
          }
        ])
        tray.setToolTip('' + build.tooltip)
        tray.setContextMenu(contextMenu)
        tray.setImage(`./${build.icon}`)
        console.log('updated tray => ', build)
      }
    })
    
    poller.poll(); // Go for the next poll        
  });

  // Initial start
  poller.poll();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

let tray = null
app.on('ready', () => {
  tray = new Tray('./icons8-final-state-40.png')
  var build;

  request('http://localhost:3000/status?project=ekk&pipeline=big', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      build = getToolTip(body)
      const contextMenu = Menu.buildFromTemplate([
        {
          label: '' + build,
          click: function () {
            dialog.showMessageBoxSync(BrowserWindow, {
              title: 'yo',
              message: 'dis'
            })
          }
        },
        {
          label: 'Exit',
          click: function () {
            app.quit()
          }
        }
      ])
      tray.setToolTip('' + build)
      tray.setContextMenu(contextMenu)
    }
  })

})

function getToolTip(data) {
  let buildInfo, icon = ''
  buildData = JSON.parse(data)

  if (buildData.build_info.status == 'running') {
    buildInfo = `ᕕ( ᐛ )ᕗ ${buildData.build_info.build_number} 5 minutes ago`
    icon ='icons8-final-state-40.png'
  } else if (buildData.build_info.status == 'failed') {
    buildInfo = `❌ ${buildData.build_info.build_number} 5 minutes ago`
    icon ='fail.png'
  } else {
    buildInfo = `✅ ${buildData.build_info.build_number} 5 minutes ago`
    icon ='pass.png'
  }

  return { tooltip: buildInfo, icon: icon }
}
