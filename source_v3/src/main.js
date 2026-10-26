import { app, Menu, BrowserWindow, globalShortcut, ipcMain, shell, Tray, screen  } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { spawn, execSync } from 'node:child_process';
import started from 'electron-squirrel-startup';
import fileHelper from './Helpers/FileHelper.js';
import themeHelper from './Helpers/ThemeHelper.js';
import settingsHelper from './Helpers/SettingsHelper.js';
import Shipyard from './MainWindow/ShipyardNew.js';


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) { app.quit(); } //<- This is a Squirrel event, so we quit the app

// Declare variables for windows and tray
let mainWindow;
let tray;
let BalloonShown = false;
let StartMinimizedToTray = false;
let shipyard;
let CustomIcon;
let programSettings;
const windowStatePath = () => path.join(fileHelper.getAppDataRoot(), 'WindowState.json');

function loadWindowState() {
  try {
    const statePath = windowStatePath();
    if (!fs.existsSync(statePath)) return {};
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch (error) {
    console.warn('Unable to load window state:', error.message);
    return {};
  }
}

function saveWindowState(win) {
  try {
    if (!win || win.isDestroyed()) return;
    const bounds = win.getBounds();
    fs.mkdirSync(path.dirname(windowStatePath()), { recursive: true });
    fs.writeFileSync(windowStatePath(), JSON.stringify({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    }, null, 2));
  } catch (error) {
    console.warn('Unable to save window state:', error.message);
  }
}


//- Check for Single Instance:
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit(); // Si otra instancia ya está corriendo, cerramos esta.
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore(); // Restaura si estaba minimizada.
      }
      mainWindow.show();  // Muestra la ventana si estaba oculta.
      mainWindow.focus(); // Asegura que la ventana tenga el foco.
    }
  });
  Start();
}

function isWindowsWineLikeRuntime() {
  if (process.platform !== 'win32') return false;

  const wineEnvHints = ['WINEPREFIX', 'WINELOADER', 'WINELOADERNOEXEC', 'CX_BOTTLE', 'CX_ROOT'];
  if (wineEnvHints.some(name => !!process.env[name])) {
    return true;
  }

  try {
    execSync('reg query "HKCU\\Software\\Wine"', { stdio: 'ignore' });
    return true;
  } catch {}

  try {
    execSync('reg query "HKLM\\Software\\Wine"', { stdio: 'ignore' });
    return true;
  } catch {}

  return false;
}

