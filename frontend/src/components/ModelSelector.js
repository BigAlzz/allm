import React from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box
} from '@mui/material';

const ModelSelector = ({ models, selectedModel, onModelChange, disabled }) => {
  return (
    <Box sx={{ minWidth: 200 }}>
      <FormControl fullWidth size="small">
        <InputLabel>Model</InputLabel>
        <Select
          value={selectedModel || ''}
          label="Model"
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled || models.length === 0}
        >
          {models.map((model) => (
            <MenuItem key={model.id} value={model.id}>
              {model.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default ModelSelector; 