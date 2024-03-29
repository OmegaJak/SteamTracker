import { app, BrowserWindow, ipcMain } from "electron";
import installExtension, { VUEJS_DEVTOOLS } from "electron-devtools-installer";
import { enableLiveReload } from "electron-compile";
const path = require('path')

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

const isDevMode = process.execPath.match(/[\\/]electron/);

//if (isDevMode) enableLiveReload();

const createWindow = async () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1076,
		height: 771,
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

	var test = require("./menu/mainmenu");
	test.mainWindow = mainWindow;
};

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