async function Start() {
  try {
    programSettings = await settingsHelper.initializeSettings();

    //- Set the default Icon for the app
    CustomIcon = settingsHelper.readSetting('CustomIcon', fileHelper.getAssetPath('images/Icon_v3_a0.ico'));
    console.log('CustomIcon:', CustomIcon);

    //#region Graphic Options

    const isWineRuntime = isWindowsWineLikeRuntime();
    if (isWineRuntime) {
      console.log('Detected Wine/CrossOver runtime. Forcing SwiftShader WebGL fallback flags.');
      app.commandLine.appendSwitch('use-angle', 'swiftshader');
      app.commandLine.appendSwitch('enable-unsafe-swiftshader');
      app.commandLine.appendSwitch('in-process-gpu');
      app.commandLine.appendSwitch('no-sandbox');
    } else {
      //- Rendering Backend: Vulkan / OpenGL / Direct3D:
      const GpuRenderer = settingsHelper.readSetting('GpuRenderer', 'Vulkan');
      switch (GpuRenderer) {
        case 'Vulkan': app.commandLine.appendSwitch('use-vulkan'); break; // Force Vulkan
        case 'OpenGL': app.commandLine.appendSwitch('use-angle', 'gl'); break; // Force ANGLE with OpenGL
        case 'Direct3D': app.commandLine.appendSwitch('use-angle', 'd3d11'); break; // Force ANGLE with Direct3D 11
        default:
          app.commandLine.appendSwitch('use-vulkan'); break;
      }
    }

    // Desactiva solo la composición por GPU (no toda la aceleración)
    const GpuComposite = settingsHelper.readSetting('GpuComposite', true);
    if (!GpuComposite) {
      app.commandLine.appendSwitch('disable-gpu-compositing');
    }
    const GpuAcceleration = settingsHelper.readSetting('GpuAcceleration', true);
    if (!GpuAcceleration && !isWineRuntime) {
      app.commandLine.appendSwitch('disable-gpu');
    }
    //- Hardware-Accelerated Video Decoding
    const GpuVideoDecode = settingsHelper.readSetting('GpuVideoDecode', true);
    if (!GpuVideoDecode) {
      app.commandLine.appendSwitch('disable-accelerated-video-decode');
    }
    //- Enable GPU-Accelerated 2D Canvas
    const GpuCanvas2D = settingsHelper.readSetting('GpuCanvas2D', true);
    if (!GpuCanvas2D) {
      app.commandLine.appendSwitch('disable-accelerated-2d-canvas');
    }
    //- Enable WebGL” / “Enable WebGL2
    const GpuUseWebGL = settingsHelper.readSetting('GpuUseWebGL', true);
    if (!GpuUseWebGL && !isWineRuntime) {
      app.commandLine.appendSwitch('disable-webgl');
      app.commandLine.appendSwitch('disable-webgl2');
    }
    //- Disable Smooth Scrolling / Animations
    const GpuSmoothScrolling = settingsHelper.readSetting('GpuSmoothScrolling', true);
    if (!GpuSmoothScrolling) {
      app.commandLine.appendSwitch('disable-smooth-scrolling');
    }
    // Opcional: mantiene el factor de escala fijo
    app.commandLine.appendSwitch('high-dpi-support', '1');
    //app.commandLine.appendSwitch('force-device-scale-factor', '1');
    
    //#endregion

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(async () => {
      // Ajustar el escalado de la UI:
      const { size, scaleFactor: systemScale } = screen.getPrimaryDisplay();
      let userScale = settingsHelper.readSetting('UiScaleFactor', 0); // 0 = automático
      let finalScale;
      if (userScale && userScale > 0) {
        finalScale = userScale; //<- Usuario forzó un valor
      } else if (process.platform === 'darwin') {
        // macOS/Retina already handles HiDPI correctly; using the raw system scale
        // here makes the whole UI comically large.
        finalScale = 1;
      } else {
        finalScale = systemScale; //<- Automático: usa el del sistema
        if (size.width >= 3840) {
          finalScale = Math.max(finalScale, 1.5);
        }
      }

      createWindow();

      // Use the native macOS application menu. The renderer keeps its
      // cross-platform menu, while macOS users also get the standard
      // Settings… command in the application menu (⌘,).
      if (process.platform === 'darwin') {
        app.setAboutPanelOptions({ applicationName: 'EDHM-UI for Mac' });
        const applicationMenu = Menu.buildFromTemplate([
          {
            label: 'EDHM-UI for Mac',
            submenu: [
              { role: 'about', label: 'About EDHM-UI for Mac' },
              { type: 'separator' },
              {
                label: 'Settings…',
                role: 'preferences',
                accelerator: 'Command+,',
                click: () => mainWindow?.webContents.send('menu:settings')
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Hide EDHM-UI for Mac' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', label: 'Quit EDHM-UI for Mac' }
            ]
          },
          { label: 'File', role: 'fileMenu' },
          { label: 'Edit', role: 'editMenu' },
          { label: 'View', role: 'viewMenu' },
          { label: 'Window', role: 'windowMenu' },
          { label: 'Help', role: 'help' }
        ]);
        Menu.setApplicationMenu(applicationMenu);
      }


      //-- Create Desktop Shortcut Icons:
      if (process.platform === 'win32') {
        createTray(); // Create the tray icon
        /* Shortcut creation is no longer needed
        const makeShortcut = await settingsHelper.readSetting('CreateShortcutOnDesktop', true);
        if (makeShortcut) {
          fileHelper.createWindowsShortcut.call(this, CustomIcon);
        }*/
      } else if (process.platform === 'linux') {
        //- Linux users prefer their desktop clean, so no shortcut is created by default
        //- Uncomment the next line to create a shortcut on Linux as well
        //fileHelper.createLinuxShortcut.call(this);
      }

      // Handle command-line arguments
      const args = process.argv.slice(2);
      if (args.length > 0) {
        console.log('Command-line arguments:', args);

        // Handle your arguments here
        if (args.includes('--hide')) {
          console.log('Program started with --hide argument.');
          // Hide the main window immediately
          mainWindow.hide();
        }
      }
      
      // Font Size Options:
      const FontSize = await settingsHelper.readSetting('FontSize', '14px'); 
      const { scaleFactor } = screen.getPrimaryDisplay();      
      // Send arguments to the renderer process: App.vue
      mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('app-args', args);
        mainWindow.webContents.send('font-size-setting', FontSize);
        mainWindow.webContents.setZoomFactor(finalScale);
      });

      // Ensure tray works on both Windows and Linux
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow();
        }
      });
    });

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
      try {
        if (process.platform !== 'darwin') {
          if (mainWindow) {
            if (tray) tray.destroy(); // Destroy the tray icon
            globalShortcut.unregisterAll(); // Clean up shortcuts on app quit
            mainWindow.removeAllListeners('close');
            app.quit();
          }
        }
      } catch (error) {
        console.error('Error during window-all-closed:', error);
      }
    });
  } catch (error) {
    console.log(error);
  }
}

