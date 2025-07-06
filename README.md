# Smart Assistance System

A desktop application for software programming learning support, built with Electron.

## Features

- **Role-Based Interface**: Choose between Student and Facilitator roles
- **Student Features**:
  - Code editor with syntax highlighting
  - Real-time code execution and error detection
  - Chat with facilitators for assistance
- **Facilitator Features**:
  - Monitor active students
  - View student code in real-time
  - Analyze code errors
  - Provide assistance through chat

## Technology Stack

- Electron
- Monaco Editor (VS Code's editor)
- SQLite for local data storage
- Socket.io for real-time communication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the application:
   ```
   npm start
   ```

## Usage

1. Launch the application
2. Choose your role (Student or Facilitator)
3. Log in with a username
4. Start coding (Student) or monitoring (Facilitator)

## Application Structure

- `main.js`: Main Electron process
- `preload.js`: Preload script for secure IPC communication
- `index.html`: Main entry point UI
- `student/`: Student interface files
- `facilitator/`: Facilitator interface files
- `shared/`: Shared resources (CSS, JS utilities)

## Database Schema

The application uses SQLite with the following tables:

- **users**: Stores user information
- **activities**: Logs user activities (coding, running code, etc.)
- **messages**: Stores chat messages between students and facilitators

## Development

To run the application in development mode:

```
npm install
npm start
```

## License

MIT
