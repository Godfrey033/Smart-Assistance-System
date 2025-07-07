// Import required modules
const electron = require('electron');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

// Extract required components from electron
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const ipcMain = electron.ipcMain;

// Keep a global reference of the window object
let mainWindow = null;
let db = null;

// Initialize the database
function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'smartassistance.db');
  try {
    db = new Database(dbPath); // { verbose: console.log } can be added for debugging
    console.log('Connected to the database');

    // Create tables if they don't exist
    // better-sqlite3 runs statements sequentially by default
    db.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL,
      receiver_id TEXT,
      receiver_role TEXT,
      content TEXT NOT NULL,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users (id)
    )`);

  } catch (err) {
    console.error('Database connection error:', err);
  }
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Open DevTools
  mainWindow.webContents.openDevTools();

  // Emitted when the window is closed
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.on('ready', () => {
  initializeDatabase();
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function() {
  if (mainWindow === null) {
    createWindow();
  }
});

// Handle window navigation
ipcMain.on('open-window', (event, role) => {
  if (role === 'student') {
    let studentWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    
    studentWindow.loadFile('student/index.html');
    
    studentWindow.on('closed', function() {
      studentWindow = null;
    });
    
    if (mainWindow) mainWindow.close();
  } 
  else if (role === 'facilitator') {
    let facilitatorWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      }
    });
    
    facilitatorWindow.loadFile('facilitator/index.html');
    
    facilitatorWindow.on('closed', function() {
      facilitatorWindow = null;
    });
    
    if (mainWindow) mainWindow.close();
  }
});

// Handle student activity
ipcMain.on('student-activity', (event, data) => {
  if (!db) {
    console.error('Database not initialized during student-activity');
    return;
  }
  // Save to database
  if (data.userId) {
    try {
      // Check if user exists
      const userExistsStmt = db.prepare('SELECT id FROM users WHERE id = ?');
      const row = userExistsStmt.get(data.userId);
      
      if (!row && data.type === 'login') {
        // Add new user
        const insertUserStmt = db.prepare('INSERT INTO users (id, username, role) VALUES (?, ?, ?)');
        insertUserStmt.run(data.userId, data.content.username, 'student');
      }
      
      // Log activity
      const insertActivityStmt = db.prepare('INSERT INTO activities (user_id, type, content) VALUES (?, ?, ?)');
      insertActivityStmt.run(data.userId, data.type, JSON.stringify(data.content));
      
      // Broadcast to facilitators
      BrowserWindow.getAllWindows().forEach(window => {
        window.webContents.send('student-update', data);
      });
    } catch (err) {
      console.error('Error processing student activity:', err);
    }
  }
});

// Handle messaging
ipcMain.on('send-message', (event, data) => {
  if (!db) {
    console.error('Database not initialized during send-message');
    return;
  }
  // Save to database
  try {
    const insertMsgStmt = db.prepare('INSERT INTO messages (sender_id, receiver_id, receiver_role, content) VALUES (?, ?, ?, ?)');
    insertMsgStmt.run(data.senderId, data.receiverId, data.receiverRole, data.content);
  } catch (err) {
    console.error('Error saving message to database:', err);
  }
  
  // Broadcast to appropriate receivers
  BrowserWindow.getAllWindows().forEach(window => {
    window.webContents.send('new-message', data);
  });
});

// Handle get students request
ipcMain.handle('get-students', async (event) => {
  if (!db) {
    console.error('Database not initialized during get-students');
    return [];
  }
  try {
    const stmt = db.prepare('SELECT * FROM users WHERE role = ?');
    const rows = stmt.all('student');
    return rows;
  } catch (err) {
    console.error('Error fetching students:', err);
    return []; // Return an empty array or throw error as appropriate
  }
});
