const { contextBridge, ipcRenderer } = require('electron')

// TODO: Once on Electron ~9, use contextBridge for security
// contextBridge.exposeInMainWorld('electronAPI', {
window.electronAPI = {
	sendWindowReady: () => ipcRenderer.send("lastPlayedWindowReady"),
	onGamesScrapeRequest: (callback) => ipcRenderer.on('gamesScrapeRequest', callback),
	returnGames: (games) => ipcRenderer.send('gamesScrapeResponse', games)
}