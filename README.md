# Cline - AI Chat Interface

A modern chat interface for interacting with local LM Studio models, built with React and Material-UI.

## Features

- Clean, intuitive chat interface
- Real-time connection status monitoring
- Support for multiple LM Studio models
- Dark theme with modern styling
- Markdown and code block support
- Network diagnostics and server configuration

## Prerequisites

- Node.js (v14 or higher)
- LM Studio running locally
- Python 3.8+ (for backend server)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/BigAlzz/allm.git
cd allm
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

4. Start the backend server:
```bash
python server.py
```

5. Start the frontend development server:
```bash
cd ../frontend
npm start
```

6. Open your browser and navigate to `http://localhost:3000`

## Configuration

- The backend server runs on port 5000 by default
- LM Studio should be running and accessible on the default port
- Server configuration can be adjusted through the settings dialog in the UI

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 