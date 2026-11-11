const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kiosk', {
  getTabs: () => ipcRenderer.invoke('get-tabs'),
  selectTab: (index) => ipcRenderer.send('select-tab', index),
  onActiveTabChanged: (callback) => ipcRenderer.on('active-tab-changed', (_event, index) => callback(index)),
});
