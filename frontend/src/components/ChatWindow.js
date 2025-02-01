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
  },
  '& code': {
    fontFamily: 'monospace',
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(0.25, 0.5),
    borderRadius: theme.spacing(0.5),
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
  const [selectedModel, setSelectedModel] = useState('');
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

  // Update model loading logic to be more efficient
  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      // Try to select deepseek or qwen model by default if available
      const preferredModel = models.find(m => {
        const name = m.name.toLowerCase();
        return name.includes('deepseek') || name.includes('qwen');
      });
      // Only set model if found, don't trigger unnecessary model loads
      if (preferredModel) {
        setSelectedModel(preferredModel.id);
      }
    }
  }, [models, selectedModel]);

  // Modify health check to use a lightweight endpoint
  const checkServerHealth = useCallback(async (headers) => {
    const now = Date.now();
    const healthCheckInterval = 60000;

    if (now - lastHealthCheck > healthCheckInterval) {
      try {
        // Use basic health check endpoint that doesn't load models
        const healthCheck = await fetch(`${serverUrl}/health`, {
          method: 'HEAD', // Use HEAD request instead of GET
          headers,
          signal: AbortSignal.timeout(5000),
          cache: 'no-store'
        });
        
        if (!healthCheck.ok) {
          throw new Error('Server is not responding properly');
        }
        
        setLastHealthCheck(now);
        localStorage.setItem('lastHealthCheck', now.toString());
      } catch (healthError) {
        if (healthError.name !== 'AbortError') {
          throw new Error('Cannot connect to server. Please check your connection.');
        }
      }
    }
  }, [serverUrl, lastHealthCheck]);

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

  // Update handleSendMessage to be more efficient with model loading
  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedModel) return;

    // Reset states before starting new message
    setStreamingResponses(prev => ({ ...prev, [position]: '' }));
    responseBuffer.current = '';
    
    const newMessage = {
      content: inputValue,
      timestamp: new Date().toISOString(),
      role: 'user',
    };

    // Update conversation with new message
    const updatedMessages = [...currentConversation.messages, newMessage];
    updateConversationMessages(updatedMessages);
    setInputValue('');
    
    // Set thinking state after message is added
    setThinking(prev => ({ ...prev, [position]: true }));

    try {
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
      }, 180000);

      const headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=180',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      };

      // Only check basic server health
      await checkServerHealth(headers);

      const response = await fetch(`${serverUrl}/v1/chat/completions`, {
        method: 'POST',
        signal: abortControllerRef.current.signal,
        headers,
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
            load_model_only_when_needed: true,
            unload_model_after_completion: true,
            skip_embedding_model: true // Skip loading embedding model
          }
        }),
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server returned ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Server response has no body');
      }

      const reader = response.body.getReader();
      responseBuffer.current = '';
      
      try {
        const responseText = await processStreamingResponse(reader);
        
        if (responseText) {
          const updatedMessagesWithResponse = [...updatedMessages, {
            content: responseText,
            timestamp: new Date().toISOString(),
            role: 'assistant',
          }];
          updateConversationMessages(updatedMessagesWithResponse);
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
    } catch (error) {
      console.error('Error:', error);
      let errorMessage = 'Unable to get response from LM Studio. ';
      if (error.name === 'AbortError') {
        errorMessage += 'Request timed out. The model might be too slow or not responding.';
      } else if (error.message === 'Failed to fetch') {
        errorMessage += `Please check that:\n1. LM Studio is still running\n2. Local Server is active\n3. Server address (${serverUrl}) is correct\n4. Your internet connection is stable`;
      } else {
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

  // Add rate limiting for streaming updates
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

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const processStreamingResponse = async (reader, responseText = '', maxIterations = 1000) => {
    let iterations = 0;
    let accumulatedContent = '';
    let lastUpdateTime = Date.now();
    const updateInterval = 1500; // Update every 1.5 seconds

    try {
      while (iterations < maxIterations) {
        iterations++;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const newContent = processStreamingChunk(chunk);
        responseText += newContent;
        accumulatedContent += newContent;

        // Only update UI if enough time has passed
        if (Date.now() - lastUpdateTime >= updateInterval) {
          updateStreamingResponse(accumulatedContent);
          accumulatedContent = '';
          lastUpdateTime = Date.now();
        }
      }

      // Final update for any remaining content
      if (accumulatedContent) {
        updateStreamingResponse(accumulatedContent);
      }

      return responseText;
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
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

  const getModelLetter = (modelName) => {
    if (!modelName) return 'A';
    const name = modelName.trim().toLowerCase();
    if (name.includes('deepseek')) return 'D';
    if (name.includes('qwen')) return 'Q';
    if (name.includes('hermes')) return 'H';
    return modelName.charAt(0).toUpperCase();
  };

  const getModelColor = (modelName) => {
    if (!modelName) return 'primary.main';
    const name = modelName.trim().toLowerCase();
    if (name.includes('deepseek')) return '#4A90E2'; // Blue for Deepseek
    if (name.includes('qwen')) return '#9C27B0'; // Purple for Qwen
    if (name.includes('llama')) return '#2E7D32'; // Green for Llama
    if (name.includes('mistral')) return '#ED6C02'; // Orange for Mistral
    if (name.includes('openchat')) return '#1976D2'; // Light blue for OpenChat
    if (name.includes('hermes')) return '#00BFA5'; // Teal for Hermes
    return '#757575'; // Grey for unknown models
  };

  const getModelImage = (modelName) => {
    if (!modelName) return null;
    const name = modelName.trim().toLowerCase();
    if (name.includes('deepseek')) return './Images/Deepseek.png';
    if (name.includes('qwen')) return './Images/Qwen2.png';
    if (name.includes('starcoder')) return './Images/StarCoder.jpg';
    if (name.includes('gemma')) return './Images/Gemma.png';
    if (name.includes('hermes')) return './Images/Hermes.jpg';
    return null;
  };

  // Update MessageComponent to include menu
  const MessageComponent = React.memo(({ message, align }) => {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMessageClick = (event) => {
      if (!isDragging) {  // Only show menu if not dragging
        event.preventDefault();
        setMenuAnchor(event.currentTarget);
      }
    };

    const handleDragStart = (e) => {
      setIsDragging(true);
      e.dataTransfer.setData('text/plain', message.content);
      e.dataTransfer.effectAllowed = 'copy';
      // Add a class to style the dragged element
      e.currentTarget.classList.add('dragging');
    };

    const handleDragEnd = (e) => {
      setIsDragging(false);
      // Remove the dragging class
      e.currentTarget.classList.remove('dragging');
      // Reset after a short delay to allow click events if no drag occurred
      setTimeout(() => setIsDragging(false), 100);
    };

    const handleAddToNotebook = () => {
      const event = new CustomEvent('addToNotebook', {
        detail: {
          content: message.content,
          timestamp: message.timestamp,
          role: message.role
        }
      });
      window.dispatchEvent(event);
      setMenuAnchor(null);
    };

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
            }
          },
          '&.dragging .message-content': {
            opacity: 0.7,
            boxShadow: 4,
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
              <ReactMarkdown>{message.content}</ReactMarkdown>
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

  // Memoize streaming response component
  const StreamingResponseComponent = React.memo(({ content }) => (
    content ? (
      <Message align="left">
        <MessageContent 
          align="left"
          sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)', // Slightly darker background to distinguish from final responses
            minWidth: '200px',
            width: 'fit-content',
            maxWidth: '70%'
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="body1">
              {content}
            </Typography>
          </Box>
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

  return (
    <StyledPaper elevation={3}>
      <ChatHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={selectedModel ? models.find(m => m.id === selectedModel)?.name || 'Select a model' : 'Select a model'}>
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
                  onChange={(e) => setSelectedModel(e.target.value)}
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
            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.backgroundColor = '';
            const text = e.dataTransfer.getData('text/plain');
            setInputValue(prev => {
              const cursorPosition = document.querySelector('textarea')?.selectionStart || prev.length;
              return prev.slice(0, cursorPosition) + text + prev.slice(cursorPosition);
            });
          }}
          sx={{
            transition: 'background-color 0.2s ease',
            '&:hover': {
              '&[data-dragging="true"]': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
      </Menu>
    </StyledPaper>
  );
}

export default ChatWindow; 