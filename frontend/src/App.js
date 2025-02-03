import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  CssBaseline,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Container,
  Alert,
  createTheme,
  ThemeProvider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  VideoCall as VideoIcon,
  OpenInFull as ExpandIcon,
  MoreVert as MoreIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  NoteAdd as NoteAddIcon,
} from '@mui/icons-material';
import ChatWindow from './components/ChatWindow';
import NetworkDiagnostics from './components/NetworkDiagnostics';
import { alpha } from '@mui/material/styles';
import Notebook from './components/Notebook';
import PanelLayout from './components/PanelLayout';

// Create a dark theme with purple accents
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#8B5CF6', // Purple accent color
      light: '#A78BFA',
      dark: '#7C3AED',
    },
    background: {
      default: '#1E1E2D', // Dark background
      paper: '#27293D',   // Slightly lighter for cards
    },
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundImage: 'none',
          borderRadius: 12,
        },
      },
    },
  },
});

const AppContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  maxHeight: '100vh',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  width: '100%',
  maxWidth: 1600,
  margin: '0 auto',
  height: 'calc(100vh - 64px)', // Account for AppBar height
  padding: theme.spacing(2),
  overflow: 'hidden',
  '@media (max-width: 960px)': {
    flexDirection: 'column',
    height: 'auto',
  },
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(2),
  minHeight: '100vh',
  padding: theme.spacing(3),
  color: theme.palette.text.primary,
  textAlign: 'center',
}));

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: theme.palette.background.default,
  backgroundImage: 'none',
  borderBottom: `1px solid ${theme.palette.divider}`,
  boxShadow: 'none',
  position: 'sticky',
  top: 0,
  zIndex: theme.zIndex.appBar,
}));

const StyledToolbar = styled(Toolbar)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(0, 2),
}));

const ActionButton = styled(Button)(({ theme }) => ({
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.contrastText, 0.1),
  },
  borderRadius: 8,
  padding: '6px 16px',
}));

const MessageInput = styled('input')(({ theme }) => ({
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontSize: '14px',
  outline: 'none',
  '&:focus': {
    borderColor: theme.palette.primary.main,
  },
}));

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

