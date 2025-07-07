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

// Simple code execution (simulation)
// The custom detectErrors function has been removed.
// Monaco's own diagnostics should be used instead.
function executeCode(code, language = 'javascript') { // Added language parameter
  // Create a safe environment for code execution
  try {
    if (language !== 'javascript') {
      return {
        success: false, // Or true, depending on how we want to frame "syntax check"
        output: `Direct execution for ${language} is not yet supported. Syntax and errors are checked by the editor.`
      };
    }

    // Proceed with JavaScript execution
    // Error checking will now primarily be handled by Monaco's diagnostics
    // directly in the student/facilitator UI logic before calling executeCode,
    // or executeCode can be called and handle runtime errors.
    // For now, we'll remove the direct call to the custom detectErrors here.
    // const errors = detectErrors(code); // Removed
    // if (errors.length > 0) { // Removed
    //   return { // Removed
    //     success: false, // Removed
    //    output: 'Error: ' + errors.map(e => e.message).join('\n') // Removed as errors is no longer defined here
    //  }; // Removed
    // } // Removed
    
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
