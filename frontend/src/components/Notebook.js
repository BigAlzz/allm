import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Tooltip,
  Fab,
  TextField,
  Chip,
  Menu,
  MenuItem,
  InputAdornment,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  NoteAdd as NoteAddIcon,
  MenuBook as NotebookIcon,
  Search as SearchIcon,
  Label as LabelIcon,
  Share as ShareIcon,
  GetApp as ExportIcon,
  Upload as ImportIcon,
  Sort as SortIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import { alpha } from '@mui/material/styles';

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: '400px',
    maxWidth: '90vw',
    backgroundColor: theme.palette.background.default,
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
}));

const NotebookHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

const NotebookContent = styled(Box)(({ theme }) => ({
  height: 'calc(100vh - 64px)', // Adjust based on header height
  overflow: 'auto',
  padding: theme.spacing(2),
}));

const NotebookEntry = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

const FloatingButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  right: theme.spacing(3),
  bottom: theme.spacing(3),
  zIndex: theme.zIndex.drawer - 1,
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: theme.spacing(3),
  color: theme.palette.text.secondary,
  '& svg': {
    fontSize: 48,
    marginBottom: theme.spacing(2),
    opacity: 0.5,
  },
}));

const NotebookContainer = styled(Box)(({ theme }) => ({
  position: 'fixed',
  top: 0,
  right: 0,
  width: '400px',
  height: '100vh',
  backgroundColor: theme.palette.background.paper,
  borderLeft: `1px solid ${theme.palette.divider}`,
  boxShadow: theme.shadows[10],
  display: 'flex',
  flexDirection: 'column',
  zIndex: theme.zIndex.drawer + 2,
  transform: 'translateX(100%)',
  transition: 'transform 0.3s ease-in-out, background-color 0.2s ease',
  '&.open': {
    transform: 'translateX(0)',
  },
  '&.drag-over': {
    backgroundColor: alpha(theme.palette.primary.main, 0.1),
    '& .MuiTypography-root': {
      color: theme.palette.primary.main,
    }
  }
}));