const createWindow = () => {
  const savedWindowState = loadWindowState();
  const windowWidth = Math.max(savedWindowState.width || 1600, 800);
  const windowHeight = Math.max(savedWindowState.height || 800, 553);
  const hasSavedPosition = Number.isFinite(savedWindowState.x) && Number.isFinite(savedWindowState.y);

  // Create the browser window.
  mainWindow = new BrowserWindow({ // Assign to the outer scope variable
    ...(hasSavedPosition ? { x: savedWindowState.x, y: savedWindowState.y } : {}),
    width: windowWidth, minWidth: 800,
    height: windowHeight, minHeight: 553,

    icon: CustomIcon, //path.join(__dirname, 'images/ED_TripleElite.ico'),
    backgroundColor: '#1F1F1F',

    show: false, //<- will be decided by the 'StartMinimizedToTray' prop

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
      webSecurity: false,
      sandbox: false, // Asegura que el contenido no esté limitado dentro de Electron
      allowRunningInsecureContent: false
    }
  });

  console.log('App is Loading..');
  if (process.platform === 'darwin') {
    mainWindow.setTitle('EDHM-UI for Mac');
    mainWindow.on('page-title-updated', event => event.preventDefault());
  }

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    console.log('Running on Dev mode: ', MAIN_WINDOW_VITE_DEV_SERVER_URL);
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    //-- Open the DevTools.
    mainWindow.webContents.openDevTools( { mode: 'detach'});

  } else {
    const productionEntry = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    console.log('Production mode:', productionEntry);
    mainWindow.loadFile(productionEntry);
  }

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Main window failed to load:', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Main window render process gone:', details);
  });

  StartMinimizedToTray = settingsHelper.readSetting('StartMinimizedToTray', false);
  console.log('StartMinimizedToTray:', StartMinimizedToTray);

  shipyard = new Shipyard(mainWindow);


  // Register the shortcut to open DevTools
  globalShortcut.register('Shift+F1', () => {
    if (!mainWindow) return
    const wc = mainWindow.webContents

    if (wc.isDevToolsOpened()) {
      wc.closeDevTools()
    } else {
      wc.openDevTools({ mode: 'detach' })
    }
  });
  mainWindow.on('resize', () => {
    saveWindowState(mainWindow);
  });
  mainWindow.on('move', () => {
    saveWindowState(mainWindow);
  });

  mainWindow.once('ready-to-show', () => {
    if (StartMinimizedToTray && process.platform === 'win32') {
      mainWindow.hide(); // arranca minimizada en tray
    } else {
      mainWindow.show(); // arranca visible normalmente
      mainWindow.focus();
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (!(StartMinimizedToTray && process.platform === 'win32') && !mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  // Handle external links
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault(); // Prevent Electron from navigating
      shell.openExternal(url); // Open the URL in the default browser
    }
  });
  // Handle new window creation (if you have links with target="_blank")
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' }; // Prevent Electron from creating a new window
  });
  // Handle window close event
  mainWindow.on('close', (event) => {
    //- Here the Program Terminates Normally
    console.log('Quiting..');
    if (tray) {
      tray.destroy(); // Destroy the tray icon
    }
    app.isQuiting = true; // Signal that the app is quitting
    globalShortcut.unregisterAll(); // Clean up shortcuts on app quit
    if (mainWindow) {
      mainWindow.removeAllListeners('close');
      mainWindow.close();
    }
    app.quit();
  });
};

const createTray = () => {
  //- https://www.electronjs.org/docs/latest/api/tray
  try {
    //- Create the Tray Icon:
    console.log('Creating the Tray icon..')
    tray = new Tray(CustomIcon);

    //- Create Context Menu for the Tray Icon:
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Restore',
        click: () => {
          mainWindow.show(); // Restore the main window
        }
      },
      {
        label: 'Quit',
        click: () => {
          //- Here the Program Terminates Normally
          console.log('Quiting..');
          tray.destroy(); // Destroy the tray icon
          app.isQuiting = true; // Signal that the app is quitting        
          globalShortcut.unregisterAll(); // Clean up shortcuts on app quit
          if (mainWindow) {
            mainWindow.removeAllListeners('close');
            mainWindow.close();
          }
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu);
    tray.setToolTip(process.platform === 'darwin' ? 'EDHM-UI for Mac' : 'EDHM-UI-Mac');

    // Add the double-click event listener
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show(); // Show the main window
      }
    });
  } catch (error) {
    console.error(error);
  }
};

const windows = new Map()

