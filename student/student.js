// Student interface functionality

let editor;
let userId = null;
let facilitatorId = null;
let currentLanguage = 'javascript';

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameDisplay = document.getElementById('username');
const runBtn = document.getElementById('run-btn');
const outputPanel = document.getElementById('output-panel');
const errorContainer = document.getElementById('error-container');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const clearOutputBtn = document.getElementById('clear-output');
const languageSelect = document.getElementById('language-select');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Monaco Editor
  editor = initEditor('editor-container');
  
  // Setup event listeners
  setupEventListeners();
  
  // Check if user is already logged in
  const savedUserId = localStorage.getItem('userId');
  const savedUsername = localStorage.getItem('username');
  
  if (savedUserId && savedUsername) {
    userId = savedUserId;
    usernameDisplay.textContent = savedUsername;
    loginBtn.textContent = 'Logout';
  } else {
    // Show login modal
    loginModal.classList.add('active');
  }
  
  // Setup message listener
  if (window.api) {
    window.api.onMessage((data) => {
      displayMessage(data.content, 'received');
    });
  }
  
  // Set initial language from localStorage if available
  const savedLanguage = localStorage.getItem('preferredLanguage');
  if (savedLanguage) {
    languageSelect.value = savedLanguage;
    changeLanguage(savedLanguage);
  }
});

// Setup event listeners
function setupEventListeners() {
  // Login button
  loginBtn.addEventListener('click', () => {
    if (userId) {
      // Logout
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      userId = null;
      usernameDisplay.textContent = 'Student';
      loginBtn.textContent = 'Login';
    } else {
      // Show login modal
      loginModal.classList.add('active');
    }
  });
  
  // Login form submission
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById('username-input');
    const passwordInput = document.getElementById('password-input');
    const username = usernameInput.value.trim();
    const password = passwordInput ? passwordInput.value : '';
    
    if (username && password) {
      // In a real app, you would authenticate with a server
      // For now, we'll just generate a random ID
      userId = 'student_' + Date.now();
      localStorage.setItem('userId', userId);
      localStorage.setItem('username', username);
      localStorage.setItem('role', 'student');
      // Optionally store password if needed (not recommended for real apps)
      // localStorage.setItem('password', password);
      
      usernameDisplay.textContent = username;
      loginBtn.textContent = 'Logout';
      loginModal.classList.remove('active');
      
      // Add welcome message
      addWelcomeMessage(username);
      
      // Log this activity
      if (window.api) {
        window.api.logActivity({
          userId: userId,
          type: 'login',
          content: {
            username: username,
            timestamp: new Date().toISOString()
          }
        });
      }
    }
  });
  
  // Run code button
  runBtn.addEventListener('click', () => {
    const code = editor.getValue();
    
    // Log this activity
    if (window.api && userId) {
      window.api.logActivity({
        userId: userId,
        type: 'code_execution',
        content: {
          code: code,
          language: currentLanguage,
          timestamp: new Date().toISOString()
        }
      });
    }
    
    // Check for errors
    const errors = detectErrors(code);
    displayErrors(errors);
    
    // Execute code
    const result = executeCode(code);
    outputPanel.textContent = result.output;
    
    if (!result.success) {
      outputPanel.classList.add('error');
    } else {
      outputPanel.classList.remove('error');
    }
  });
  
  // Clear output button
  if (clearOutputBtn) {
    clearOutputBtn.addEventListener('click', () => {
      outputPanel.textContent = '';
      errorContainer.innerHTML = '';
      outputPanel.classList.remove('error');
    });
  }
  
  // Language selector
  if (languageSelect) {
    languageSelect.addEventListener('change', (e) => {
      const language = e.target.value;
      changeLanguage(language);
      
      // Save preference
      localStorage.setItem('preferredLanguage', language);
      
      // Log this activity
      if (window.api && userId) {
        window.api.logActivity({
          userId: userId,
          type: 'language_change',
          content: {
            language: language,
            timestamp: new Date().toISOString()
          }
        });
      }
    });
  }
  
  // Send message button
  sendBtn.addEventListener('click', sendMessage);
  
  // Send message on Enter key
  messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });
}

// Change editor language
function changeLanguage(language) {
  currentLanguage = language;
  
  // Get current content
  const currentCode = editor.getValue();
  
  // Set new language
  monaco.editor.setModelLanguage(editor.getModel(), language);
  
  // Provide language-specific starter code if the editor is empty
  if (!currentCode || currentCode === '// Start coding here\n\n') {
    let starterCode = '';
    
    switch (language) {
      case 'javascript':
        starterCode = '// JavaScript code\nconsole.log("Hello, world!");\n';
        break;
      case 'python':
        starterCode = '# Python code\nprint("Hello, world!")\n';
        break;
      case 'java':
        starterCode = '// Java code\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, world!");\n    }\n}\n';
        break;
      case 'csharp':
        starterCode = '// C# code\nusing System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, world!");\n    }\n}\n';
        break;
      default:
        starterCode = '// Start coding here\n\n';
    }
    
    editor.setValue(starterCode);
  }
}

// Send a message to the facilitator
function sendMessage() {
  const message = messageInput.value.trim();
  
  if (message && userId) {
    // Display the message in the chat
    displayMessage(message, 'sent');
    
    // Clear the input
    messageInput.value = '';
    
    // Send the message via IPC
    if (window.api) {
      window.api.sendMessage({
        senderId: userId,
        senderName: localStorage.getItem('username') || 'Student',
        senderRole: 'student',
        receiverRole: 'facilitator',
        receiverId: facilitatorId, // This might be null if no specific facilitator
        content: message
      });
    }
  }
}

// Display a message in the chat
function displayMessage(message, type) {
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', type);
  messageElement.textContent = message;
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Add a personalized welcome message
function addWelcomeMessage(username) {
  // Remove existing welcome message if any
  const existingWelcome = document.querySelector('.welcome-message');
  if (existingWelcome) {
    existingWelcome.remove();
  }
  
  // Create a new personalized welcome message
  const welcomeMessage = document.createElement('div');
  welcomeMessage.classList.add('welcome-message');
  welcomeMessage.innerHTML = `
    <div class="welcome-icon">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
      </svg>
    </div>
    <div class="welcome-text">
      <h3>Welcome, ${username}!</h3>
      <p>Need help with your code? Chat with a facilitator here. They can see your code in real-time and help you solve problems.</p>
    </div>
  `;
  
  chatMessages.prepend(welcomeMessage);
}

// Display errors in the error container
function displayErrors(errors) {
  errorContainer.innerHTML = '';
  
  if (errors.length === 0) {
    return;
  }
  
  const errorList = document.createElement('ul');
  
  errors.forEach(error => {
    const errorItem = document.createElement('li');
    errorItem.textContent = error.line ? `Line ${error.line}: ${error.message}` : error.message;
    errorList.appendChild(errorItem);
  });
  
  errorContainer.appendChild(errorList);
}
