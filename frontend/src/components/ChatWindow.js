import React, { useState, useRef, useEffect } from 'react';
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
} from '@mui/material';
import {
  Send as SendIcon,
  MoreVert as MoreIcon,
  VideoCall as VideoIcon,
  OpenInFull as ExpandIcon,
  Image as ImageIcon,
  EmojiEmotions as EmojiIcon,
  Stop as StopIcon,
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

function ChatWindow({
  position,
  models,
  streamingResponse,
  isThinking,
  setStreamingResponses,
  setThinking,
  serverUrl,
}) {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingResponse]);

  useEffect(() => {
    if (models.length > 0 && !selectedModel) {
      // Try to select deepseek or qwen model by default if available
      const preferredModel = models.find(m => {
        const name = m.name.toLowerCase();
        return name.includes('deepseek') || name.includes('qwen');
      });
      setSelectedModel(preferredModel?.id || models[0].id);
    }
  }, [models, selectedModel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStopResponse = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setThinking(prev => ({ ...prev, [position]: false }));
      setStreamingResponses(prev => ({ ...prev, [position]: '' }));
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    if (!models.length) {
      setMessages(prev => [
        ...prev,
        {
          content: 'No AI models available in LM Studio. Please load a model first.',
          timestamp: new Date().toISOString(),
          role: 'error',
        },
      ]);
      return;
    }
    if (!selectedModel) {
      setSelectedModel(models[0]?.id);
      return;
    }

    const newMessage = {
      content: inputValue,
      timestamp: new Date().toISOString(),
      role: 'user',
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');
    setThinking(prev => ({ ...prev, [position]: true }));

    let retryCount = 0;
    const maxRetries = 2;

    const attemptSend = async () => {
      try {
        // Create new AbortController for this request
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort();
          }
        }, 30000);

        const response = await fetch(`${serverUrl}/v1/chat/completions`, {
          method: 'POST',
          signal: abortControllerRef.current.signal,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: selectedModel,
            messages: [...messages, newMessage].map(msg => ({
              role: msg.role === 'error' ? 'assistant' : msg.role,
              content: msg.content
            })),
            stream: true,
            temperature: 0.7,
            max_tokens: 2000
          }),
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('Server response has no body');
        }

        const reader = response.body.getReader();
        let responseText = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.trim() || line.includes('[DONE]')) continue;

              try {
                const jsonStr = line.replace(/^data: /, '');
                const data = JSON.parse(jsonStr);

                if (data.choices && data.choices[0]?.delta?.content) {
                  const newContent = data.choices[0].delta.content;
                  responseText += newContent;
                  setStreamingResponses(prev => ({
                    ...prev,
                    [position]: prev[position] + newContent
                  }));
                }
              } catch (e) {
                console.warn('Error parsing chunk:', e);
              }
            }
          }
        } finally {
          if (responseText) {
            setMessages(prev => [...prev, {
              content: responseText,
              timestamp: new Date().toISOString(),
              role: 'assistant',
            }]);
          }
          setStreamingResponses(prev => ({ ...prev, [position]: '' }));
          setThinking(prev => ({ ...prev, [position]: false }));
          abortControllerRef.current = null;
        }
        return true; // Success
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('Request aborted');
          return true; // Don't retry if aborted
        }

        console.error('Error:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = Math.min(1000 * Math.pow(2, retryCount), 4000);
          console.log(`Retrying in ${delay/1000} seconds... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return false; // Retry needed
        }
        
        let errorMessage = 'Unable to get response from LM Studio. ';
        if (error.name === 'AbortError') {
          errorMessage += 'Request timed out. The model might be too slow or not responding.';
        } else if (error.message === 'Failed to fetch') {
          errorMessage += `Please check that:\n1. LM Studio is still running\n2. Local Server is active\n3. Server address (${serverUrl}) is correct`;
        } else {
          errorMessage += error.message;
        }
        
        setMessages(prev => [
          ...prev,
          {
            content: errorMessage,
            timestamp: new Date().toISOString(),
            role: 'error',
          },
        ]);
        setThinking(prev => ({ ...prev, [position]: false }));
        return true; // Stop retrying
      }
    };

    // Keep trying until success or max retries reached
    while (!(await attemptSend())) {
      // Continue retrying
    }
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
      setMessages(prev => [...prev, {
        content: `📎 Uploaded file: ${file.name}`,
        timestamp: new Date().toISOString(),
        role: 'user',
        fileId: data.id,
      }]);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error.message);
      setMessages(prev => [...prev, {
        content: `Failed to upload file: ${error.message}`,
        timestamp: new Date().toISOString(),
        role: 'error',
      }]);
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

  return (
    <StyledPaper elevation={3}>
      <ChatHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>U</Avatar>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              User Name
            </Typography>
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
          <IconButton disabled={models.length === 0}>
            <VideoIcon />
          </IconButton>
          <IconButton>
            <ExpandIcon />
          </IconButton>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
        </Box>
      </ChatHeader>

      <MessageList>
        {messages.map((msg, index) => (
          <Message key={index} align={msg.role === 'user' ? 'right' : 'left'}>
            {msg.role === 'error' ? (
              <ErrorMessage>
                <CircularProgress size={16} color="error" />
                <Typography variant="body2">{msg.content}</Typography>
              </ErrorMessage>
            ) : (
              <>
                <MessageContent align={msg.role === 'user' ? 'right' : 'left'}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
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
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </Typography>
              </>
            )}
          </Message>
        ))}
        {streamingResponse && (
          <Message align="left">
            <MessageContent align="left">
              <ReactMarkdown>{streamingResponse}</ReactMarkdown>
            </MessageContent>
          </Message>
        )}
        {isThinking && (
          <Message align="left">
            <MessageContent align="left">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2">Thinking...</Typography>
                <IconButton 
                  size="small" 
                  onClick={handleStopResponse}
                  sx={{ 
                    ml: 1,
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
        )}
        <div ref={messagesEndRef} />
      </MessageList>

      <ChatFooter>
        <InputContainer>
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
        <MenuItem onClick={() => {
          setMessages([]);
          setMenuAnchor(null);
        }}>
          Clear Chat
        </MenuItem>
      </Menu>
    </StyledPaper>
  );
}

export default ChatWindow; 