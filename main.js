'use strict';

const {app, BrowserWindow} = require('electron')
const fs = require('fs')
const path = require('path')

// Portfolio Page
const SBI_BASE_URL = [
  'https://site2.sbisec.co.jp/ETGate/?',
  '_ControlID=WPLETpfR001Control&_PageID=DefaultPID&',
  '_DataStoreID=DSWPLETpfR001Control&_ActionID=DefaultAID&getFlg=on'
].join('')

app.on('ready', () => {
  const window = new BrowserWindow({
    width: 1200,
    height: 600,
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false
    }
  })

  window.loadURL(SBI_BASE_URL)

  // This application shows important messages on the console
  window.webContents.openDevTools()

  // Please set the ID and Password if you want to skip authorization
  // window.webContents.executeJavaScript(`document.querySelector('[name="user_id"]').value = 'ID'`)
  // window.webContents.executeJavaScript(`document.querySelector('[name="user_password"]').value = 'PASSWORD'`)

  window.webContents.on('dom-ready', () => {
    const lib = path.resolve(path.join(__dirname, 'lib/extension.js'))
    window.webContents.executeJavaScript(fs.readFileSync(lib, { encoding: 'utf8' }))

    const jszip = path.resolve(path.join(__dirname, 'lib/jszip.min.js'))
    window.webContents.executeJavaScript(fs.readFileSync(jszip, { encoding: 'utf8' }))

    const scrape = path.resolve(path.join(__dirname, 'scrape.js'))
    window.webContents.executeJavaScript(fs.readFileSync(scrape, { encoding: 'utf8' }))
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
