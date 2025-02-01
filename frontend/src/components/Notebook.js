import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Divider,
  Tooltip,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  NoteAdd as NoteAddIcon,
  MoreVert as MoreIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';

const StyledPaper = styled(Paper)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(2),
}));

const NotebookHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

const NotebookContent = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  overflow: 'auto',
  padding: theme.spacing(2),
  '& .MuiListItem-root': {
    marginBottom: theme.spacing(2),
    borderRadius: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
  },
}));

const NotebookEntry = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: theme.spacing(1),
  backgroundColor: theme.palette.background.default,
  marginBottom: theme.spacing(2),
}));

function Notebook() {
  const [notebooks, setNotebooks] = useState(() => {
    try {
      const saved = localStorage.getItem('notebooks');
      const parsed = saved ? JSON.parse(saved) : null;
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [{
        id: Date.now().toString(),
        name: 'Default Notebook',
        entries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];
    } catch (error) {
      console.warn('Error loading notebooks:', error);
      return [{
        id: Date.now().toString(),
        name: 'Default Notebook',
        entries: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }];
    }
  });

  const [currentNotebookId, setCurrentNotebookId] = useState(() => {
    try {
      const saved = localStorage.getItem('currentNotebookId');
      return saved && notebooks.some(n => n.id === saved) ? saved : notebooks[0]?.id;
    } catch (error) {
      console.warn('Error loading current notebook ID:', error);
      return notebooks[0]?.id;
    }
  });

  const [menuAnchor, setMenuAnchor] = useState(null);
  const [newNotebookDialog, setNewNotebookDialog] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const currentNotebook = notebooks.find(n => n.id === currentNotebookId) || notebooks[0];

  useEffect(() => {
    localStorage.setItem('notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem('currentNotebookId', currentNotebookId);
  }, [currentNotebookId]);

  useEffect(() => {
    const handleAddToNotebook = (event) => {
      const { detail } = event;
      if (!detail || !currentNotebook) return;

      const newEntry = {
        id: Date.now().toString(),
        ...detail,
        addedAt: new Date().toISOString()
      };

      setNotebooks(prev => prev.map(notebook => 
        notebook.id === currentNotebookId
          ? {
              ...notebook,
              entries: [newEntry, ...notebook.entries],
              updatedAt: new Date().toISOString()
            }
          : notebook
      ));
    };

    window.addEventListener('addToNotebook', handleAddToNotebook);
    return () => window.removeEventListener('addToNotebook', handleAddToNotebook);
  }, [currentNotebookId, currentNotebook]);

  const handleCreateNotebook = () => {
    if (!newNotebookName.trim()) return;

    const newNotebook = {
      id: Date.now().toString(),
      name: newNotebookName.trim(),
      entries: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setNotebooks(prev => [newNotebook, ...prev]);
    setCurrentNotebookId(newNotebook.id);
    setNewNotebookDialog(false);
    setNewNotebookName('');
  };

  const handleDeleteNotebook = (notebookId) => {
    if (notebooks.length === 1) {
      // Don't delete the last notebook
      return;
    }

    setNotebooks(prev => {
      const filtered = prev.filter(n => n.id !== notebookId);
      if (notebookId === currentNotebookId) {
        setCurrentNotebookId(filtered[0]?.id);
      }
      return filtered;
    });
  };

  const handleDeleteEntry = (entryId) => {
    setNotebooks(prev => prev.map(notebook =>
      notebook.id === currentNotebookId
        ? {
            ...notebook,
            entries: notebook.entries.filter(e => e.id !== entryId),
            updatedAt: new Date().toISOString()
          }
        : notebook
    ));
  };

  const handleExportNotebook = (format = 'markdown') => {
    if (!currentNotebook) return;

    let content = `# ${currentNotebook.name}\n\n`;
    currentNotebook.entries.forEach(entry => {
      content += `## ${new Date(entry.addedAt).toLocaleString()}\n\n`;
      if (entry.metadata?.modelName) {
        content += `> Model: ${entry.metadata.modelName}\n\n`;
      }
      content += `${entry.content}\n\n---\n\n`;
    });

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentNotebook.name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <StyledPaper elevation={3}>
      <NotebookHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">
            {currentNotebook?.name || 'Notebook'}
          </Typography>
          <Tooltip title="Create new notebook">
            <IconButton size="small" onClick={() => setNewNotebookDialog(true)}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Export notebook">
            <IconButton 
              onClick={() => handleExportNotebook()}
              disabled={!currentNotebook?.entries?.length}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
          <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
            <MoreIcon />
          </IconButton>
        </Box>
      </NotebookHeader>

      <NotebookContent>
        {currentNotebook?.entries?.map((entry) => (
          <NotebookEntry key={entry.id}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              mb: 1 
            }}>
              <Typography variant="caption" color="textSecondary">
                {new Date(entry.addedAt).toLocaleString()}
                {entry.metadata?.modelName && ` • ${entry.metadata.modelName}`}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => handleDeleteEntry(entry.id)}
                sx={{ ml: 1 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
            <ReactMarkdown>{entry.content}</ReactMarkdown>
          </NotebookEntry>
        ))}
        {(!currentNotebook?.entries || currentNotebook.entries.length === 0) && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            opacity: 0.7 
          }}>
            <Typography variant="body2" color="textSecondary">
              No entries yet. Drag and drop messages here to add them to your notebook.
            </Typography>
          </Box>
        )}
      </NotebookContent>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {notebooks.map(notebook => (
          <MenuItem
            key={notebook.id}
            selected={notebook.id === currentNotebookId}
            onClick={() => {
              setCurrentNotebookId(notebook.id);
              setMenuAnchor(null);
            }}
          >
            <ListItemText 
              primary={notebook.name}
              secondary={`${notebook.entries?.length || 0} entries • ${new Date(notebook.updatedAt).toLocaleDateString()}`}
            />
            {notebooks.length > 1 && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteNotebook(notebook.id);
                }}
                sx={{ ml: 1 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            )}
          </MenuItem>
        ))}
      </Menu>

      <Dialog 
        open={newNotebookDialog} 
        onClose={() => {
          setNewNotebookDialog(false);
          setNewNotebookName('');
        }}
      >
        <DialogTitle>Create New Notebook</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Notebook Name"
            fullWidth
            value={newNotebookName}
            onChange={(e) => setNewNotebookName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleCreateNotebook();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewNotebookDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateNotebook}
            disabled={!newNotebookName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </StyledPaper>
  );
}

export default Notebook; 