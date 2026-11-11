const { app, BrowserWindow, BrowserView, globalShortcut, session, ipcMain } = require('electron');
const path = require('node:path');

// Swap kiosk destinations here without changing the tab/window logic.
const CONFIG = [
  {
    label: 'Waiting Room',
    url: 'https://waiting-room.jbeyer.workers.dev/intake',
  },
  {
    label: 'Appointments',
    url: 'https://backoffice.timetap.com/backoffice/app/login',
  },
  {
    label: 'Email',
    url: 'https://outlook.cloud.microsoft/mail/0/',
    allowedDomains: [
      'gmail.com',
    ],
  },
  {
    label: 'Camera',
    url: 'https://amcrestcloud.com',
  },
];

let mainWindow;
let views = [];
let activeTab = 0;
const BAR_HEIGHT = 40;

function applyViewLockdown(view, tabConfig) {
  const contents = view.webContents;
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  contents.on('before-input-event', blockShortcuts);
  contents.on('context-menu', (event) => event.preventDefault());
  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (isMainFrame) console.error(`[${tabConfig.label}] load failed (${errorCode}): ${errorDescription} - ${validatedURL}`);
  });

  // Optional clipboard lockdown; uncomment to disable copy/paste in the kiosk.
  // contents.on('before-input-event', (event, input) => {
  //   if ((input.control || input.meta) && ['c', 'v', 'x'].includes(input.key.toLowerCase())) event.preventDefault();
  // });
}

function setViewBounds() {
  const { width, height } = mainWindow.getContentBounds();
  views.forEach((view) => view.setBounds({ x: 0, y: BAR_HEIGHT, width, height: Math.max(0, height - BAR_HEIGHT) }));
}

function showTab(index) {
  if (!mainWindow || !views[index]) return;
  if (activeTab !== index && views[activeTab]) mainWindow.removeBrowserView(views[activeTab]);
  activeTab = index;
  mainWindow.addBrowserView(views[index]);
  setViewBounds();
  mainWindow.webContents.send('active-tab-changed', activeTab);
}

function blockShortcuts(event, input) {
  const key = input.key.toLowerCase();
  const modified = input.control || input.meta;
  const blocked = (modified && ['n', 't', 'w', 'r'].includes(key)) ||
    (modified && input.shift && key === 'i') ||
    key === 'f12' || (input.alt && ['left', 'right'].includes(key));
  if (blocked) event.preventDefault();
}

ipcMain.handle('get-tabs', () => CONFIG.map(({ label }) => label));
ipcMain.on('select-tab', (_event, index) => {
  if (Number.isInteger(index) && index >= 0 && index < CONFIG.length) showTab(index);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1920,
    maxWidth: 1920,
    minHeight: 1080,
    maxHeight: 1080,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: true,
    title: 'Intake Desk',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.on('resize', setViewBounds);
  mainWindow.webContents.on('before-input-event', blockShortcuts);

  views = CONFIG.map((tabConfig) => {
    const view = new BrowserView({
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        devTools: false,
        // BrowserViews share Electron's persistent default session, so login
        // cookies and local storage remain available across tabs and restarts.
      },
    });
    applyViewLockdown(view, tabConfig);
    view.webContents.loadURL(tabConfig.url);
    return view;
  });

  mainWindow.webContents.on('dom-ready', () => showTab(0));
}

app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  createWindow();
  globalShortcut.register('CommandOrControl+Shift+I', () => {});
  globalShortcut.register('F12', () => {});
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

module.exports = { CONFIG };
