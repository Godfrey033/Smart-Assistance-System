const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    // Student methods
    logActivity: (data) => {
      ipcRenderer.send('student-activity', data);
    },
    
    // Messaging methods
    sendMessage: (data) => {
      ipcRenderer.send('send-message', data);
    },
    onMessage: (callback) => {
      ipcRenderer.on('new-message', (event, data) => callback(data));
    },
    
    // Facilitator methods
    getStudents: async () => {
      return await ipcRenderer.invoke('get-students');
    },
    onStudentUpdate: (callback) => {
      ipcRenderer.on('student-update', (event, data) => callback(data));
    }
  }
);
