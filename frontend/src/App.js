import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import ChatWindow from './components/ChatWindow';
import NetworkDiagnostics from './components/NetworkDiagnostics';
import { alpha } from '@mui/material/styles';

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
  minHeight: '100vh',
  backgroundColor: theme.palette.background.default,
}));

const ChatContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  width: '100%',
  maxWidth: 1600,
  margin: '0 auto',
  height: 'calc(100vh - 80px)', // Adjusted for new header height
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
  const [models, setModels] = useState([]);
  const [streamingResponses, setStreamingResponses] = useState({ left: '', right: '' });
  const [thinking, setThinking] = useState({ left: false, right: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [serverConfig, setServerConfig] = useState({
    address: localStorage.getItem('lmStudioAddress') || '192.168.50.89',
    port: localStorage.getItem('lmStudioPort') || '1234',
  });
  const [configOpen, setConfigOpen] = useState(false);

  const cleanAddress = serverConfig.address.replace(/^https?:\/\//, '');
  const serverUrl = `http://${cleanAddress}:${serverConfig.port}`;

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
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // Try direct GET request first without CORS mode
      const response = await fetch(`${serverUrl}/v1/models`, {
        method: 'GET',
        headers: DEFAULT_HEADERS,
        signal: controller.signal
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

      setModels(data.data.map(model => ({
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

      const maxRetries = 3;
      const backoffDelay = Math.min(1000 * Math.pow(2, retryAttempt), 10000);
      
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
        const interval = setInterval(() => fetchModels(0), 30000);
        return () => clearInterval(interval);
      }
    };

    initializeApp();
  }, [retryCount, serverUrl, error]);

  const handleRetry = () => {
    setLoading(true);
    setRetryCount(0);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppContainer>
        {loading ? (
          <LoadingContainer>
            <CircularProgress size={40} />
            <Typography variant="h6">
              Connecting to LM Studio...
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Attempting to connect to {serverUrl}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Make sure LM Studio is running and the Local Server is started
            </Typography>
          </LoadingContainer>
        ) : error ? (
          <LoadingContainer>
            <Typography variant="h6" color="error">
              Unable to connect to LM Studio
            </Typography>
            <Typography variant="body1" color="error" sx={{ whiteSpace: 'pre-line' }}>
              {error}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <ActionButton
                variant="contained"
                startIcon={<RefreshIcon />}
                onClick={handleRetry}
              >
                Retry Connection
              </ActionButton>
              <ActionButton
                variant="contained"
                startIcon={<SettingsIcon />}
                onClick={() => setConfigOpen(true)}
              >
                Configure Server
              </ActionButton>
            </Box>
            <Box sx={{ width: '100%', maxWidth: 600, mt: 4 }}>
              <NetworkDiagnostics />
            </Box>
          </LoadingContainer>
        ) : (
          <>
            <StyledAppBar position="static">
              <StyledToolbar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="h6" component="div">
                    LM Studio Chat
                  </Typography>
                  <NetworkDiagnostics variant="compact" showTestButton={false} />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ActionButton
                    startIcon={<RefreshIcon />}
                    onClick={handleRetry}
                  >
                    Refresh
                  </ActionButton>
                  <IconButton
                    color="inherit"
                    onClick={() => setConfigOpen(true)}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Box>
              </StyledToolbar>
            </StyledAppBar>

            <Container maxWidth={false} sx={{ py: 3 }}>
              <ChatContainer>
                <ChatWindow
                  position="left"
                  models={models}
                  streamingResponse={streamingResponses.left}
                  isThinking={thinking.left}
                  setStreamingResponses={setStreamingResponses}
                  setThinking={setThinking}
                  serverUrl={serverUrl}
                />
                <ChatWindow
                  position="right"
                  models={models}
                  streamingResponse={streamingResponses.right}
                  isThinking={thinking.right}
                  setStreamingResponses={setStreamingResponses}
                  setThinking={setThinking}
                  serverUrl={serverUrl}
                />
              </ChatContainer>
            </Container>
          </>
        )}

        <Dialog 
          open={configOpen} 
          onClose={() => setConfigOpen(false)}
          PaperProps={{
            sx: {
              backgroundColor: theme.palette.background.paper,
              backgroundImage: 'none',
            }
          }}
        >
          <DialogTitle>Configure LM Studio Server</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <TextField
                label="Server Address"
                value={serverConfig.address}
                onChange={(e) => setServerConfig(prev => ({ ...prev, address: e.target.value }))}
                helperText="Example: localhost or 192.168.50.89"
                fullWidth
                variant="outlined"
              />
              <TextField
                label="Port"
                value={serverConfig.port}
                onChange={(e) => setServerConfig(prev => ({ ...prev, port: e.target.value }))}
                helperText="Default: 1234"
                fullWidth
                variant="outlined"
              />
              <NetworkDiagnostics />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setConfigOpen(false)}>
              Cancel
            </Button>
            <ActionButton onClick={handleConfigSave} variant="contained">
              Save & Reconnect
            </ActionButton>
          </DialogActions>
        </Dialog>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App; 