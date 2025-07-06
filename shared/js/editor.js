// Monaco Editor setup and common functions

// Initialize the Monaco editor
function initEditor(containerId, readOnly = false) {
  // Create a Monaco editor instance
  const editor = monaco.editor.create(document.getElementById(containerId), {
    value: '// Start coding here\n\n',
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    readOnly: readOnly,
    fontSize: 14,
    lineNumbers: 'on',
    renderLineHighlight: 'all',
    formatOnPaste: true,
    formatOnType: true
  });

  // Add event listener for content changes
  editor.onDidChangeModelContent((event) => {
    if (typeof window.api !== 'undefined' && !readOnly) {
      // Log activity if this is a student editor
      window.api.logActivity({
        userId: localStorage.getItem('userId') || 'anonymous',
        type: 'code_change',
        content: {
          code: editor.getValue(),
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  return editor;
}

// Basic syntax error detection
function detectErrors(code) {
  const errors = [];
  
  // Check for missing semicolons
  const lines = code.split('\n');
  lines.forEach((line, index) => {
    // Skip comments and empty lines
    if (line.trim().startsWith('//') || line.trim() === '') return;
    
    // Check if line needs a semicolon but doesn't have one
    if (!line.trim().endsWith(';') && 
        !line.trim().endsWith('{') && 
        !line.trim().endsWith('}') && 
        !line.trim().endsWith(':') &&
        !line.trim().startsWith('if') &&
        !line.trim().startsWith('for') &&
        !line.trim().startsWith('while') &&
        !line.trim().startsWith('function')) {
      errors.push({
        line: index + 1,
        message: 'Missing semicolon at the end of the line'
      });
    }
  });
  
  // Check for unbalanced brackets
  let openBraces = 0;
  let openParens = 0;
  let openBrackets = 0;
  
  for (let i = 0; i < code.length; i++) {
    switch (code[i]) {
      case '{': openBraces++; break;
      case '}': openBraces--; break;
      case '(': openParens++; break;
      case ')': openParens--; break;
      case '[': openBrackets++; break;
      case ']': openBrackets--; break;
    }
    
    if (openBraces < 0) {
      errors.push({ message: 'Unexpected closing brace' });
      openBraces = 0;
    }
    if (openParens < 0) {
      errors.push({ message: 'Unexpected closing parenthesis' });
      openParens = 0;
    }
    if (openBrackets < 0) {
      errors.push({ message: 'Unexpected closing bracket' });
      openBrackets = 0;
    }
  }
  
  if (openBraces > 0) errors.push({ message: 'Unclosed braces' });
  if (openParens > 0) errors.push({ message: 'Unclosed parentheses' });
  if (openBrackets > 0) errors.push({ message: 'Unclosed brackets' });
  
  // Check for potential infinite loops (very basic detection)
  if (code.includes('while (true)') || code.includes('for (;;)')) {
    errors.push({ message: 'Potential infinite loop detected' });
  }
  
  return errors;
}

// Simple code execution (simulation)
function executeCode(code) {
  // Create a safe environment for code execution
  try {
    // First check for errors
    const errors = detectErrors(code);
    if (errors.length > 0) {
      return {
        success: false,
        output: 'Error: ' + errors.map(e => e.message).join('\n')
      };
    }
    
    // For safety, we'll just simulate execution
    // In a real app, you might use a sandboxed environment or a server-side execution
    
    // Simple output capture
    let output = '';
    const mockConsole = {
      log: (...args) => {
        output += args.join(' ') + '\n';
      },
      error: (...args) => {
        output += 'ERROR: ' + args.join(' ') + '\n';
      },
      warn: (...args) => {
        output += 'WARNING: ' + args.join(' ') + '\n';
      }
    };
    
    // Replace console.log with our mock
    const modifiedCode = code.replace(/console\.log/g, 'mockConsole.log')
                             .replace(/console\.error/g, 'mockConsole.error')
                             .replace(/console\.warn/g, 'mockConsole.warn');
    
    // Execute with timeout to prevent infinite loops
    const timeoutId = setTimeout(() => {
      throw new Error('Execution timed out (possible infinite loop)');
    }, 3000);
    
    // Execute the code in a function to avoid global scope pollution
    const fn = new Function('mockConsole', modifiedCode);
    fn(mockConsole);
    
    clearTimeout(timeoutId);
    
    return {
      success: true,
      output: output || 'Code executed successfully with no output.'
    };
  } catch (error) {
    return {
      success: false,
      output: 'Runtime Error: ' + error.message
    };
  }
}