function App() {
  const [streamingResponses, setStreamingResponses] = useState({});
  const [thinking, setThinking] = useState({});
  const [models, setModels] = useState([]);
  const [serverConfig, setServerConfig] = useState({
    address: localStorage.getItem('lmStudioAddress') || '192.168.50.89',
    port: localStorage.getItem('lmStudioPort') || '1234',
  });
  const [configOpen, setConfigOpen] = useState(false);
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);

  const cleanAddress = serverConfig.address.replace(/^https?:\/\//, '');
  const serverUrl = `http://${cleanAddress}:${serverConfig.port}`;

  // Add state for panel messages
  const [panelMessages, setPanelMessages] = useState({
    left: [],
    right: [],
  });

  const [currentMessage, setCurrentMessage] = useState('');

  // Handle brainstorm messages
  const handleBrainstormMessage = (position, message) => {
    console.log(`Handling brainstorm message from ${position}:`, message);
    const otherPosition = position === 'left' ? 'right' : 'left';
    
    // Create a new message object to avoid mutation
    const newMessage = {
      ...message,
      processed: false,
      metadata: {
        ...message.metadata,
        fromPanel: position,
        timestamp: new Date().toISOString(),
        iterationCount: (message.metadata?.iterationCount || 0)
      }
    };

    setPanelMessages(prev => {
      // Create a new state object with existing messages
      const updatedMessages = {
        left: [...(prev.left || [])],
        right: [...(prev.right || [])]
      };

      // Add the new message to the other panel's messages
      updatedMessages[otherPosition] = [...updatedMessages[otherPosition], newMessage];
      
      console.log(`Updated panel messages for ${otherPosition}:`, updatedMessages[otherPosition]);
      return updatedMessages;
    });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const handleConfigSave = () => {
    const cleanedAddress = serverConfig.address.replace(/^https?:\/\//, '');
    localStorage.setItem('lmStudioAddress', cleanedAddress);
    localStorage.setItem('lmStudioPort', serverConfig.port);
    setConfigOpen(false);
    setRetryCount(0);
    setLoading(true);
  };

  const fetchModels = async (retryAttempt = 0) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increase timeout to 30s for initial load

      const response = await fetch(`${serverUrl}/v1/models`, {
        method: 'GET',
        headers: {
          ...DEFAULT_HEADERS,
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=120',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Models response:', data);

      if (!data.data || !data.data.length) {
        throw new Error('No models available in LM Studio. Please load a model first.');
      }

      // Sort models to prioritize Qwen and Deepseek
      const sortedModels = data.data.sort((a, b) => {
        const nameA = a.id.toLowerCase();
        const nameB = b.id.toLowerCase();
        if (nameA.includes('qwen') || nameA.includes('deepseek')) return -1;
        if (nameB.includes('qwen') || nameB.includes('deepseek')) return 1;
        return 0;
      });

      setModels(sortedModels.map(model => ({
        id: model.id,
        name: model.id.split('/').pop().replace(/-GGUF$/, '')
      })));

      setError(null);
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching models:', error);
      let errorMessage = error.message;
      
      if (error.name === 'AbortError') {
        errorMessage = 'Connection timed out. Is LM Studio running?';
      } else if (error.message === 'Failed to fetch') {
        errorMessage = `Unable to connect to LM Studio at ${serverUrl}\nPlease check that:\n1. LM Studio is running\n2. Local Server is started in LM Studio\n3. The server address is correct\n4. You are on the same network as the LM Studio server`;
      }
      setError(errorMessage);

      const maxRetries = 5; // Increase max retries
      const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempt), 30000); // Cap at 30 seconds
      
      if (retryAttempt < maxRetries) {
        console.log(`Retrying in ${backoffDelay/1000} seconds... (Attempt ${retryAttempt + 1}/${maxRetries})`);
        setTimeout(() => {
          setRetryCount(retryAttempt + 1);
        }, backoffDelay);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      await fetchModels(retryCount);
      if (!error) {
        // Poll every 2 minutes instead of 30 seconds to reduce server load
        const interval = setInterval(() => fetchModels(0), 120000);
        return () => clearInterval(interval);
      }
    };

    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount, serverUrl, error]);

  // Cache models in localStorage to reduce initial load
  useEffect(() => {
    if (models.length > 0) {
      localStorage.setItem('cachedModels', JSON.stringify(models));
    }
  }, [models]);

  // Load cached models on startup
  useEffect(() => {
    const cachedModels = localStorage.getItem('cachedModels');
    if (cachedModels) {
      try {
        setModels(JSON.parse(cachedModels));
      } catch (e) {
        console.error('Error loading cached models:', e);
      }
    }
  }, []);

  const handleRetry = () => {
    setLoading(true);
    setRetryCount(0);
  };

  const handleMessageSubmit = useCallback((message) => {
    setCurrentMessage(message);
  }, []);

  // Render chat windows with model selection callback
  const renderChatWindows = useCallback((panelId, onModelSelect) => (
    <ChatWindow
      key={panelId}
      position={panelId}
      models={models}
      streamingResponse={streamingResponses[panelId] || ''}
      isThinking={thinking[panelId] || false}
      setStreamingResponses={setStreamingResponses}
      setThinking={setThinking}
      serverUrl={serverUrl}
      otherPanelMessages={[]}
      onBrainstormMessage={handleBrainstormMessage}
      onMessageSubmit={handleMessageSubmit}
      onModelSelect={onModelSelect}
    />
  ), [models, streamingResponses, thinking, serverUrl, handleBrainstormMessage, handleMessageSubmit]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContainer>
        <PanelLayout
          currentMessage={currentMessage}
          isNotebookOpen={isNotebookOpen}
          onToggleNotebook={() => setIsNotebookOpen(prev => !prev)}
          models={models}
        >
          {renderChatWindows}
        </PanelLayout>
        {isNotebookOpen && (
          <Notebook 
            isOpen={isNotebookOpen} 
            onClose={() => setIsNotebookOpen(false)} 
          />
        )}
      </AppContainer>
    </ThemeProvider>
  );
}

export default App; 