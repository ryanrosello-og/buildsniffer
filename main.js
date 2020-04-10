const { app, BrowserWindow, Menu, Tray, dialog  } = require('electron')
const Poller = require('./poller')

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

  let poller = new Poller(2500); 

  // Wait till the timeout sent our event to the EventEmitter
  let n = 0;
  poller.onPoll(() => {
      console.log('triggered');
      poller.poll(); // Go for the next poll
      n++
      tray.setToolTip(`✅ 432342 - 5 minutes ago ${n}`)
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
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Toggle DevTools',
      accelerator: 'Alt+Command+I',
      click: function () {
        dialog
        dialog.showMessageBoxSync(BrowserWindow, {
          title: 'yo',
          message: 'dis' 
        })        
      }
    }
  ])
  tray.setToolTip('✅ 432342 - 5 minutes ago')
  tray.setContextMenu(contextMenu)
})
