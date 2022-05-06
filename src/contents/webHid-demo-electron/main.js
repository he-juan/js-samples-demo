// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const path = require('path')

let mainWindow;

async function createMainWindow() {
	mainWindow = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
			contextIsolation: false
		}
	})
	
	// and load the index.html of the app.
	mainWindow.loadFile('./index.html')
	
	// Open the DevTools.
	// mainWindow.webContents.openDevTools()
	
	return mainWindow
}

app.whenReady().then(() => {
	createMainWindow()
})