function openSettingsWindow(initData, options = {}) {
  let win = windows.get('settings')

  if (!win || win.isDestroyed()) {
    win = new BrowserWindow({
      width: 800,
      height: 650,
      backgroundColor: '#1F1F1F',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      ...options
    });

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/src/SettingsWindow/settings.html`);
      win.webContents.openDevTools( { mode: 'detach'});
    } else {
      const settingsPath = path.join(process.resourcesPath, 'settings_window', 'settings.html');
      win.loadFile(settingsPath);
      win.webContents.openDevTools( { mode: 'detach'});
    }

    win.once('ready-to-show', () => {
      win.show()
      // Enviar datos iniciales al renderer
      win.webContents.send('init-data', initData)
    })

    win.on('closed', () => {
      windows.delete('settings')
    })
    windows.set('settings', win)
  } else {
    win.focus()
    // refrescar datos si querés
    win.webContents.send('init-data', initData)
  }

  return win
}


//---------------------------------------------------------------
// #region ipc Handlers (Inter-Process Communication)


ipcMain.handle('get-platform', () => {
  return process.platform;
});
ipcMain.handle('quit-program', async (event) => {
  try {
    if (mainWindow) {
      globalShortcut.unregisterAll(); // Clean up shortcuts on app quit
      mainWindow.removeAllListeners('close');
      app.quit();
    }
    return true;
  } catch (error) {
    console.error(error);
    throw error;
  }
});

ipcMain.handle('restart-program', async () => {
  try {
    app.isQuiting = true;
    globalShortcut.unregisterAll();
    if (tray) {
      tray.destroy();
      tray = null;
    }

    for (const win of BrowserWindow.getAllWindows()) {
      win.removeAllListeners('close');
    }

    app.releaseSingleInstanceLock();

    if (process.platform === 'darwin' && app.isPackaged) {
      const appBundlePath = path.resolve(process.execPath, '..', '..', '..');
      const relaunchScript = `sleep 1; open -n ${JSON.stringify(appBundlePath)}`;
      const child = spawn('/bin/sh', ['-c', relaunchScript], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();

      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.close();
        }
      }
      app.exit(0);
      return true;
    }

    setImmediate(() => {
      app.relaunch({
        execPath: process.execPath,
      });
      app.exit(0);
    });

    for (const win of BrowserWindow.getAllWindows()) {
      if (!win.isDestroyed()) {
        win.close();
      }
    }

    return true;
  } catch (error) {
    console.error(error);
    throw error;
  }
});

ipcMain.on('settings:open', (event, initData) => {
  console.log('Opening Settings Window..');
  try {
    let win = new BrowserWindow({
      width: 800,
      height: 750,
      icon: CustomIcon, //path.join(__dirname, 'images/ED_TripleElite.ico'),
      backgroundColor: '#1F1F1F',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: true,
        webSecurity: false,
        sandbox: false, // Asegura que el contenido no esté limitado dentro de Electron
        allowRunningInsecureContent: false
      }
    })

    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/src/SettingsWindow/settings.html`);
      win.webContents.openDevTools( { mode: 'detach'});
    } else {
      const settingsPath = path.join(process.resourcesPath, 'settings_window', 'settings.html');
      win.loadFile(settingsPath);
      //win.webContents.openDevTools( { mode: 'detach'});
    }


    win.webContents.once('did-finish-load', async () => {
      win.webContents.send('settings:init-data', initData)

      // Wait for Vue to render the settings form, then size the window to the
      // actual content so the default General Settings tab does not start with
      // a nearly-unnecessary scrollbar.
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        const contentHeight = await win.webContents.executeJavaScript(`
          Math.ceil(document.querySelector('#app')?.getBoundingClientRect().bottom ||
            Math.max(document.body.scrollHeight, document.documentElement.scrollHeight))
        `);
        const display = screen.getDisplayMatching(win.getBounds());
        const maxHeight = Math.max(600, display.workAreaSize.height - 80);
        const settingsHeight = Math.min(contentHeight, maxHeight);
        win.setContentSize(800, settingsHeight);
      } catch (error) {
        console.warn('Unable to fit Settings window to content:', error.message);
      }
      win.show();
    })
    win.on('closed', () => {
      event.sender.send('settings:closed', { ok: true })
    })
  } catch (error) {
    console.error(error)
  }
});
ipcMain.on('settings:close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win) {
    win.close()
  }
})

ipcMain.on('event:forward', (event, { channel, payload }) => {
  // reenviar a todas las ventanas abiertas
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.webContents.id !== event.sender.id) {
      win.webContents.send(channel, payload)
    }
  }
});

ipcMain.on('ui-scale-changed', (event, value) => {
  const { screen } = require('electron');
  const { size, scaleFactor: systemScale } = screen.getPrimaryDisplay();

  let finalScale;
  if (value && value > 0) {
    finalScale = value;
  } else {
    finalScale = systemScale;
    if (size.width >= 3840) {
      finalScale = Math.max(finalScale, 1.5);
    }
  }

  // Aplica a todas las ventanas abiertas
  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.setZoomFactor(finalScale);
  });
});



// #endregion
