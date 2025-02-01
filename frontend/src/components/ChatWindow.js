import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  InputAdornment,
  Popover,
  Tooltip,
  ClickAwayListener,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  MoreVert as MoreIcon,
  VideoCall as VideoIcon,
  OpenInFull as ExpandIcon,
  Image as ImageIcon,
  EmojiEmotions as EmojiIcon,
  Stop as StopIcon,
  Add as AddIcon,
  NoteAdd as NoteAddIcon,
  Psychology as BrainstormIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import { styled } from '@mui/material/styles';
import EmojiPicker from 'emoji-picker-react';

const StyledPaper = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  flex: 1,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(3),
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const MessageList = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.default,
  '&::-webkit-scrollbar': {
    width: '4px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: theme.palette.grey[600],
    borderRadius: '4px',
  },
}));

const Message = styled(Box)(({ theme, align }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: align === 'right' ? 'flex-end' : 'flex-start',
  marginBottom: theme.spacing(2),
}));

const MessageContent = styled(Box)(({ theme, align }) => ({
  maxWidth: '70%',
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(2),
  backgroundColor: align === 'right' ? theme.palette.primary.main : theme.palette.background.paper,
  color: align === 'right' ? theme.palette.primary.contrastText : theme.palette.text.primary,
  boxShadow: theme.shadows[1],
  '& p': {
    margin: 0,
  },
  '& pre': {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(1),
    borderRadius: theme.spacing(1),
    overflow: 'auto',
    margin: theme.spacing(1, 0),
    fontFamily: 'monospace',
  },
  '& code': {
    fontFamily: 'monospace',
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(0.25, 0.5),
    borderRadius: theme.spacing(0.5),
  },
  '& ul, & ol': {
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1),
    paddingLeft: theme.spacing(3),
  },
  '& li': {
    marginBottom: theme.spacing(0.5),
  },
  '& blockquote': {
    borderLeft: `3px solid ${theme.palette.divider}`,
    margin: theme.spacing(1, 0),
    paddingLeft: theme.spacing(2),
    color: theme.palette.text.secondary,
  },
}));

const ChatFooter = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const InputContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  borderRadius: theme.spacing(3),
  padding: theme.spacing(1),
}));

const ErrorMessage = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1, 2),
  backgroundColor: theme.palette.error.dark,
  color: theme.palette.error.contrastText,
  borderRadius: theme.spacing(1),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginBottom: theme.spacing(2),
}));

const ModelSelector = styled(FormControl)(({ theme }) => ({
  '& .MuiSelect-select': {
    paddingBottom: 0,
  },
  '& .MuiInput-underline:before': {
    borderBottomColor: 'transparent',
  },
}));

const ConversationSelector = styled(FormControl)(({ theme }) => ({
  minWidth: 200,
  '& .MuiSelect-select': {
    fontSize: '0.875rem',
  },
}));

