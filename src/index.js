import { app, BrowserWindow, ipcMain } from "electron";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import { enableLiveReload } from "electron-compile";

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let lastPlayedWindow;

const isDevMode = process.execPath.match(/[\\/]electron/);

//if (isDevMode) enableLiveReload();

const createWindow = async () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			devTools: true
		}
	});

	// and load the index.html of the app.
	mainWindow.loadURL(`file://${__dirname}/index.html`);

	// Open the DevTools.
	if (isDevMode) {
		//await installExtension(VUEJS_DEVTOOLS);
		//mainWindow.webContents.openDevTools();
	}
	mainWindow.setMenuBarVisibility(true);

	// Emitted when the window is closed.
	mainWindow.on("closed", () => {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
};

function createLastPlayedWindow() {
	lastPlayedWindow = new BrowserWindow({ width: 800, height: 600, show: false });
	lastPlayedWindow.on("closed", () => {
		lastPlayedWindow = null;
	});

	lastPlayedWindow.loadURL("https://steamcommunity.com/profiles/PUTYOURIDHERE/games/?tab=all&sort=name");
	lastPlayedWindow.webContents.on("dom-ready", () => {
		lastPlayedWindow.webContents.executeJavaScript(`
		const {ipcRenderer} = require('electron');

		ipcRenderer.on('gamesScrapeRequest', (event, arg) => {
			console.log("Scrape request received, sending rgGames response.");
			ipcRenderer.send('gamesScrapeResponse', rgGames);
			console.log(rgGames);
		});
		`);
	});
}

function closeLastPlayedWindow() {
	lastPlayedWindow.close();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
	// On OS X it is common for applications and their menu bar
	// to stay active until the user quits explicitly with Cmd + Q
	if (process.platform !== "darwin") {
		app.quit();
		setTimeout(() => { app.exit(); }, 10000);
	}
});

app.on("activate", () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (mainWindow === null) {
		createWindow();
	}
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
ipcMain.on("gamesScrapeRequest", (event, arg) => {
	console.log("Scrape request received, creating the LastPlayed window.");
	createLastPlayedWindow();
	lastPlayedWindow.webContents.on("dom-ready", () => {
		console.log("LastPlayed window finished loading, sending scrape request.");
		lastPlayedWindow.webContents.send("gamesScrapeRequest", arg);
	});
});

ipcMain.on("gamesScrapeResponse", (event, arg) => {
	// console.log(arg)  // prints "ping"
	// event.sender.send('asynchronous-reply', 'pong')
	console.log("Scrape response received, sending along to main window.");
	mainWindow.webContents.send("gamesScrapeResponse", arg);
	console.log("Closing LastPlayed window");
	closeLastPlayedWindow();
});