import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Tooltip,
  Select,
  MenuItem,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Collapse,
  CircularProgress,
  Divider,
  Switch,
  FormControlLabel,
  Badge,
} from '@mui/material';
import {
  DragHandle as DragIcon,
  PlayArrow as PlayIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  MenuBook as NotebookIcon,
  Download as DownloadIcon,
  Psychology as BrainstormIcon,
  Loop as LoopIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { processWithAssistant, generateSummary } from '../utils/brainstormUtils';

// Model configuration presets
const MODEL_PRESETS = {
  creative: {
    name: "Creative",
    config: {
      temperature: 0.9,
      max_tokens: 2000,
      top_p: 0.95,
      frequency_penalty: 0.5,
      presence_penalty: 0.5
    }
  },
  balanced: {
    name: "Balanced",
    config: {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.2
    }
  },
  precise: {
    name: "Precise",
    config: {
      temperature: 0.3,
      max_tokens: 2000,
      top_p: 0.8,
      frequency_penalty: 0,
      presence_penalty: 0
    }
  }
};

const BrainstormControl = ({ panels, onSubmitToPanels, currentMessage, onToggleNotebook, models }) => {
  const [sequence, setSequence] = useState([]);
  const [selectedOutputPanel, setSelectedOutputPanel] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const [selectedPanelForSettings, setSelectedPanelForSettings] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(-1);
  const [brainstormEnabled, setBrainstormEnabled] = useState(false);
  const [iterationCounts, setIterationCounts] = useState({});

  // Process message through the sequence
  const processSequence = useCallback(async (message) => {
    if (!message || sequence.length === 0 || !brainstormEnabled) return;
    
    setIsProcessing(true);
    setResults(null);
    
    try {
      let currentMessage = message;
      const results = [];
      
      // Process through each assistant in sequence
      for (let i = 0; i < sequence.length; i++) {
        const item = sequence[i];
        setCurrentProcessingIndex(i);
        
        // Process with current assistant
        const response = await processWithAssistant(
          item.panelId, 
          currentMessage,
          item.modelId,
          item.config
        );
        
        results.push({
          panelId: item.panelId,
          modelId: item.modelId,
          response
        });

        // Update current message for next iteration
        currentMessage = response.response;
        
        // Submit intermediate results to panel
        onSubmitToPanels(item.panelId, response.response);
      }

      setResults(results);
      
    } catch (error) {
      console.error('Brainstorm error:', error);
    } finally {
      setIsProcessing(false);
      setCurrentProcessingIndex(-1);
    }
  }, [sequence, brainstormEnabled, onSubmitToPanels]);

  // Update useEffect to use processSequence
  useEffect(() => {
    if (currentMessage) {
      processSequence(currentMessage);
    }
  }, [currentMessage, processSequence]);

  // Add a panel to the sequence with default preset
  const handleAddToSequence = useCallback((panelId) => {
    const panel = panels.find(p => p.id === panelId);
    if (!panel || !panel.selectedModel) return;

    const newItem = {
      id: `seq-${Date.now()}`,
      panelId,
      modelId: panel.selectedModel,
      preset: 'balanced',
      config: { ...MODEL_PRESETS.balanced.config },
      iterationCount: (iterationCounts[panelId] || 0) + 1
    };

    setSequence(prev => [...prev, newItem]);
    setIterationCounts(prev => ({
      ...prev,
      [panelId]: (prev[panelId] || 0) + 1
    }));
  }, [panels, iterationCounts]);

  // Move an item up in the sequence
  const handleMoveUp = useCallback((index) => {
    if (index <= 0) return;
    setSequence(prev => {
      const newSequence = [...prev];
      [newSequence[index], newSequence[index - 1]] = [newSequence[index - 1], newSequence[index]];
      return newSequence;
    });
  }, []);

  // Move an item down in the sequence
  const handleMoveDown = useCallback((index) => {
    if (index >= sequence.length - 1) return;
    setSequence(prev => {
      const newSequence = [...prev];
      [newSequence[index], newSequence[index + 1]] = [newSequence[index + 1], newSequence[index]];
      return newSequence;
    });
  }, [sequence.length]);

  // Helper function to get assistant name from panel
  const getAssistantName = (panelId) => {
    const panel = panels.find(p => p.id === panelId);
    return panel?.assistantName || `Assistant ${panels.findIndex(p => p.id === panelId) + 1}`;
  };

  // Display current configuration
  const renderConfigInfo = (item) => {
    const preset = item.preset || 'balanced';
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
        <Tooltip title={
          <Box>
            <Typography variant="body2">Preset: {MODEL_PRESETS[preset].name}</Typography>
          </Box>
        }>
          <IconButton size="medium" color="primary">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>
    );
  };

  // Remove a panel from the sequence
  const handleRemoveFromSequence = (sequenceId) => {
    setSequence(prev => prev.filter(item => item.id !== sequenceId));
  };

  // Open model settings dialog
  const handleOpenModelSettings = (sequenceItem) => {
    // Find the panel's current model
    const panel = panels.find(p => p.id === sequenceItem.panelId);
    
    // Update the sequence item to use the panel's selected model if it exists
    const updatedItem = {
      ...sequenceItem,
      modelId: panel?.selectedModel || sequenceItem.modelId
    };
    
    setSelectedPanelForSettings(updatedItem);
    setModelSettingsOpen(true);
  };

  // Update model for a panel
  const handleModelChange = (modelId) => {
    if (!selectedPanelForSettings) return;
    
    setSequence(prev => prev.map(item => 
      item.id === selectedPanelForSettings.id
        ? { ...item, modelId }
        : item
    ));
    setModelSettingsOpen(false);
  };

  const handleDownloadReport = () => {
    if (!results) return;

    const formatTimestamp = (date) => {
      return new Date(date).toLocaleString();
    };

    const formatEntry = (entry, index) => {
      return `Assistant ${index + 1} Response:
Model: ${entry.modelId}
${entry.response}
-------------------
`;
    };

    const report = `AI Brainstorm Report
Generated: ${formatTimestamp(new Date())}
===================

Original Message:
${currentMessage}

Processing Sequence:
${sequence.map((item, index) => `${index + 1}. ${getAssistantName(item.panelId)} (${item.modelId})`).join('\n')}

Results:
${results.map((entry, index) => formatEntry(entry, index)).join('\n')}

Summary:
${results.reduce((acc, entry) => {
  const key = entry.panelId;
  acc[key] = entry.response;
  return acc;
}, {})}
`;

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainstorm-report-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ position: 'relative', mb: isExpanded ? 1 : 0 }}>
      <Paper sx={{ 
        p: isExpanded ? 1 : 0.5,
        m: 1,
        minHeight: isExpanded ? 'auto' : '40px'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: isExpanded ? 1 : 0
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <BrainstormIcon 
              sx={{ 
                color: brainstormEnabled ? 'primary.main' : 'text.secondary',
                mr: 1
              }} 
            />
            <FormControlLabel
              control={
                <Switch
                  checked={brainstormEnabled}
                  onChange={(e) => setBrainstormEnabled(e.target.checked)}
                  size="small"
                />
              }
              label={
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontSize: isExpanded ? '1.1rem' : '1rem',
                    color: brainstormEnabled ? 'primary.main' : 'text.primary'
                  }}
                >
                  AI Brainstorm {brainstormEnabled ? '(Active)' : '(Off)'}
                </Typography>
              }
            />
            {isProcessing && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Processing {currentProcessingIndex + 1}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {results && (
              <Tooltip title="Download Report">
                <IconButton 
                  onClick={handleDownloadReport}
                  color="primary"
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Open Notebook">
              <IconButton 
                onClick={onToggleNotebook}
                color="primary"
              >
                <NotebookIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={isExpanded ? "Collapse" : "Expand"}>
              <IconButton onClick={() => setIsExpanded(prev => !prev)}>
                {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Collapse in={isExpanded} timeout="auto">
          {/* Sequence Builder */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Processing Sequence
            </Typography>
            <List dense sx={{ minHeight: sequence.length ? 'auto' : '50px' }}>
              {sequence.map((item, index) => (
                <ListItem
                  key={item.id}
                  sx={{ 
                    mb: 0.5,
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    }
                  }}
                >
                  <ListItemText 
                    primary={getAssistantName(item.panelId)}
                    secondary={`Model: ${item.modelId}`}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tooltip title={`Iteration ${item.iterationCount}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LoopIcon fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                          {item.iterationCount}
                        </Typography>
                      </Box>
                    </Tooltip>
                    <Box sx={{ display: 'flex', flexDirection: 'column', mr: 1 }}>
                      <IconButton 
                        onClick={() => handleMoveUp(index)}
                        size="small"
                        disabled={index === 0}
                        sx={{ p: 0.5 }}
                      >
                        <ArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        onClick={() => handleMoveDown(index)}
                        size="small"
                        disabled={index === sequence.length - 1}
                        sx={{ p: 0.5 }}
                      >
                        <ArrowDownIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <IconButton 
                      onClick={() => handleOpenModelSettings(item)}
                      size="small"
                    >
                      <SettingsIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleRemoveFromSequence(item.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>

            {/* Assistant Pills */}
            <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {panels.map((panel) => (
                <Tooltip 
                  key={panel.id} 
                  title={`Add to sequence (${iterationCounts[panel.id] || 0} iterations)`}
                >
                  <Chip
                    icon={<AddIcon />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getAssistantName(panel.id)}
                        <Badge 
                          badgeContent={iterationCounts[panel.id] || 0} 
                          color="primary"
                          sx={{ ml: 0.5 }}
                        >
                          <LoopIcon sx={{ fontSize: 14 }} />
                        </Badge>
                      </Box>
                    }
                    onClick={() => handleAddToSequence(panel.id)}
                    color="primary"
                    variant="outlined"
                    size="small"
                    sx={{ 
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover'
                      }
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>
          
          {/* Output Panel Selector */}
          <Box sx={{ mb: 1 }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Summary Assistant
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Select an assistant to generate the final summary
            </Typography>
            <Select
              value={selectedOutputPanel}
              onChange={(e) => setSelectedOutputPanel(e.target.value)}
              fullWidth
              size="small"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {panels.map((panel) => (
                <MenuItem key={panel.id} value={panel.id}>
                  {getAssistantName(panel.id)}
                </MenuItem>
              ))}
            </Select>
          </Box>
          
          {/* Results Display */}
          {results && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Results
              </Typography>
              <Paper variant="outlined" sx={{ p: 1 }}>
                {results.map((result, index) => (
                  <Box key={index} sx={{ mb: index < results.length - 1 ? 1 : 0 }}>
                    <Typography variant="subtitle2" color="primary" sx={{ mb: 0.5 }}>
                      {result.isSummary ? 'Final Summary' : `${getAssistantName(result.panelId)} (${result.modelId})`}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                      {result.response}
                    </Typography>
                    {index < results.length - 1 && (
                      <Divider sx={{ my: 1 }} />
                    )}
                  </Box>
                ))}
              </Paper>
            </Box>
          )}
        </Collapse>

        {/* Model Settings Dialog */}
        <Dialog 
          open={modelSettingsOpen} 
          onClose={() => setModelSettingsOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Model Settings for {selectedPanelForSettings ? 
              getAssistantName(selectedPanelForSettings.panelId) : 
              ''}
          </DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>Model</InputLabel>
              <Tooltip title={
                <Box>
                  <Typography variant="body2">Available Models:</Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    {models.map(model => (
                      <li key={model.id}>{model.name}</li>
                    ))}
                  </ul>
                  <Typography variant="body2">
                    These are the same models available in your chat assistants.
                    Each model has different capabilities and characteristics:
                  </Typography>
                  <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                    <li>Hermes/Nous: Good for general tasks and coding</li>
                    <li>Gemma: Efficient for shorter responses</li>
                    <li>Mixtral/Mistral: Strong reasoning and analysis</li>
                    <li>Neural/Code-Llama: Specialized for code generation</li>
                  </ul>
                </Box>
              } placement="right">
                <Select
                  value={selectedPanelForSettings?.modelId || ''}
                  onChange={(e) => handleModelChange(e.target.value)}
                  label="Model"
                >
                  {models.map((model) => (
                    <MenuItem key={model.id} value={model.id}>
                      {model.name}
                    </MenuItem>
                  ))}
                </Select>
              </Tooltip>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModelSettingsOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default React.memo(BrainstormControl); 