function ChatWindow({
  position,
  models,
  streamingResponse,
  isThinking,
  setStreamingResponses,
  setThinking,
  serverUrl,
  otherPanelMessages,
  onBrainstormMessage,
}) {
  // Move startNewConversation definition before any hooks that use it
  const startNewConversation = useCallback(() => {
    const newId = Date.now().toString();
    const newConversation = {
      id: newId,
      name: 'New Conversation',
      messages: [],
      timestamp: new Date().toISOString()
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newId);
  }, []); // Empty dependency array since it only uses setState functions

  // Initialize state with timestamp-based ID
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem(`conversations-${position}`);
    const initialId = Date.now().toString();
    return saved ? JSON.parse(saved) : [{
      id: initialId,
      name: 'New Conversation',
      messages: [],
      timestamp: new Date().toISOString()
    }];
  });

  const [currentConversationId, setCurrentConversationId] = useState(() => {
    const saved = localStorage.getItem(`conversations-${position}`);
    if (saved) {
      const parsedConversations = JSON.parse(saved);
      return parsedConversations[0]?.id || Date.now().toString();
    }
    return Date.now().toString();
  });

  // Remove separate messages state and use conversation messages directly
  const currentConversation = useMemo(() => 
    conversations.find(c => c.id === currentConversationId) || conversations[0],
    [conversations, currentConversationId]
  );

  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    const savedModel = localStorage.getItem(`selectedModel-${position}`);
    return savedModel || '';
  });
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const responseBuffer = useRef('');
  const updateTimeoutRef = useRef(null);

  // Add health check state
  const [lastHealthCheck, setLastHealthCheck] = useState(() => {
    return parseInt(localStorage.getItem('lastHealthCheck') || '0');
  });

  // Add health check toggle state
  const [healthChecksEnabled, setHealthChecksEnabled] = useState(() => {
    return localStorage.getItem('healthChecksEnabled') !== 'false';
  });

  // Add loading state for model switching
  const [isModelSwitching, setIsModelSwitching] = useState(false);

  // Add model status tracking
  const [modelStatus, setModelStatus] = useState({});
  const lastNetworkCheck = useRef(0);
  const networkCheckInterval = 60000; // 1 minute in milliseconds

  // Cache models list with a longer interval
  const [cachedModels, setCachedModels] = useState([]);
  const modelListInterval = 60000; // 1 minute
  const lastModelListCheck = useRef(0);

  // Add brainstorm state
  const [brainstormEnabled, setBrainstormEnabled] = useState(() => {
    return localStorage.getItem(`brainstorm-enabled-${position}`) === 'true';
  });

  // Now handleModelChange can use unloadModel
  const handleModelChange = useCallback(async (newModelId) => {
    if (selectedModel === newModelId || isModelSwitching) return;
    
    setIsModelSwitching(true);
    try {
      setSelectedModel(newModelId);
      localStorage.setItem(`selectedModel-${position}`, newModelId);
    } finally {
      setIsModelSwitching(false);
    }
  }, [selectedModel, position, isModelSwitching]);

  // Update checkServerHealth to respect the toggle
  const checkServerHealth = useCallback(async () => {
    // If health checks are disabled, always return true
    if (!healthChecksEnabled) {
      return true;
    }

    const now = Date.now();
    if (now - lastNetworkCheck.current < networkCheckInterval) {
      return true; // Return true if we checked recently
    }

    try {
      const response = await fetch(`${serverUrl}/health`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        lastNetworkCheck.current = now;
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Health check failed:', error);
      return false;
    }
  }, [serverUrl, healthChecksEnabled]);

  // Add effect to save health check preference
  useEffect(() => {
    localStorage.setItem('healthChecksEnabled', healthChecksEnabled);
  }, [healthChecksEnabled]);

  // Replace models prop usage with cached models
  useEffect(() => {
    const fetchModels = async () => {
      const now = Date.now();
      if (now - lastModelListCheck.current < modelListInterval) {
        return; // Use cached models if checked recently
      }

      try {
        const response = await fetch(`${serverUrl}/v1/models`, {
          method: 'GET',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
          const data = await response.json();
          setCachedModels(data.data || []);
          lastModelListCheck.current = now;
        }
      } catch (error) {
        console.warn('Failed to fetch models:', error);
      }
    };

    fetchModels();
  }, [serverUrl]);

  // Update model selection logic to use cached models
  useEffect(() => {
    if (cachedModels.length > 0 && !selectedModel) {
      const savedModel = localStorage.getItem(`selectedModel-${position}`);
      
      // Only use saved model if it exists in current available models
      if (savedModel && cachedModels.some(m => m.id === savedModel)) {
        handleModelChange(savedModel);
      } else {
        // If no saved model or it's not available, select the first available model
        handleModelChange(cachedModels[0].id);
      }
    }
  }, [cachedModels, selectedModel, handleModelChange, position]);

  // Update conversation messages
  const updateConversationMessages = useCallback((newMessages) => {
    setConversations(prev => prev.map(conv => 
      conv.id === currentConversationId
        ? { ...conv, messages: newMessages }
        : conv
    ));
  }, [currentConversationId]);

  // Move cleanupConversation before handleConversationChange
  const cleanupConversation = useCallback((conversationId) => {
    // Abort any ongoing requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Clear streaming responses
    setStreamingResponses(prev => ({
      ...prev,
      [position]: ''
    }));

    // Clear thinking state
    setThinking(prev => ({
      ...prev,
      [position]: false
    }));

    // Clear response buffer
    responseBuffer.current = '';

    // Clear any pending timeouts
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }
  }, [position, setStreamingResponses, setThinking]);

  // Handle conversation switch
  const handleConversationChange = useCallback((newId) => {
    if (!conversations.some(conv => conv.id === newId)) {
      console.warn('Invalid conversation ID, selecting first available conversation');
      newId = conversations[0]?.id || Date.now().toString();
    }
    
    // Clean up the current conversation before switching
    cleanupConversation(currentConversationId);
    setCurrentConversationId(newId);
  }, [conversations, currentConversationId, cleanupConversation]);

  // Optimize streaming updates
  const updateStreamingResponse = useCallback((newContent) => {
    responseBuffer.current = newContent;
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      setStreamingResponses(prev => ({
        ...prev,
        [position]: responseBuffer.current
      }));
    }, 1500); // 1.5 second debounce
  }, [position, setStreamingResponses]);

  // Optimize chat completion request
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedModel || isModelSwitching) return;

    // Only check server health once per minute
    const isServerHealthy = await checkServerHealth();
    if (!isServerHealthy) {
      const errorMessage = 'Cannot connect to server. Please check that LM Studio is running.';
      updateConversationMessages([
        ...currentConversation.messages,
        {
          content: errorMessage,
          timestamp: new Date().toISOString(),
          role: 'error',
        }
      ]);
      return;
    }

    setStreamingResponses(prev => ({ ...prev, [position]: '' }));
    responseBuffer.current = '';
    
    const newMessage = {
      content: inputValue,
      timestamp: new Date().toISOString(),
      role: 'user',
    };

    const updatedMessages = [...currentConversation.messages, newMessage];
    updateConversationMessages(updatedMessages);
    setInputValue('');
    setThinking(prev => ({ ...prev, [position]: true }));

    try {
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 180000);

      const response = await fetch(`${serverUrl}/v1/chat/completions`, {
        method: 'POST',
        signal: abortControllerRef.current.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: updatedMessages.map(msg => ({
            role: msg.role === 'error' ? 'assistant' : msg.role,
            content: msg.content
          })),
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
          options: {
            load_model_only_when_needed: false,
            unload_model_after_completion: false, // Never unload models
            skip_embedding_model: true,
            skip_model_load_test: true,
            no_auto_model_selection: true,
            unload_other_models: false // Never unload other models
          }
        })
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${await response.text()}`);
      }

      if (response.body) {
        const reader = response.body.getReader();
        responseBuffer.current = '';
        
        try {
          const responseText = await processStreamingResponse(reader);
          
          if (responseText) {
            const newMessage = {
              content: responseText,
              timestamp: new Date().toISOString(),
              role: 'assistant',
            };

            const updatedMessagesWithResponse = [...updatedMessages, newMessage];
            updateConversationMessages(updatedMessagesWithResponse);

            // If brainstorm is enabled, notify the other panel
            if (brainstormEnabled) {
              onBrainstormMessage?.(newMessage);
            }
          }
        } finally {
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = null;
          }

          setStreamingResponses(prev => ({ ...prev, [position]: '' }));
          setThinking(prev => ({ ...prev, [position]: false }));
          responseBuffer.current = '';
          abortControllerRef.current = null;
        }
      }
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Unable to get response from LM Studio. ';
      
      try {
        // Try to parse the error response
        const errorData = error.message.includes('{') ? 
          JSON.parse(error.message.substring(error.message.indexOf('{'))) : null;
        
        if (errorData?.error?.message) {
          if (errorData.error.message.includes('Failed to load model')) {
            errorMessage = `Model loading failed. Please ensure:\n` +
              `1. The model file exists and is not corrupted\n` +
              `2. You have sufficient RAM available\n` +
              `3. Try restarting LM Studio\n\n` +
              `Technical details: ${errorData.error.message}`;
          } else {
            errorMessage += errorData.error.message;
          }
        } else if (error.name === 'AbortError') {
          errorMessage += 'Request timed out. The model might be too slow or not responding.';
        } else if (error.message === 'Failed to fetch') {
          errorMessage += `Please check that:\n1. LM Studio is still running\n2. Local Server is active\n3. Server address (${serverUrl}) is correct\n4. Your internet connection is stable`;
        } else {
          errorMessage += error.message;
        }
      } catch (parseError) {
        // If we can't parse the error, just use the original error message
        errorMessage += error.message;
      }
      
      updateConversationMessages([
        ...updatedMessages,
        {
          content: errorMessage,
          timestamp: new Date().toISOString(),
          role: 'error',
        },
      ]);
      setThinking(prev => ({ ...prev, [position]: false }));
    }
  };

  useEffect(() => {
    localStorage.setItem(`conversations-${position}`, JSON.stringify(conversations));
  }, [conversations, position]);

  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      scrollToBottom();
    }, 1000); // Delay scroll to 1 second

    return () => clearTimeout(scrollTimer);
  }, [currentConversation.messages, streamingResponse, scrollToBottom]);

  useEffect(() => {
    setStreamingResponses(prev => ({
      ...prev,
      [position]: ''
    }));
  }, [currentConversationId, position, setStreamingResponses]);

  const handleClearChat = useCallback(() => {
    updateConversationMessages([]); // Clear messages in current conversation
    setStreamingResponses(prev => ({
      ...prev,
      [position]: ''
    }));
    setThinking(prev => ({
      ...prev,
      [position]: false
    }));
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, [position, setStreamingResponses, setThinking, updateConversationMessages]);

  const handleMenuAction = useCallback((action) => {
    switch (action) {
      case 'new':
        startNewConversation();
        break;
      case 'clear':
        handleClearChat();
        break;
      case 'delete':
        // Clean up the conversation before deleting
        cleanupConversation(currentConversationId);
        
        setConversations(prev => {
          const updatedConversations = prev.filter(conv => conv.id !== currentConversationId);
          if (updatedConversations.length === 0) {
            const newId = Date.now().toString();
            const newConversation = {
              id: newId,
              name: 'New Conversation',
              messages: [],
              timestamp: new Date().toISOString()
            };
            return [newConversation];
          }
          // Switch to the first conversation in the list
          setCurrentConversationId(updatedConversations[0].id);
          return updatedConversations;
        });
        break;
      default:
        break;
    }
    setMenuAnchor(null);
  }, [currentConversationId, handleClearChat, startNewConversation, cleanupConversation]);

  const handleStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setThinking(prev => ({ ...prev, [position]: false }));
      setStreamingResponses(prev => ({ ...prev, [position]: '' }));
    }
  };

  const updateConversationName = (id, firstMessage) => {
    if (!firstMessage) return;
    
    // Extract first ~30 characters of the first message for the conversation name
    const name = firstMessage.content.length > 30 
      ? firstMessage.content.substring(0, 30) + '...'
      : firstMessage.content;

    setConversations(prev => 
      prev.map(conv => 
        conv.id === id 
          ? { ...conv, name } 
          : conv
      )
    );
  };

  // Batch updates for message list scrolling with longer delay
  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      scrollToBottom();
    }, 1000); // Delay scroll to 1 second

    return () => clearTimeout(scrollTimer);
  }, [currentConversation.messages, streamingResponse, scrollToBottom]);

  // Update streaming response handling
  const processStreamingChunk = useCallback((chunk) => {
    const lines = chunk.split('\n');
    let accumulatedContent = '';

    for (const line of lines) {
      if (!line.trim() || line.includes('[DONE]')) continue;

      try {
        const jsonStr = line.replace(/^data: /, '');
        const data = JSON.parse(jsonStr);

        if (data.choices && data.choices[0]?.delta?.content) {
          accumulatedContent += data.choices[0].delta.content;
        }
      } catch (e) {
        console.warn('Error parsing chunk:', e);
        continue;
      }
    }

    return accumulatedContent;
  }, []);

  const processStreamingResponse = async (reader, responseText = '', maxIterations = 1000) => {
    let iterations = 0;
    let accumulatedContent = responseBuffer.current || '';

    try {
      while (iterations < maxIterations) {
        iterations++;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const newContent = processStreamingChunk(chunk);
        accumulatedContent += newContent;
        responseText += newContent;

        // Update the streaming response with the accumulated content
        setStreamingResponses(prev => ({
          ...prev,
          [position]: accumulatedContent
        }));
      }

      return responseText;
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
    }
  };

  // Update StreamingResponseComponent to handle paragraphs better
  const StreamingResponseComponent = React.memo(({ content }) => (
    content ? (
      <Message align="left">
        <MessageContent 
          align="left"
          sx={{ 
            backgroundColor: theme => theme.palette.background.paper,
            minWidth: '200px',
            width: 'fit-content',
            maxWidth: '70%'
          }}
        >
          <ReactMarkdown 
            components={{
              p: ({ children }) => (
                <Typography 
                  variant="body1" 
                  component="p" 
                  sx={{ 
                    mb: 1,
                    '&:last-child': { mb: 0 }
                  }}
                >
                  {children}
                </Typography>
              ),
              pre: ({ node, ...props }) => (
                <pre style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  padding: '8px',
                  borderRadius: '4px',
                  overflowX: 'auto',
                }} {...props} />
              ),
              code: ({ node, inline, ...props }) => (
                inline ? 
                  <code style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                    padding: '2px 4px',
                    borderRadius: '3px',
                  }} {...props} /> :
                  <code {...props} />
              ),
            }}
          >
            {content}
          </ReactMarkdown>
        </MessageContent>
      </Message>
    ) : null
  ));

  // Update ThinkingIndicator to be more precise
  const ThinkingIndicator = React.memo(({ isThinking, onStop }) => (
    isThinking && !streamingResponse && !currentConversation.messages.find(m => m.role === 'error') ? (
      <Message align="left">
        <MessageContent 
          align="left" 
          sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            minWidth: '200px',
            width: 'fit-content',
            maxWidth: '70%',
            position: 'relative',
            padding: '12px 16px',
            '& pre': {
              margin: 0,
              padding: 0,
              backgroundColor: 'transparent',
              fontFamily: 'inherit',
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
            }
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            gap: 1,
          }}>
            <pre>{"<think>"}</pre>
            <pre style={{ marginLeft: '8px' }}>
              {"Processing request and generating response..."}
            </pre>
            <pre>{"</think>"}</pre>
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              mt: 1,
              pt: 1,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <CircularProgress size={16} />
              <Typography>Thinking...</Typography>
              <IconButton 
                size="small" 
                onClick={onStop}
                sx={{ 
                  ml: 'auto',
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  '&:hover': {
                    bgcolor: 'error.dark',
                  },
                  width: 24,
                  height: 24,
                }}
              >
                <StopIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        </MessageContent>
      </Message>
    ) : null
  ));

  // Update model status when a model is successfully used
  const updateModelStatus = useCallback((modelId, isAvailable) => {
    setModelStatus(prev => ({
      ...prev,
      [modelId]: {
        available: isAvailable,
        lastChecked: Date.now()
      }
    }));
  }, []);

  // Check if we need to verify model availability
  const shouldCheckModel = useCallback((modelId) => {
    const status = modelStatus[modelId];
    if (!status) return true;
    
    const now = Date.now();
    return now - status.lastChecked > networkCheckInterval;
  }, [modelStatus]);

  // Add model unload/refresh function
  const handleModelAction = useCallback(async (action) => {
    if (!selectedModel) return;
    
    setIsModelSwitching(true);
    try {
      if (action === 'unload') {
        await fetch(`${serverUrl}/v1/model/unload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            options: {
              unload_other_models: false // Never unload other models
            }
          })
        });
      } else if (action === 'refresh') {
        // First unload
        await fetch(`${serverUrl}/v1/model/unload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            options: {
              unload_other_models: false
            }
          })
        });
        
        // Then force a reload by sending a test completion
        await fetch(`${serverUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'system', content: 'test' }],
            stream: false,
            max_tokens: 1,
            options: {
              load_model_only_when_needed: false,
              unload_model_after_completion: false,
              unload_other_models: false
            }
          })
        });
      }
    } catch (error) {
      console.warn(`Failed to ${action} model:`, error);
    } finally {
      setIsModelSwitching(false);
    }
  }, [selectedModel, serverUrl]);

  // Add back the missing utility functions
  const getModelColor = (modelName) => {
    if (!modelName) return 'primary.main';
    const name = modelName.trim().toLowerCase();
    
    // Use a consistent color scheme based on model name
    const colors = {
      hermes: '#00BFA5',    // Teal
      nomic: '#4A90E2',     // Blue
      llama: '#2E7D32',     // Green
      mistral: '#ED6C02',   // Orange
      openchat: '#1976D2',  // Light blue
      qwen: '#9C27B0',      // Purple
      gemma: '#FF4081',     // Pink
      default: '#757575'    // Grey
    };

    // Find the first matching model name in the colors object
    const modelType = Object.keys(colors).find(key => name.includes(key));
    return modelType ? colors[modelType] : colors.default;
  };

  const getModelImage = (modelName) => {
    if (!modelName) return null;
    const name = modelName.trim().toLowerCase();
    
    // Map of model names to their image files
    const modelImages = {
      hermes: './Images/Hermes.jpg',
      nomic: './Images/Nomic.png',
      qwen: './Images/Qwen2.png',
      starcoder: './Images/StarCoder.jpg',
      gemma: './Images/Gemma.png'
    };

    // Find the first matching model name in the images object
    const modelType = Object.keys(modelImages).find(key => name.includes(key));
    return modelType ? modelImages[modelType] : null;
  };

  const getModelLetter = (modelName) => {
    if (!modelName) return 'A';
    return modelName.charAt(0).toUpperCase();
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const cursorPosition = document.querySelector('textarea').selectionStart;
    const updatedText = 
      inputValue.slice(0, cursorPosition) + 
      emoji + 
      inputValue.slice(cursorPosition);
    setInputValue(updatedText);
    setEmojiAnchor(null);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset file input
    event.target.value = '';

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be less than 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', selectedModel);

      setThinking(prev => ({ ...prev, [position]: true }));

      const response = await fetch(`${serverUrl}/v1/files`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Add file message to chat
      updateConversationMessages([
        ...currentConversation.messages,
        {
          content: `📎 Uploaded file: ${file.name}`,
          timestamp: new Date().toISOString(),
          role: 'user',
          fileId: data.id,
        },
      ]);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message);
      updateConversationMessages([
        ...currentConversation.messages,
        {
          content: `Failed to upload file: ${error.message}`,
          timestamp: new Date().toISOString(),
          role: 'error',
        },
      ]);
    } finally {
      setThinking(prev => ({ ...prev, [position]: false }));
    }
  };

  const supportsFileUpload = () => {
    if (!selectedModel || !models.length) return false;
    const currentModel = models.find(m => m.id === selectedModel);
    const modelName = currentModel?.name?.toLowerCase() || '';
    
    // Enable file uploads for both deepseek and qwen models
    if (modelName.includes('deepseek') || modelName.includes('qwen')) {
      return true;
    }
    // Fallback to checking capabilities if model has them defined
    return currentModel?.capabilities?.includes('file_upload') || false;
  };

  // Add back MessageComponent
  const MessageComponent = React.memo(({ message, align }) => {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragStart = (e) => {
      setIsDragging(true);
      // Set both text and rich data for different drop targets
      e.dataTransfer.setData('text/plain', message.content);
      e.dataTransfer.setData('application/json', JSON.stringify({
        type: 'chat_message',
        content: message.content,
        timestamp: message.timestamp,
        role: message.role,
        metadata: {
          model: selectedModel,
          modelName: models.find(m => m.id === selectedModel)?.name,
          conversationId: currentConversationId,
          conversationName: currentConversation.name
        }
      }));
      e.dataTransfer.effectAllowed = 'copyMove';
      
      // Create a custom drag image
      const dragPreview = document.createElement('div');
      dragPreview.className = 'message-drag-preview';
      dragPreview.innerHTML = `
        <div style="
          padding: 8px 12px;
          background: rgba(25, 118, 210, 0.9);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        ">
          ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}
        </div>
      `;
      document.body.appendChild(dragPreview);
      e.dataTransfer.setDragImage(dragPreview, 0, 0);
      setTimeout(() => document.body.removeChild(dragPreview), 0);

      e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
      setIsDragging(false);
      e.currentTarget.classList.remove('dragging');
      setTimeout(() => setIsDragging(false), 100);
    };

    const handleMessageClick = (event) => {
      if (!isDragging) {  // Only show menu if not dragging
        event.preventDefault();
        setMenuAnchor(event.currentTarget);
      }
    };

    const handleAddToNotebook = useCallback(() => {
      const event = new CustomEvent('addToNotebook', {
        detail: {
          type: 'chat_message',
          content: message.content,
          timestamp: message.timestamp,
          role: message.role,
          metadata: {
            model: selectedModel,
            modelName: models.find(m => m.id === selectedModel)?.name,
            conversationId: currentConversationId,
            conversationName: currentConversation.name
          },
          source: 'menu'
        }
      });
      window.dispatchEvent(event);
      setMenuAnchor(null);
    }, [message]);

    return (
      <Message 
        align={align}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onClick={handleMessageClick}
        sx={{ 
          cursor: isDragging ? 'grabbing' : 'grab',
          '&:hover': {
            '& .message-content': {
              boxShadow: 2,
              transform: 'translateY(-1px)',
            }
          },
          '&.dragging .message-content': {
            opacity: 0.7,
            boxShadow: 4,
            transform: 'scale(0.98)',
          },
          '& .message-content': {
            transition: 'all 0.2s ease',
          }
        }}
      >
        {message.role === 'error' ? (
          <ErrorMessage>
            <CircularProgress size={16} color="error" />
            <Typography variant="body2">{message.content}</Typography>
          </ErrorMessage>
        ) : (
          <>
            <MessageContent 
              align={align} 
              className="message-content"
              sx={{ 
                transition: 'all 0.2s ease',
              }}
            >
              <ReactMarkdown 
                components={{
                  pre: ({ node, ...props }) => (
                    <pre style={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      padding: '8px',
                      borderRadius: '4px',
                      overflowX: 'auto',
                    }} {...props} />
                  ),
                  code: ({ node, inline, ...props }) => (
                    inline ? 
                      <code style={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                        padding: '2px 4px',
                        borderRadius: '3px',
                      }} {...props} /> :
                      <code {...props} />
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </MessageContent>
            <Typography 
              variant="caption" 
              color="textSecondary" 
              sx={{ 
                mt: 0.5,
                opacity: 0.7,
                fontSize: '0.7rem',
              }}
            >
              {new Date(message.timestamp).toLocaleTimeString()}
            </Typography>
          </>
        )}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: align === 'right' ? 'right' : 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: align === 'right' ? 'right' : 'left',
          }}
        >
          <MenuItem onClick={handleAddToNotebook}>
            <NoteAddIcon sx={{ mr: 1, fontSize: 20 }} />
            Add to Notebook
          </MenuItem>
        </Menu>
      </Message>
    );
  });

  // Add effect to watch for messages from the other panel
  useEffect(() => {
    if (!brainstormEnabled || !selectedModel || isThinking || !otherPanelMessages?.length) return;

    const lastMessage = otherPanelMessages[otherPanelMessages.length - 1];
    if (lastMessage?.role === 'assistant' && !lastMessage.processed) {
      // Mark the message as processed to prevent loops
      lastMessage.processed = true;
      
      // Add a small delay to make the conversation feel more natural
      setTimeout(() => {
        setInputValue(lastMessage.content);
        handleSendMessage();
      }, 1000);
    }
  }, [brainstormEnabled, otherPanelMessages, selectedModel, isThinking]);

  // Save brainstorm state
  useEffect(() => {
    localStorage.setItem(`brainstorm-enabled-${position}`, brainstormEnabled);
  }, [brainstormEnabled, position]);

  return (
    <StyledPaper elevation={3}>
      <ChatHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={selectedModel ? (models.find(m => m.id === selectedModel)?.name || 'Select a model') : 'Select a model'}>
            <Avatar sx={{ 
              bgcolor: selectedModel ? 
                getModelColor(models.find(m => m.id === selectedModel)?.name || '') :
                'primary.main',
              transition: 'all 0.3s ease',
              fontWeight: 600,
              width: 40,
              height: 40,
              cursor: 'help',
              '& img': {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }
            }}>
              {selectedModel ? (
                (() => {
                  const modelName = models.find(m => m.id === selectedModel)?.name || '';
                  const imagePath = getModelImage(modelName);
                  return imagePath ? (
                    <img 
                      src={imagePath} 
                      alt={modelName}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  ) : (
                    getModelLetter(modelName)
                  );
                })()
              ) : 'A'}
            </Avatar>
          </Tooltip>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <ConversationSelector size="small">
              <Select
                value={currentConversationId}
                onChange={(e) => handleConversationChange(e.target.value)}
                variant="standard"
                sx={{ fontSize: '0.875rem' }}
              >
                {conversations.map((conv) => (
                  <MenuItem key={conv.id} value={conv.id}>
                    {conv.name || 'New Conversation'}
                  </MenuItem>
                ))}
              </Select>
            </ConversationSelector>
            {models.length > 0 ? (
              <ModelSelector size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedModel || ''}
                  onChange={(e) => handleModelChange(e.target.value)}
                  variant="standard"
                  displayEmpty
                >
                  {models.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </ModelSelector>
            ) : (
              <Typography variant="caption" color="error">
                No AI models available
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title={brainstormEnabled ? "AI Brainstorm Active" : "Enable AI Brainstorm"}>
            <IconButton 
              onClick={() => setBrainstormEnabled(prev => !prev)}
              color={brainstormEnabled ? "primary" : "default"}
              sx={{
                position: 'relative',
                '&::after': brainstormEnabled ? {
                  content: '""',
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '120%',
                  height: '120%',
                  borderRadius: '50%',
                  transform: 'translate(-50%, -50%)',
                  animation: 'pulse 2s infinite',
                  backgroundColor: 'primary.main',
                  opacity: 0.2,
                } : {},
                '@keyframes pulse': {
                  '0%': {
                    transform: 'translate(-50%, -50%) scale(0.95)',
                    opacity: 0.5,
                  },
                  '70%': {
                    transform: 'translate(-50%, -50%) scale(1.1)',
                    opacity: 0.2,
                  },
                  '100%': {
                    transform: 'translate(-50%, -50%) scale(0.95)',
                    opacity: 0.5,
                  },
                },
              }}
            >
              <BrainstormIcon />
            </IconButton>
          </Tooltip>
          <IconButton 
            onClick={startNewConversation}
            title="New Conversation"
          >
            <AddIcon />
          </IconButton>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
        </Box>
      </ChatHeader>

      <MessageList>
        {currentConversation.messages.map((msg, index) => (
          <MessageComponent
            key={`${msg.timestamp}-${index}`}
            message={msg}
            align={msg.role === 'user' ? 'right' : 'left'}
          />
        ))}
        <StreamingResponseComponent content={streamingResponse} />
        <ThinkingIndicator 
          isThinking={isThinking} 
          onStop={handleStopResponse}
        />
        <div ref={messagesEndRef} />
      </MessageList>

      <ChatFooter>
        <InputContainer
          onDragOver={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '';
            const text = e.dataTransfer.getData('text/plain');
            if (text) {
              setInputValue(prev => {
                const textarea = document.querySelector('textarea');
                const cursorPosition = textarea?.selectionStart || prev.length;
                return prev.slice(0, cursorPosition) + text + prev.slice(cursorPosition);
              });
              // Focus and scroll to end
              const textarea = document.querySelector('textarea');
              if (textarea) {
                textarea.focus();
                textarea.scrollTop = textarea.scrollHeight;
              }
            }
          }}
          sx={{
            transition: 'all 0.2s ease',
            '&:hover': {
              '&[data-dragging="true"]': {
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
              }
            }
          }}
        >
          <IconButton 
            size="small" 
            onClick={(e) => setEmojiAnchor(e.currentTarget)}
          >
            <EmojiIcon />
          </IconButton>
          <Popover
            open={Boolean(emojiAnchor)}
            anchorEl={emojiAnchor}
            onClose={() => setEmojiAnchor(null)}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'left',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'left',
            }}
          >
            <Box sx={{ 
              '.EmojiPickerReact': {
                '--epr-bg-color': 'rgba(18, 18, 18, 0.95)',
                '--epr-category-label-bg-color': 'rgba(18, 18, 18, 0.95)',
                '--epr-hover-bg-color': 'rgba(255, 255, 255, 0.1)',
                '--epr-focus-bg-color': 'rgba(255, 255, 255, 0.1)',
                '--epr-highlight-color': 'rgba(255, 255, 255, 0.2)',
                '--epr-search-border-color': 'rgba(255, 255, 255, 0.1)',
                '--epr-border-color': 'rgba(255, 255, 255, 0.1)',
                '--epr-text-color': '#fff',
                border: 'none',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              }
            }}>
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                theme="dark"
                searchPlaceHolder="Search emojis..."
                width={320}
                height={400}
                previewConfig={{
                  showPreview: false
                }}
              />
            </Box>
          </Popover>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.txt,.doc,.docx"
          />
          <Tooltip title={
            !selectedModel ? "Please select a model first" :
            !supportsFileUpload() ? "This model doesn't support file uploads" :
            "Upload a file"
          }>
            <span>
              <IconButton 
                size="small"
                disabled={!supportsFileUpload()}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon sx={{ 
                  color: theme => !supportsFileUpload() ? 
                    theme.palette.action.disabled : 
                    'inherit'
                }} />
              </IconButton>
            </span>
          </Tooltip>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            variant="standard"
            InputProps={{
              disableUnderline: true,
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || !selectedModel}
                    color="primary"
                  >
                    <SendIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </InputContainer>
        {uploadError && (
          <Typography 
            variant="caption" 
            color="error" 
            sx={{ mt: 1, display: 'block' }}
            onClick={() => setUploadError('')}
          >
            {uploadError}
          </Typography>
        )}
      </ChatFooter>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleMenuAction('new')}>
          New Conversation
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('clear')}>
          Clear Current Conversation
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')}>
          Delete Current Conversation
        </MenuItem>
        <MenuItem onClick={() => setHealthChecksEnabled(prev => !prev)}>
          {healthChecksEnabled ? '✓ ' : ''} Health Checks Enabled
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleModelAction('unload')}
          disabled={!selectedModel || isModelSwitching}
        >
          Unload Current Model
        </MenuItem>
        <MenuItem 
          onClick={() => handleModelAction('refresh')}
          disabled={!selectedModel || isModelSwitching}
        >
          Refresh Current Model
        </MenuItem>
      </Menu>
    </StyledPaper>
  );
}

export default ChatWindow; 