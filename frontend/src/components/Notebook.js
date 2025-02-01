import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Drawer,
  Divider,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Close as CloseIcon,
  NoteAdd as NoteAddIcon,
  Edit as EditIcon,
  Add as AddIcon,
  MoreVert as MoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';

const Notebook = ({ open, onClose }) => {
  const [notebooks, setNotebooks] = useState(() => {
    const saved = localStorage.getItem('notebooks');
    return saved ? JSON.parse(saved) : [{
      id: 'default',
      name: 'My Notebook',
      notes: []
    }];
  });
  
  const [currentNotebookId, setCurrentNotebookId] = useState(() => {
    return notebooks[0]?.id || 'default';
  });

  const [editingName, setEditingName] = useState(null);
  const [editingNoteName, setEditingNoteName] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [noteMenuAnchor, setNoteMenuAnchor] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  useEffect(() => {
    localStorage.setItem('notebooks', JSON.stringify(notebooks));
  }, [notebooks]);

  const handleAddNotebook = () => {
    const newNotebook = {
      id: Date.now().toString(),
      name: 'New Notebook',
      notes: []
    };
    setNotebooks(prev => [...prev, newNotebook]);
    setCurrentNotebookId(newNotebook.id);
    setEditingName(newNotebook.id); // Start editing the new notebook name
  };

  const handleEditNotebookName = (notebookId, newName) => {
    setNotebooks(prev => prev.map(nb => 
      nb.id === notebookId ? { ...nb, name: newName } : nb
    ));
    setEditingName(null);
  };

  const handleEditNoteName = (noteId, newName) => {
    setNotebooks(prev => prev.map(nb => 
      nb.id === currentNotebookId ? {
        ...nb,
        notes: nb.notes.map(note => 
          note.id === noteId ? { ...note, name: newName } : note
        )
      } : nb
    ));
    setEditingNoteName(null);
  };

  const handleDeleteNotebook = (notebookId) => {
    setNotebooks(prev => {
      const filtered = prev.filter(nb => nb.id !== notebookId);
      if (filtered.length === 0) {
        // Create a new default notebook if all are deleted
        return [{
          id: 'default',
          name: 'My Notebook',
          notes: []
        }];
      }
      return filtered;
    });
    setCurrentNotebookId(notebooks[0]?.id || 'default');
    setMenuAnchor(null);
  };

  useEffect(() => {
    const handleAddToNotebook = (event) => {
      const { content, timestamp, role } = event.detail;
      const newNote = {
        id: Date.now().toString(),
        name: content.slice(0, 30) + (content.length > 30 ? '...' : ''),
        content,
        timestamp,
        role,
      };

      setNotebooks(prev => prev.map(nb =>
        nb.id === currentNotebookId
          ? { ...nb, notes: [newNote, ...nb.notes] }
          : nb
      ));
    };

    window.addEventListener('addToNotebook', handleAddToNotebook);
    return () => window.removeEventListener('addToNotebook', handleAddToNotebook);
  }, [currentNotebookId]);

  const handleDeleteNote = (noteId) => {
    setNotebooks(prev => prev.map(nb =>
      nb.id === currentNotebookId
        ? { ...nb, notes: nb.notes.filter(note => note.id !== noteId) }
        : nb
    ));
    setNoteMenuAnchor(null);
  };

  const currentNotebook = notebooks.find(nb => nb.id === currentNotebookId) || notebooks[0];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: '400px',
          maxWidth: '100%',
          bgcolor: 'background.paper',
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NoteAddIcon />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {editingName === currentNotebookId ? (
                <TextField
                  autoFocus
                  size="small"
                  defaultValue={currentNotebook.name}
                  onBlur={(e) => handleEditNotebookName(currentNotebookId, e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleEditNotebookName(currentNotebookId, e.target.value);
                    }
                  }}
                />
              ) : (
                <>
                  <Typography variant="h6" component="div">
                    {currentNotebook.name}
                  </Typography>
                  <IconButton size="small" onClick={() => setEditingName(currentNotebookId)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
            >
              <MoreIcon />
            </IconButton>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        <List sx={{ flexGrow: 1, overflow: 'auto' }}>
          {currentNotebook.notes.map((note) => (
            <React.Fragment key={note.id}>
              <ListItem
                sx={{
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 1,
                  position: 'relative',
                  '&:hover': {
                    bgcolor: 'action.hover',
                    '& .note-actions': {
                      opacity: 1,
                    }
                  }
                }}
              >
                <Box sx={{ 
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {editingNoteName === note.id ? (
                    <TextField
                      autoFocus
                      size="small"
                      defaultValue={note.name}
                      onBlur={(e) => handleEditNoteName(note.id, e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleEditNoteName(note.id, e.target.value);
                        }
                      }}
                    />
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle2">
                        {note.name}
                      </Typography>
                      <IconButton 
                        size="small" 
                        onClick={() => setEditingNoteName(note.id)}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )}
                  <Box className="note-actions" sx={{ 
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    display: 'flex',
                    gap: 1
                  }}>
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        setSelectedNoteId(note.id);
                        setNoteMenuAnchor(e.currentTarget);
                      }}
                    >
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                <Box sx={{ 
                  width: '100%',
                  p: 1.5,
                  borderRadius: 1,
                  bgcolor: 'background.default',
                  '& p': { m: 0 }
                }}>
                  <ReactMarkdown>{note.content}</ReactMarkdown>
                </Box>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ alignSelf: 'flex-end' }}
                >
                  {new Date(note.timestamp).toLocaleString()}
                </Typography>
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
          {currentNotebook.notes.length === 0 && (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No notes yet. Click on any message and select "Add to Notebook" to save it here.
              </Typography>
            </Box>
          )}
        </List>
      </Box>

      {/* Notebook Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        <MenuItem onClick={handleAddNotebook}>
          <ListItemIcon>
            <AddIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>New Notebook</ListItemText>
        </MenuItem>
        {notebooks.length > 1 && (
          <MenuItem 
            onClick={() => handleDeleteNotebook(currentNotebookId)}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete Notebook</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Note Menu */}
      <Menu
        anchorEl={noteMenuAnchor}
        open={Boolean(noteMenuAnchor)}
        onClose={() => setNoteMenuAnchor(null)}
      >
        <MenuItem 
          onClick={() => {
            handleDeleteNote(selectedNoteId);
            setSelectedNoteId(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete Note</ListItemText>
        </MenuItem>
      </Menu>
    </Drawer>
  );
};

export default Notebook; 