import React, { useState } from 'react';
import { Box, IconButton, Paper, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { Add as AddIcon, Close as CloseIcon } from '@mui/icons-material';
import BrainstormControl from './BrainstormControl';

const PanelContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',  // Changed to column to stack BrainstormControl above panels
  height: 'calc(100vh - 16px)',
  width: '100%',
  overflow: 'hidden',
  padding: theme.spacing(1),
  gap: theme.spacing(2),  // Add gap between BrainstormControl and panels
}));

const PanelsRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  flex: 1,
  overflow: 'hidden',
  gap: theme.spacing(2),  // Add gap between panels
}));

const Panel = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  flex: 1,
  minWidth: 300,
  position: 'relative',
  overflow: 'hidden',
  backgroundColor: theme.palette.background.default,
}));

const PanelHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
  userSelect: 'none',
}));

const PanelContent = styled(Box)({
  flex: 1,
  overflow: 'auto',
  position: 'relative',
  height: 'calc(100% - 48px)', // Account for header height
});

const AddPanelButton = styled(IconButton)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: theme.zIndex.drawer + 1,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
  },
  width: 56,
  height: 56,
}));

function PanelLayout({ children, currentMessage, isNotebookOpen, onToggleNotebook, models }) {
  const [panels, setPanels] = useState([
    { id: 'panel-1', selectedModel: null },
    { id: 'panel-2', selectedModel: null }
  ]);

  const handleRemovePanel = (panelId) => {
    if (panels.length > 1) {
      setPanels(prev => prev.filter(p => p.id !== panelId));
    }
  };

  const handleAddNewPanel = () => {
    setPanels(prev => [...prev, { id: `panel-${prev.length + 1}`, selectedModel: null }]);
  };

  // Update panel's selected model
  const handleModelSelect = (panelId, modelId) => {
    setPanels(prev => prev.map(p => 
      p.id === panelId ? { ...p, selectedModel: modelId } : p
    ));
  };

  // Handle submitting brainstorm results to a panel
  const handleSubmitToPanels = (targetPanelId, results) => {
    // This function will be implemented to handle sending results to the target panel
    console.log('Submitting to panel:', targetPanelId, results);
  };

  return (
    <>
      <PanelContainer>
        {/* Add BrainstormControl at the top */}
        <BrainstormControl 
          panels={panels}
          onSubmitToPanels={handleSubmitToPanels}
          currentMessage={currentMessage}
          onToggleNotebook={onToggleNotebook}
          models={models}
        />
        
        {/* Wrap panels in PanelsRow */}
        <PanelsRow>
          {panels.map((panel, index) => (
            <Panel key={panel.id} elevation={2}>
              <PanelHeader>
                Assistant {index + 1}
                {panels.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemovePanel(panel.id)}
                    sx={{ ml: 'auto' }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </PanelHeader>
              <PanelContent>
                {typeof children === 'function' ? 
                  children(panel.id, handleModelSelect) : 
                  children}
              </PanelContent>
            </Panel>
          ))}
        </PanelsRow>
      </PanelContainer>
      
      <Tooltip title="Add Assistant">
        <AddPanelButton
          color="primary"
          onClick={handleAddNewPanel}
          size="large"
        >
          <AddIcon />
        </AddPanelButton>
      </Tooltip>
    </>
  );
}

export default PanelLayout; 