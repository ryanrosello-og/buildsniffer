const electronInstaller = require('electron-winstaller');

try {
    electronInstaller.createWindowsInstaller({
      appDirectory: './release-builds/yuarpp-win32-x64',
      outputDirectory: './tmp/build/installer64',
      authors: 'lIGHTly Toasted.',
      exe: 'yuarpp.exe'
    });
    console.log('It worked!');
  } catch (e) {
    console.log(`No dice: ${e.message}`);
  }