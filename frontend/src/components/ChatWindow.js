import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
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
  Button,
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
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
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

const ConversationHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const ConversationName = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  '& .timestamp-group': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginLeft: theme.spacing(2),
  },
  '& .timestamp': {
    color: theme.palette.text.secondary,
    fontSize: '0.75rem',
    marginRight: theme.spacing(2)
  }
}));

const EditableTitle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  '& input': {
    background: 'none',
    border: 'none',
    borderBottom: `1px solid ${theme.palette.primary.main}`,
    color: theme.palette.text.primary,
    fontSize: '1rem',
    padding: theme.spacing(0.5, 1),
    '&:focus': {
      outline: 'none',
    }
  }
}));

// Add logging utility
const logDebug = (component, action, details) => {
  console.log(`[${component}] ${action}:`, details);
};

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
  onMessageSubmit,
  onModelSelect,
}) {
  // Initialize all state without localStorage
  const [conversations, setConversations] = useState([{
    id: Date.now().toString(),
    name: 'New Conversation',
    timestamp: new Date().toISOString(),
    messages: []
  }]);

  const [currentConversationId, setCurrentConversationId] = useState(() => conversations[0].id);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isModelSwitching, setIsModelSwitching] = useState(false);
  const [brainstormEnabled, setBrainstormEnabled] = useState(false);
  const [brainstormIterations, setBrainstormIterations] = useState(0);
  const [brainstormMenuAnchor, setBrainstormMenuAnchor] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [healthChecksEnabled, setHealthChecksEnabled] = useState(true);
  const [lastHealthCheck, setLastHealthCheck] = useState(0);
  const [modelStatus, setModelStatus] = useState({});
  const [cachedModels, setCachedModels] = useState([]);
  const [loadedModels, setLoadedModels] = useState(new Set());

  // Initialize all refs
  const abortControllerRef = useRef(null);
  const messageListRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const responseBuffer = useRef('');
  const updateTimeoutRef = useRef(null);
  const lastNetworkCheck = useRef(0);
  const lastModelListCheck = useRef(0);

  // Constants
  const networkCheckInterval = 60000; // 1 minute in milliseconds
  const modelListInterval = 60000; // 1 minute

  const currentConversation = useMemo(() => {
    const found = conversations.find(c => c.id === currentConversationId);
    return found || conversations[0] || { id: Date.now().toString(), name: 'New Conversation', messages: [], timestamp: new Date().toISOString() };
  }, [conversations, currentConversationId]);

  const updateConversationMessages = useCallback((newMessages) => {
    setConversations(prev => prev.map(conv => 
      conv.id === currentConversationId
        ? { ...conv, messages: newMessages }
        : conv
    ));
  }, [currentConversationId]);

  const processStreamingChunk = useCallback((chunk) => {
    const lines = chunk.split('\n');
    let accumulatedContent = '';

    for (const line of lines) {
      if (!line.trim() || line.includes('[DONE]')) continue;

      try {
        const jsonStr = line.replace(/^data: /, '');
        const data = JSON.parse(jsonStr);

        // Handle different model response formats
        if (data.choices && data.choices[0]) {
          // Standard format (used by most models including Hermes)
          if (data.choices[0].delta?.content) {
            accumulatedContent += data.choices[0].delta.content;
          }
          // Alternative format (used by some models like Qwen)
          else if (data.choices[0].text) {
            accumulatedContent += data.choices[0].text;
          }
          // Handle content directly in the choice (some other models)
          else if (data.choices[0].content) {
            accumulatedContent += data.choices[0].content;
          }
        }
      } catch (e) {
        console.warn('Error parsing chunk:', e);
        continue;
      }
    }

    return accumulatedContent;
  }, []);

  const processStreamingResponse = useCallback(async (reader, responseText = '', maxIterations = 1000) => {
    let iterations = 0;
    let accumulatedContent = '';

    try {
      while (iterations < maxIterations) {
        iterations++;
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const newContent = processStreamingChunk(chunk);
        accumulatedContent += newContent;

        setStreamingResponses(prev => ({
          ...prev,
          [position]: accumulatedContent
        }));
      }

      // Always update messages when streaming is complete
      setConversations(prev => {
        const updatedConversations = prev.map(conv => {
          if (conv.id === currentConversationId) {
            return {
              ...conv,
              messages: [
                ...conv.messages,
                {
                  content: accumulatedContent,
                  timestamp: new Date().toISOString(),
                  role: 'assistant'
                }
              ]
            };
          }
          return conv;
        });
        return updatedConversations;
      });

      return accumulatedContent;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream was aborted');
        return accumulatedContent;
      }
      console.error('Error processing stream:', error);
      throw error;
    } finally {
      // Clear streaming response after updating conversations
      setStreamingResponses(prev => ({
        ...prev,
        [position]: ''
      }));
    }
  }, [position, setStreamingResponses, currentConversationId, processStreamingChunk, setConversations]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Clear streaming state on unmount
      setStreamingResponses(prev => ({
        ...prev,
        [position]: ''
      }));
      setThinking(prev => ({
        ...prev,
        [position]: false
      }));
      
      // Clear any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      // Clear any pending timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }

      // Reset all refs
      abortControllerRef.current = null;
      messageListRef.current = null;
      fileInputRef.current = null;
      messagesEndRef.current = null;
      responseBuffer.current = '';
      updateTimeoutRef.current = null;
      lastNetworkCheck.current = 0;
      lastModelListCheck.current = 0;
    };
  }, [position, setStreamingResponses, setThinking]);

  // Function to check if scrolled to bottom
  const isScrolledToBottom = useCallback(() => {
    if (!messageListRef.current) return true;
    const { scrollHeight, scrollTop, clientHeight } = messageListRef.current;
    // Consider "almost" at bottom (within 100px) as at bottom
    return scrollHeight - scrollTop - clientHeight < 100;
  }, []);

  // Handle scroll events
  const handleScroll = useCallback((e) => {
    // Only set userHasScrolled if the scroll was manual (wheel or drag)
    if (e.type === 'wheel' || e.type === 'touchmove') {
      const wasAtBottom = isScrolledToBottom();
      setUserHasScrolled(!wasAtBottom);
    }
  }, [isScrolledToBottom]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current && (!userHasScrolled || isScrolledToBottom())) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [userHasScrolled, isScrolledToBottom]);

  // Update scroll effect
  useEffect(() => {
    if (!messageListRef.current) return;
    
    const messageList = messageListRef.current;
    messageList.addEventListener('wheel', handleScroll);
    messageList.addEventListener('touchmove', handleScroll);
    
    return () => {
      messageList.removeEventListener('wheel', handleScroll);
      messageList.removeEventListener('touchmove', handleScroll);
    };
  }, [handleScroll]);

  // Update auto-scroll effect
  useEffect(() => {
    const scrollTimer = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(scrollTimer);
  }, [currentConversation.messages, streamingResponse, scrollToBottom]);

  // Update handleModelChange to not use localStorage
  const handleModelChange = useCallback(async (modelId) => {
    if (!modelId || modelId === selectedModel) return;
    
    logDebug('ModelChange', 'Starting model change', { 
      from: selectedModel || 'none', 
      to: modelId 
    });
    setIsModelSwitching(true);
    
    try {
      // Only do a load check if we haven't seen this model before
      if (!loadedModels.has(modelId)) {
        const response = await fetch(`${serverUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'system', content: 'Hello' }],
            stream: false,
            max_tokens: 1
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to load model: ${response.statusText}`);
        }
        
        setLoadedModels(prev => new Set([...prev, modelId]));
      }
      
      setSelectedModel(modelId);
      onModelSelect?.(position, modelId);
      
    } catch (error) {
      console.error('Error switching model:', error);
    } finally {
      setIsModelSwitching(false);
    }
  }, [position, onModelSelect, selectedModel, serverUrl, loadedModels]);

  // Remove model unloading completely - let LM Studio handle it
  const handleModelAction = useCallback(async (action) => {
    if (!selectedModel) return;
    
    logDebug('ModelAction', 'Starting model action', { 
      action, 
      model: selectedModel 
    });
    
    setIsModelSwitching(true);
    try {
      if (action === 'refresh') {
        const response = await fetch(`${serverUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [{ role: 'system', content: 'Hello' }],
            stream: false,
            max_tokens: 1
          })
        });
        
        if (response.ok) {
          setLoadedModels(prev => new Set([...prev, selectedModel]));
        }
      }
      // Remove unload action completely
    } catch (error) {
      console.warn(`Failed to ${action} model:`, error);
    } finally {
      setIsModelSwitching(false);
    }
  }, [selectedModel, serverUrl]);

  // Add effect to maintain model loaded state
  useEffect(() => {
    if (selectedModel && !loadedModels.has(selectedModel)) {
      setLoadedModels(prev => new Set([...prev, selectedModel]));
    }
  }, [selectedModel, loadedModels]);

  // Add back the missing utility functions
  const getModelColor = (modelName) => {
    if (!modelName) return 'primary.main';
    const name = (modelName || '').trim().toLowerCase();
    
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
  const MessageComponent = memo(({ message, align }) => {
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

    return (
      <Message 
        align={align}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
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
      </Message>
    );
  });

  // Save brainstorm state
  useEffect(() => {
    localStorage.setItem(`brainstorm-enabled-${position}`, brainstormEnabled);
  }, [brainstormEnabled, position]);

  // Save brainstorm iterations to localStorage
  useEffect(() => {
    localStorage.setItem(`brainstorm-iterations-${position}`, brainstormIterations);
  }, [brainstormIterations, position]);

  const handleEditName = () => {
    setEditedName(currentConversation.name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId 
          ? { ...conv, name: editedName.trim() }
          : conv
      ));
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };

  // Add brainstorm menu handler
  const handleBrainstormContextMenu = (event) => {
    event.preventDefault();
    setBrainstormMenuAnchor(event.currentTarget);
  };

  // Update the brainstorm menu items to save state
  const handleBrainstormIterationChange = (count) => {
    setBrainstormIterations(count);
    setBrainstormMenuAnchor(null);
    // If iterations are set but brainstorm is not enabled, enable it
    if (!brainstormEnabled) {
      setBrainstormEnabled(true);
    }
  };

  const handleDownloadBrainstorm = useCallback(() => {
    const formatMessage = (msg) => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      const model = msg.metadata?.modelName || 'Unknown Model';
      const role = msg.role === 'user' ? 'Human' : 'Assistant';
      return `[${timestamp}] ${role} (${model}):\n${msg.content}\n\n`;
    };

    const text = currentConversation.messages.map(formatMessage).join('');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${currentConversation.name}-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [currentConversation]);

  // Update handleStopResponse to match panel 1 exactly
  const handleStopResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      
      setThinking(prev => ({ ...prev, [position]: false }));
      
      // Update conversations with the current streaming response
      if (streamingResponse) {
        setConversations(prev => prev.map(conv => 
          conv.id === currentConversationId
            ? {
                ...conv,
                messages: [
                  ...conv.messages,
                  {
                    content: streamingResponse,
                    timestamp: new Date().toISOString(),
                    role: 'assistant'
                  }
                ]
              }
            : conv
        ));
      }
      
      setStreamingResponses(prev => ({ ...prev, [position]: '' }));
    }
  }, [position, setThinking, streamingResponse, currentConversationId, setConversations, setStreamingResponses]);

  // Update brainstorm handling
  const handleBrainstormToggle = useCallback(() => {
    const newState = !brainstormEnabled;
    setBrainstormEnabled(newState);
    
    // Only notify other panel if we're enabling brainstorm
    if (newState) {
      const event = new CustomEvent('brainstormSync', {
        detail: {
          enabled: newState,
          iterations: brainstormIterations,
          fromPosition: position
        }
      });
      window.dispatchEvent(event);
    }
  }, [brainstormEnabled, brainstormIterations, position]);

  // Add brainstorm message handler
  useEffect(() => {
    const handleBrainstormMessage = (event) => {
      const { enabled, iterations, fromPosition } = event.detail;
      
      // Only handle messages from the other panel
      if (fromPosition === position) return;
      
      if (enabled) {
        setBrainstormEnabled(true);
        setBrainstormIterations(iterations);
        localStorage.setItem(`brainstorm-enabled-${position}`, 'true');
        localStorage.setItem(`brainstorm-iterations-${position}`, iterations.toString());
      }
    };

    window.addEventListener('brainstormSync', handleBrainstormMessage);
    return () => window.removeEventListener('brainstormSync', handleBrainstormMessage);
  }, [position]);

  // Update handleSendMessage to properly handle message state
  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || !selectedModel || isModelSwitching) return;

    const message = inputValue.trim();
    setInputValue('');
    
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    // Add user message to conversation immediately
    setConversations(prev => prev.map(conv => 
      conv.id === currentConversationId
        ? {
            ...conv,
            messages: [...conv.messages, userMessage]
          }
        : conv
    ));
    
    // Notify parent component
    onMessageSubmit?.(message);

    try {
      setThinking(prev => ({ ...prev, [position]: true }));
      setStreamingResponses(prev => ({ ...prev, [position]: '' }));

      abortControllerRef.current = new AbortController();

      // Get the updated messages array that includes the user message
      const currentConv = conversations.find(c => c.id === currentConversationId);
      const formattedMessages = [...(currentConv?.messages || []), userMessage].map(msg => ({
        role: msg.role || 'user',
        content: msg.content
      }));

      const response = await fetch(`${serverUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: formattedMessages,
          stream: true
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      await processStreamingResponse(reader);
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Request was aborted');
        return;
      }
      console.error('Error sending message:', error);
      
      // Add error message to conversation
      setConversations(prev => prev.map(conv => 
        conv.id === currentConversationId
          ? {
              ...conv,
              messages: [
                ...conv.messages,
                {
                  content: `Error: ${error.message}`,
                  timestamp: new Date().toISOString(),
                  role: 'error',
                }
              ]
            }
          : conv
      ));
    } finally {
      setThinking(prev => ({ ...prev, [position]: false }));
      abortControllerRef.current = null;
    }
  }, [
    inputValue,
    selectedModel,
    isModelSwitching,
    currentConversationId,
    position,
    serverUrl,
    processStreamingResponse,
    setThinking,
    onMessageSubmit,
    conversations,
    setConversations,
    setStreamingResponses
  ]);

  // Add handleNewConversation function
  const handleNewConversation = useCallback(() => {
    const newConversation = {
      id: Date.now().toString(),
      name: 'New Conversation',
      timestamp: new Date().toISOString(),
      messages: []
    };
    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  }, []);

  // Add handleMenuAction function
  const handleMenuAction = useCallback(async (action) => {
    switch (action) {
      case 'new':
        handleNewConversation();
        break;
      case 'clear':
        updateConversationMessages([]);
        break;
      case 'delete':
        setConversations(prev => {
          const updatedConversations = prev.filter(conv => conv.id !== currentConversationId);
          if (updatedConversations.length === 0) {
            const newConversation = {
              id: Date.now().toString(),
              name: 'New Conversation',
              messages: [],
              timestamp: new Date().toISOString()
            };
            return [newConversation];
          }
          setCurrentConversationId(updatedConversations[0].id);
          return updatedConversations;
        });
        break;
      default:
        break;
    }
    setMenuAnchor(null);
  }, [currentConversationId, handleNewConversation, updateConversationMessages]);

  // Update ThinkingIndicator to ensure stop button is properly connected
  const ThinkingIndicator = memo(({ isThinking, onStop }) => (
    isThinking ? (
      <Message align="left">
        <MessageContent 
          align="left" 
          sx={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.2)',
            minWidth: '200px',
            width: 'fit-content',
            maxWidth: '70%',
            position: 'relative',
            padding: '12px 16px'
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1
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
        </MessageContent>
      </Message>
    ) : null
  ));

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
            {models.length > 0 ? (
              <ModelSelector size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={selectedModel || ''}
                  onChange={(e) => handleModelChange(e.target.value)}
                  variant="standard"
                  displayEmpty
                >
                  {models.map((model) => (
                    <MenuItem 
                      key={model.id} 
                      value={model.id}
                      sx={{ 
                        color: loadedModels.has(model.id) ? '#2e7d32' : '#ed6c02',
                        fontWeight: loadedModels.has(model.id) ? 600 : 400,
                        '&:hover': {
                          backgroundColor: loadedModels.has(model.id) 
                            ? 'rgba(46, 125, 50, 0.08)'  // Green hover
                            : 'rgba(237, 108, 2, 0.08)'  // Orange hover
                        }
                      }}
                    >
                      {loadedModels.has(model.id) ? '● ' : '○ '}
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
          <Tooltip title={brainstormEnabled ? "AI Brainstorm Active" : "Enable AI Brainstorm\nRight-click to set iterations"}>
            <IconButton 
              onClick={handleBrainstormToggle}
              onContextMenu={handleBrainstormContextMenu}
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
            onClick={handleNewConversation}
            title="New Conversation"
          >
            <AddIcon />
          </IconButton>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
        </Box>
      </ChatHeader>

      <MessageList
        ref={messageListRef}
        onScroll={(e) => {
          if (isScrolledToBottom()) {
            setUserHasScrolled(false);
          }
        }}
      >
        {currentConversation?.messages?.map((msg, index) => (
          <MessageComponent
            key={`${msg.timestamp}-${index}-${msg.content.substring(0, 20)}`}
            message={msg}
            align={msg.role === 'user' ? 'right' : 'left'}
          />
        ))}
        {streamingResponse && (
          <MessageComponent
            message={{
              content: streamingResponse,
              timestamp: new Date().toISOString(),
              role: 'assistant'
            }}
            align="left"
          />
        )}
        {isThinking && (
          <ThinkingIndicator 
            isThinking={isThinking} 
            onStop={handleStopResponse}
          />
        )}
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
                    onClick={() => handleSendMessage()}
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
        <MenuItem onClick={handleDownloadBrainstorm}>
          Download Conversation
        </MenuItem>
        <MenuItem onClick={() => setHealthChecksEnabled(prev => !prev)}>
          {healthChecksEnabled ? '✓ ' : ''} Health Checks Enabled
        </MenuItem>
        <Divider />
        <MenuItem 
          onClick={() => handleModelAction('refresh')}
          disabled={!selectedModel || isModelSwitching}
        >
          Refresh Current Model
        </MenuItem>
      </Menu>

      <ConversationHeader>
        <ConversationName>
          {isEditingName ? (
            <EditableTitle>
              <input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSaveName()}
                autoFocus
              />
              <IconButton size="small" onClick={handleSaveName}>
                <CheckIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={handleCancelEdit}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </EditableTitle>
          ) : (
            <>
              <Typography variant="h6" component="div">
                {currentConversation.name}
              </Typography>
              <IconButton size="small" onClick={handleEditName}>
                <EditIcon fontSize="small" />
              </IconButton>
              <Box className="timestamp-group">
                <Typography className="timestamp" component="span">
                  {new Date(currentConversation.timestamp).toLocaleString()}
                </Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleNewConversation}
                  size="small"
                >
                  New Chat
                </Button>
                <Select
                  value={currentConversationId}
                  onChange={(e) => setCurrentConversationId(e.target.value)}
                  size="small"
                  sx={{ minWidth: 120 }}
                >
                  {conversations.map(conv => (
                    <MenuItem key={conv.id} value={conv.id}>
                      {conv.name} - {new Date(conv.timestamp).toLocaleDateString()}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            </>
          )}
        </ConversationName>
      </ConversationHeader>

      <Menu
        anchorEl={brainstormMenuAnchor}
        open={Boolean(brainstormMenuAnchor)}
        onClose={() => setBrainstormMenuAnchor(null)}
      >
        <MenuItem onClick={() => handleBrainstormIterationChange(-1)}>
          Infinite Iterations
        </MenuItem>
        {[1, 2, 3, 5, 10].map(count => (
          <MenuItem 
            key={count}
            onClick={() => handleBrainstormIterationChange(count)}
          >
            {count} Iteration{count > 1 ? 's' : ''}
          </MenuItem>
        ))}
      </Menu>
    </StyledPaper>
  );
}

export default ChatWindow; 