function Notebook({ onClose, isOpen }) {
  const [notebooks, setNotebooks] = useState(() => {
    const saved = localStorage.getItem('notebooks');
    return saved ? JSON.parse(saved) : [{ id: 'default', name: 'Default Notebook', entries: [] }];
  });
  const [currentNotebookId, setCurrentNotebookId] = useState(() => {
    const saved = localStorage.getItem('current-notebook');
    return saved || 'default';
  });
  const [notebookDialogOpen, setNotebookDialogOpen] = useState(false);
  const [notebookDialogMode, setNotebookDialogMode] = useState('add'); // 'add' or 'edit'
  const [notebookDialogData, setNotebookDialogData] = useState({ name: '' });
  const [entries, setEntries] = useState(() => {
    return notebooks.find(n => n.id === currentNotebookId)?.entries || [];
  });
  const [editMode, setEditMode] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMenuAnchor, setSortMenuAnchor] = useState(null);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState('desc');
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('notebook-categories');
    return saved ? JSON.parse(saved) : ['General', 'Important', 'Code', 'Ideas'];
  });
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    localStorage.setItem('notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

  useEffect(() => {
    localStorage.setItem('current-notebook', currentNotebookId);
  }, [currentNotebookId]);

  useEffect(() => {
    const handleAddToNotebook = (event) => {
      const { detail } = event;
      if (detail) {
        setEntries(prev => [...prev, {
          id: Date.now(),
          ...detail,
          category: 'General',
          tags: [],
          timestamp: new Date().toISOString()
        }]);
      }
    };

    window.addEventListener('addToNotebook', handleAddToNotebook);
    return () => window.removeEventListener('addToNotebook', handleAddToNotebook);
  }, []);

  useEffect(() => {
    setNotebooks(prev => prev.map(notebook =>
      notebook.id === currentNotebookId
        ? { ...notebook, entries }
        : notebook
    ));
  }, [entries, currentNotebookId]);

  const currentNotebook = useMemo(() => 
    notebooks.find(n => n.id === currentNotebookId) || notebooks[0],
    [notebooks, currentNotebookId]
  );

  const handleDelete = (entryId) => {
    setEntries(prev => prev.filter(entry => entry.id !== entryId));
  };

  const handleEdit = (entry) => {
    setEditingEntry({
      ...entry,
      newContent: entry.content,
      newCategory: entry.category || 'General',
      newTags: entry.tags || []
    });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingEntry) {
      setEntries(prev => prev.map(entry => 
        entry.id === editingEntry.id
          ? {
              ...entry,
              content: editingEntry.newContent,
              category: editingEntry.newCategory,
              tags: editingEntry.newTags,
              lastEdited: new Date().toISOString()
            }
          : entry
      ));
    }
    setEditDialogOpen(false);
    setEditingEntry(null);
  };

  const handleAddCategory = (newCategory) => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories(prev => [...prev, newCategory]);
    }
  };

  const handleAddTag = (entryId, newTag) => {
    setEntries(prev => prev.map(entry =>
      entry.id === entryId
        ? { ...entry, tags: [...(entry.tags || []), newTag] }
        : entry
    ));
  };

  const handleExport = () => {
    const exportData = {
      entries,
      categories,
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notebook-export-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          if (importedData.version && importedData.entries) {
            setEntries(prev => [...prev, ...importedData.entries]);
            if (importedData.categories) {
              setCategories(prev => [...new Set([...prev, ...importedData.categories])]);
            }
          }
        } catch (error) {
          console.error('Error importing notebook:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddNotebook = () => {
    setNotebookDialogData({ name: '' });
    setNotebookDialogMode('add');
    setNotebookDialogOpen(true);
  };

  const handleEditNotebook = (notebook) => {
    setNotebookDialogData({ id: notebook.id, name: notebook.name });
    setNotebookDialogMode('edit');
    setNotebookDialogOpen(true);
  };

  const handleDeleteNotebook = (notebookId) => {
    if (notebooks.length === 1) {
      // Don't allow deleting the last notebook
      return;
    }

    setNotebooks(prev => {
      const filtered = prev.filter(n => n.id !== notebookId);
      if (currentNotebookId === notebookId) {
        // If we're deleting the current notebook, switch to another one
        setCurrentNotebookId(filtered[0].id);
      }
      return filtered;
    });
  };

  const handleNotebookDialogSave = () => {
    if (!notebookDialogData.name.trim()) return;

    if (notebookDialogMode === 'add') {
      const newNotebook = {
        id: Date.now().toString(),
        name: notebookDialogData.name.trim(),
        entries: []
      };
      setNotebooks(prev => [...prev, newNotebook]);
      setCurrentNotebookId(newNotebook.id);
    } else {
      setNotebooks(prev => prev.map(notebook =>
        notebook.id === notebookDialogData.id
          ? { ...notebook, name: notebookDialogData.name.trim() }
          : notebook
      ));
    }
    setNotebookDialogOpen(false);
  };

  const filteredAndSortedEntries = entries
    .filter(entry => {
      const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          entry.metadata?.modelName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (entry.tags || []).some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || entry.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const aValue = sortBy === 'timestamp' ? a.timestamp : a.content;
      const bValue = sortBy === 'timestamp' ? b.timestamp : b.content;
      return sortDirection === 'desc' ? 
        bValue.localeCompare(aValue) :
        aValue.localeCompare(bValue);
    });

  return (
    <NotebookContainer 
      className={`${isOpen ? 'open' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        try {
          const jsonData = e.dataTransfer.getData('application/json');
          if (jsonData) {
            const data = JSON.parse(jsonData);
            if (data.type === 'chat_message') {
              const newEntry = {
                id: Date.now(),
                content: data.content,
                timestamp: new Date().toISOString(),
                metadata: data.metadata,
                category: 'General',
                tags: []
              };
              setEntries(prev => [...prev, newEntry]);
            }
          }
        } catch (error) {
          console.error('Error handling drop:', error);
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        if (!isDragOver) {
          setIsDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragOver(false);
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6">Notebook</Typography>
          <Tooltip title="Add Entry">
            <IconButton size="small" onClick={handleAddNotebook}>
              <AddIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Notebook">
            <IconButton size="small" onClick={handleExport}>
              <ExportIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Import Notebook">
            <IconButton 
              size="small" 
              component="label"
            >
              <input
                type="file"
                hidden
                accept=".json"
                onChange={handleImport}
              />
              <ImportIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <NotebookContent>
        {filteredAndSortedEntries.length === 0 ? (
          <EmptyState>
            <NoteAddIcon />
            <Typography variant="body1">
              {searchQuery
                ? 'No entries match your search'
                : 'Your notebook is empty. Drag and drop messages here or use the "Add to Notebook" option in message menus.'}
            </Typography>
          </EmptyState>
        ) : (
          filteredAndSortedEntries.map((entry) => (
            <NotebookEntry key={entry.id} elevation={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    {new Date(entry.timestamp).toLocaleString()}
                  </Typography>
                  <Chip
                    size="small"
                    label={entry.category || 'General'}
                    sx={{ ml: 1 }}
                  />
                </Box>
                <Box>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleEdit(entry)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => handleDelete(entry.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
              <ReactMarkdown>{entry.content}</ReactMarkdown>
              {entry.metadata && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  From: {entry.metadata.modelName || 'Unknown Model'}
                </Typography>
              )}
              {entry.tags && entry.tags.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {entry.tags.map(tag => (
                    <Chip
                      key={tag}
                      label={tag}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            </NotebookEntry>
          ))
        )}
      </NotebookContent>
    </NotebookContainer>
  );
}

export default Notebook; 