const electronInstaller = require('electron-winstaller');

try {
  let result = electronInstaller.createWindowsInstaller({
    appDirectory: './release-builds/yuarpp-win32-x64',
    outputDirectory: './tmp/build/installer64',
    authors: 'lIGHTly Toasted.',
    exe: 'yuarpp.exe'
  });
  result.then(() => {
    console.log('Installer generated');
  }).catch((e) => {
    console.log(`Failed to create the installer: ${e}`);
  })
} catch (e) {
  console.log(`No dice: ${e.message}`);
}