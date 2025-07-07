// Facilitator interface functionality

let editor;
let userId = null;
let selectedStudentId = null;
let students = {};
let messageCount = 0;
let activityCount = 0;

// DOM Elements
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameDisplay = document.getElementById('username');
const studentsList = document.getElementById('students-list');
const selectedStudentDisplay = document.getElementById('selected-student');
const errorList = document.getElementById('error-list');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const refreshBtn = document.getElementById('refresh-btn');
const studentSearch = document.getElementById('student-search');
const languageSelector = document.getElementById('language-selector');
const helpBtn = document.getElementById('help-btn');
const runAnalysisBtn = document.getElementById('run-analysis');
const activityCountEl = document.getElementById('activity-count');
const codeLinesEl = document.getElementById('code-lines');
const messageCountEl = document.getElementById('message-count');


// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Monaco Editor (read-only for viewing student code)
  editor = initEditor('code-display', true);
  
  // Setup event listeners
  setupEventListeners();
  
  // Check if user is already logged in
  const savedUserId = localStorage.getItem('userId');
  const savedUsername = localStorage.getItem('username');
  
  if (savedUserId && savedUsername) {
    userId = savedUserId;
    usernameDisplay.textContent = savedUsername;
    loginBtn.textContent = 'Logout';
    
    // Load students
    loadStudents();
  } else {
    // Show login modal
    loginModal.classList.add('active');
  }
  
  // Setup message and student update listeners
  if (window.api) {
    window.api.onMessage((data) => {
      if (data.receiverId === userId || !data.receiverId) {
        if (data.senderId === selectedStudentId) {
          displayMessage(data.content, 'received');
          
          // Update message count
          messageCount++;
          updateAnalytics();
        }
        
        // Update unread message indicator for this student
        updateStudentStatus(data.senderId, 'message');
      }
    });
    
    window.api.onStudentUpdate((data) => {
      // Update student data
      if (!students[data.userId]) {
        // New student
        students[data.userId] = {
          id: data.userId,
          name: data.content.username || 'Unknown Student',
          code: data.type === 'code_change' ? data.content.code : '',
          language: data.content.language || 'javascript',
          lastActivity: new Date(),
          status: 'active',
          activityCount: 1,
          codeLines: data.type === 'code_change' ? countCodeLines(data.content.code) : 0
        };
      } else {
        // Update existing student
        if (data.type === 'code_change') {
          students[data.userId].code = data.content.code;
          students[data.userId].codeLines = countCodeLines(data.content.code);
          students[data.userId].activityCount++;
        }
        if (data.content.language) {
          students[data.userId].language = data.content.language;
        }
        students[data.userId].lastActivity = new Date();
      }
      
      // Update UI
      updateStudentsList();
      
      // If this is the selected student, update the code view and analytics
      if (data.userId === selectedStudentId) {
        if (data.type === 'code_change') {
          updateCodeView(data.content.code, students[data.userId].language);
          
          // Update activity count
          activityCount++;
          updateAnalytics();
        }
        
        // Update language selector
        if (languageSelector) {
          languageSelector.value = students[data.userId].language || 'javascript';
        }
      }
    });
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
      usernameDisplay.textContent = 'Facilitator';
      loginBtn.textContent = 'Login';
      
      // Clear students
      students = {};
      updateStudentsList();
      
      // Reset UI
      resetUI();
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
    
    if (username) {
      // In a real app, you would authenticate with a server
      // For now, we'll just generate a random ID
      userId = 'facilitator_' + Date.now();
      localStorage.setItem('userId', userId);
      localStorage.setItem('username', username);
      localStorage.setItem('role', 'facilitator');
      // Optionally store password if needed (not recommended for real apps)
      // localStorage.setItem('password', password);
      
      usernameDisplay.textContent = username;
      loginBtn.textContent = 'Logout';
      loginModal.classList.remove('active');
      
      // Load students
      loadStudents();
    }
  });
  
  // Refresh button
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      loadStudents();
    });
  }
  
  // Student search
  if (studentSearch) {
    studentSearch.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      filterStudents(searchTerm);
    });
  }
  
  // Language selector
  if (languageSelector) {
    languageSelector.addEventListener('change', (e) => {
      if (selectedStudentId && students[selectedStudentId]) {
        const language = e.target.value;
        students[selectedStudentId].language = language;
        
        // Update code view with new language
        updateCodeView(students[selectedStudentId].code, language);
        
        // In a real app, you might want to notify the student about the language change
        if (window.api) {
          window.api.sendMessage({
            senderId: userId,
            senderName: localStorage.getItem('username') || 'Facilitator',
            senderRole: 'facilitator',
            receiverRole: 'student',
            receiverId: selectedStudentId,
            content: `Language changed to ${language} by facilitator`
          });
        }
      }
    });
  }
  
  // Help button (Share Screen)
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      if (selectedStudentId) {
        // In a real app, this would initiate a screen sharing session
        alert('Screen sharing would be initiated with ' + students[selectedStudentId].name);
      } else {
        alert('Please select a student first');
      }
    });
  }
  
  // Run Analysis button
  if (runAnalysisBtn) {
    runAnalysisBtn.addEventListener('click', () => {
      if (selectedStudentId && students[selectedStudentId] && editor) {
        const code = students[selectedStudentId].code; // or editor.getValue() if it's guaranteed to be current

        // Get errors from Monaco editor for the facilitator's view
        const model = editor.getModel();
        if (model) {
          // Using a generic filter here as the facilitator's editor model might not have a simple owner string
          const markers = monaco.editor.getModelMarkers({});
          // Filter for markers specifically related to the current student's code model if possible,
          // for now, this will get all markers, which should be fine if only one model is active.
          // Ideally, filter by model.uri if we can ensure it matches.
          displayErrors(markers.filter(m => m.resource.toString() === model.uri.toString()));
        }
        
        // Add additional advanced analysis
        const advancedAnalysis = analyzeCodeQuality(code);
        if (advancedAnalysis.length > 0) {
          // displayAdvancedAnalysis will append to the existing error list
          displayAdvancedAnalysis(advancedAnalysis);
        } else if (errorList.querySelector('ul') === null) {
            // If Monaco had no errors and advanced analysis has nothing, show a message.
            errorList.innerHTML = `
              <div class="empty-state small">
                <p>No errors or suggestions found.</p>
              </div>
            `;
        }
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

// Load students from the database
async function loadStudents() {
  if (window.api) {
    try {
      const studentList = await window.api.getStudents();
      
      // Keep existing student data if available
      const existingStudents = { ...students };
      students = {};
      
      studentList.forEach(student => {
        if (student.role === 'student') {
          students[student.id] = {
            id: student.id,
            name: student.username,
            code: existingStudents[student.id]?.code || '',
            language: existingStudents[student.id]?.language || 'javascript',
            lastActivity: new Date(student.created_at),
            status: existingStudents[student.id]?.status || 'inactive',
            activityCount: existingStudents[student.id]?.activityCount || 0,
            codeLines: existingStudents[student.id]?.codeLines || 0
          };
        }
      });
      
      updateStudentsList();
      
      // If there was a selected student, try to reselect them
      if (selectedStudentId && students[selectedStudentId]) {
        selectStudent(selectedStudentId);
      }
    } catch (error) {
      console.error('Failed to load students:', error);
    }
  }
}



// Filter students based on search term
function filterStudents(searchTerm) {
  const studentItems = studentsList.querySelectorAll('.student-item');
  
  if (!searchTerm) {
    // Show all students
    studentItems.forEach(item => {
      item.style.display = 'flex';
    });
    return;
  }
  
  studentItems.forEach(item => {
    const studentName = item.querySelector('span').textContent.toLowerCase();
    if (studentName.includes(searchTerm)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

// Reset UI to initial state
function resetUI() {
  selectedStudentId = null;
  selectedStudentDisplay.textContent = 'Select a student';
  editor.setValue('// No student selected');
  errorList.innerHTML = `
    <div class="empty-state small">
      <p>No errors detected</p>
    </div>
  `;
  chatMessages.innerHTML = `
    <div class="welcome-message">
      <div class="welcome-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <div class="welcome-text">
        <h3>Select a student to start chatting</h3>
        <p>You'll be able to provide assistance and answer questions in real-time.</p>
      </div>
    </div>
  `;
  messageInput.disabled = true;
  sendBtn.disabled = true;
  
  // Reset analytics
  activityCount = 0;
  messageCount = 0;
  updateAnalytics();
}

// Update the students list in the UI
function updateStudentsList() {
  studentsList.innerHTML = '';
  
  if (Object.keys(students).length === 0) {
    const emptyState = document.createElement('div');
    emptyState.classList.add('empty-state');
    emptyState.innerHTML = `
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <p>No active students</p>
      <p class="empty-hint">Students will appear here when they log in</p>
    `;
    studentsList.appendChild(emptyState);
    return;
  }
  
  // Sort students by activity (most recent first)
  const sortedStudents = Object.values(students).sort((a, b) => {
    return new Date(b.lastActivity) - new Date(a.lastActivity);
  });
  
  sortedStudents.forEach(student => {
    const studentItem = document.createElement('div');
    studentItem.classList.add('student-item');
    if (student.id === selectedStudentId) {
      studentItem.classList.add('active');
    }
    
    const statusIndicator = document.createElement('span');
    statusIndicator.classList.add('student-status');
    
    if (student.status === 'active') {
      statusIndicator.classList.add('status-active');
    } else if (student.status === 'error') {
      statusIndicator.classList.add('status-error');
    } else if (student.status === 'message') {
      statusIndicator.classList.add('status-message');
    } else {
      statusIndicator.classList.add('status-inactive');
    }
    
    const nameSpan = document.createElement('span');
    nameSpan.textContent = student.name;
    
    // Add last activity time
    const lastActive = document.createElement('span');
    lastActive.classList.add('last-active');
    lastActive.textContent = formatTimeAgo(student.lastActivity);
    
    studentItem.appendChild(statusIndicator);
    studentItem.appendChild(nameSpan);
    studentItem.appendChild(lastActive);
    
    // Add click event to select this student
    studentItem.addEventListener('click', () => {
      selectStudent(student.id);
    });
    
    studentsList.appendChild(studentItem);
  });
  
  // Apply any current search filter
  if (studentSearch && studentSearch.value.trim()) {
    filterStudents(studentSearch.value.toLowerCase().trim());
  }
}

// Select a student to view
function selectStudent(studentId) {
  selectedStudentId = studentId;
  const student = students[studentId];
  
  if (student) {
    selectedStudentDisplay.textContent = student.name;
    
    // Update code view
    updateCodeView(student.code, student.language);
    
    // Update language selector
    if (languageSelector) {
      languageSelector.value = student.language || 'javascript';
    }
    
    // Clear chat messages
    chatMessages.innerHTML = `
      <div class="welcome-message">
        <div class="welcome-icon">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
        </div>
        <div class="welcome-text">
          <h3>Chat with ${student.name}</h3>
          <p>You can now provide assistance and answer questions in real-time.</p>
        </div>
      </div>
    `;
    
    // Enable chat
    messageInput.disabled = false;
    sendBtn.disabled = false;
    
    // Update student list UI to show selection
    const studentItems = studentsList.querySelectorAll('.student-item');
    studentItems.forEach(item => {
      item.classList.remove('active');
    });
    
    const selectedItem = Array.from(studentItems).find(item => 
      item.querySelector('span').textContent === student.name
    );
    if (selectedItem) {
      selectedItem.classList.add('active');
    }
    
    // Reset student status (clear unread messages)
    if (student.status === 'message') {
      student.status = 'active';
      updateStudentsList();
    }
    
    // Update analytics
    activityCount = student.activityCount || 0;
    updateAnalytics();
  }
}

// Update the code view with student code
function updateCodeView(code, language = 'javascript') {
  if (editor) {
    editor.setValue(code || '// No code available');
    
    // Set language
    if (language) {
      monaco.editor.setModelLanguage(editor.getModel(), language);
    }
    
    // Analyze code for errors using Monaco markers
    const model = editor.getModel();
    if (model) {
      // As in runAnalysisBtn, using a generic filter for now.
      const markers = monaco.editor.getModelMarkers({});
      displayErrors(markers.filter(m => m.resource.toString() === model.uri.toString()));
    }
    
    // Update code lines count
    if (selectedStudentId && students[selectedStudentId]) {
      students[selectedStudentId].codeLines = countCodeLines(code);
      updateAnalytics();
    }
  }
}

// Display errors in the error list
function displayErrors(markers) {
  errorList.innerHTML = ''; // Clear previous Monaco errors, but not necessarily advanced analysis titles
  
  const significantMarkers = markers.filter(marker => marker.severity === monaco.MarkerSeverity.Error || marker.severity === monaco.MarkerSeverity.Warning);

  if (significantMarkers.length === 0) {
    // Don't show "No errors detected" here if advanced analysis might add something.
    // The runAnalysisBtn logic will handle the empty state if nothing is found at all.
    // If called from updateCodeView, and no errors, it will just be blank, which is fine.
    return;
  }
  
  const errorListElement = document.createElement('ul');
  errorListElement.classList.add('monaco-error-list'); // For specific styling
  
  significantMarkers.forEach(marker => {
    const errorItem = document.createElement('li');
    let severityClass = '';
    let severityText = '';

    if (marker.severity === monaco.MarkerSeverity.Error) {
      severityClass = 'error';
      severityText = 'Error';
    } else if (marker.severity === monaco.MarkerSeverity.Warning) {
      severityClass = 'warning';
      severityText = 'Warning';
    }
    // todo: Add Hint and Info if desired from monaco.MarkerSeverity.Hint and monaco.MarkerSeverity.Info

    errorItem.classList.add(severityClass);
    errorItem.textContent = `Line ${marker.startLineNumber}, Col ${marker.startColumn}: ${marker.message} [${severityText}]`;
    errorListElement.appendChild(errorItem);
  });
  
  // Prepend Monaco errors to keep them at the top if advanced analysis is also shown
  errorList.prepend(errorListElement);
}

// Display advanced code analysis
function displayAdvancedAnalysis(analysis) {
  let advancedAnalysisList = errorList.querySelector('.advanced-analysis-list');
  if (!advancedAnalysisList) {
    advancedAnalysisList = document.createElement('ul');
    advancedAnalysisList.classList.add('advanced-analysis-list');
    errorList.appendChild(advancedAnalysisList); // Append this list after any Monaco errors
  }
  
  // Clear previous advanced analysis items only
  advancedAnalysisList.innerHTML = '';

  // Add a separator/title for this section if there are items
  if (analysis.length > 0) {
    const titleItem = document.createElement('li');
    titleItem.textContent = 'Code Quality Suggestions:';
    titleItem.style.fontWeight = 'bold';
    titleItem.style.marginTop = '10px';
    titleItem.style.listStyleType = 'none'; // No bullet for the title
    advancedAnalysisList.appendChild(titleItem);
  }
  
  // Add analysis items
  analysis.forEach(item => {
    const analysisItem = document.createElement('li');
    analysisItem.textContent = item.message;
    // Styling for these items can be done via CSS using the .advanced-analysis-list class
    // For example: .advanced-analysis-list li { background-color: ... }
    advancedAnalysisList.appendChild(analysisItem);
  });
}

// Send a message to the selected student
function sendMessage() {
  const message = messageInput.value.trim();
  
  if (message && userId && selectedStudentId) {
    // Display the message in the chat
    displayMessage(message, 'sent');
    
    // Clear the input
    messageInput.value = '';
    
    // Send the message via IPC
    if (window.api) {
      window.api.sendMessage({
        senderId: userId,
        senderName: localStorage.getItem('username') || 'Facilitator',
        senderRole: 'facilitator',
        receiverRole: 'student',
        receiverId: selectedStudentId,
        content: message
      });
    }
    
    // Update message count
    messageCount++;
    updateAnalytics();
  }
}

// Display a message in the chat
function displayMessage(message, type) {
  // Remove welcome message if present
  const welcomeMessage = chatMessages.querySelector('.welcome-message');
  if (welcomeMessage) {
    chatMessages.removeChild(welcomeMessage);
  }
  
  const messageElement = document.createElement('div');
  messageElement.classList.add('message', type);
  messageElement.textContent = message;
  
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update student status (active, error, message)
function updateStudentStatus(studentId, status) {
  if (students[studentId]) {
    students[studentId].status = status;
    updateStudentsList();
  }
}

// Count lines of code
function countCodeLines(code) {
  if (!code) return 0;
  
  // Split by newline and filter out empty lines
  const lines = code.split('\n').filter(line => line.trim() !== '');
  return lines.length;
}

// Format time ago (e.g. "2m ago", "3h ago")
function formatTimeAgo(date) {
  if (!date) return '';
  
  const now = new Date();
  const diff = Math.floor((now - new Date(date)) / 1000); // seconds
  
  if (diff < 60) return 'Just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// Update analytics display
function updateAnalytics() {
  if (activityCountEl) {
    activityCountEl.textContent = activityCount;
  }
  
  if (codeLinesEl && selectedStudentId && students[selectedStudentId]) {
    codeLinesEl.textContent = students[selectedStudentId].codeLines || 0;
  }
  
  if (messageCountEl) {
    messageCountEl.textContent = messageCount;
  }
}

// Analyze code quality (beyond basic error detection)
function analyzeCodeQuality(code) {
  const suggestions = [];
  
  // Skip if no code
  if (!code || code.trim() === '') return suggestions;
  
  const lines = code.split('\n');
  
  // Check for very long lines
  lines.forEach((line, index) => {
    if (line.length > 80) {
      suggestions.push({
        line: index + 1,
        message: `Line ${index + 1} is too long (${line.length} chars). Consider breaking it up.`
      });
    }
  });
  
  // Check for long functions (very basic detection)
  let functionStartLine = -1;
  let functionLength = 0;
  let inFunction = false;
  let bracketCount = 0;
  
  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Very simple function detection
    if (trimmedLine.includes('function') && trimmedLine.includes('{') && !inFunction) {
      inFunction = true;
      functionStartLine = index + 1;
      bracketCount = 1;
      functionLength = 1;
    } else if (inFunction) {
      functionLength++;
      
      // Count brackets to detect function end
      if (trimmedLine.includes('{')) bracketCount++;
      if (trimmedLine.includes('}')) bracketCount--;
      
      if (bracketCount === 0) {
        if (functionLength > 30) {
          suggestions.push({
            line: functionStartLine,
            message: `Function starting at line ${functionStartLine} is too long (${functionLength} lines). Consider breaking it into smaller functions.`
          });
        }
        inFunction = false;
      }
    }
  });
  
  // Check for console.log statements (which might be left in production code)
  let consoleCount = 0;
  lines.forEach((line, index) => {
    if (line.includes('console.log')) {
      consoleCount++;
    }
  });
  
  if (consoleCount > 0) {
    suggestions.push({
      message: `Found ${consoleCount} console.log statements that might need to be removed before production.`
    });
  }
  
  // Check for variable naming (very basic)
  const singleLetterVars = [];
  const varRegex = /\b(var|let|const)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
  
  code.replace(varRegex, (match, keyword, varName) => {
    if (varName.length === 1 && varName !== 'i' && varName !== 'j' && varName !== 'k') {
      singleLetterVars.push(varName);
    }
  });
  
  if (singleLetterVars.length > 0) {
    suggestions.push({
      message: `Found ${singleLetterVars.length} single-letter variable names that could be more descriptive.`
    });
  }
  
  return suggestions;
}
