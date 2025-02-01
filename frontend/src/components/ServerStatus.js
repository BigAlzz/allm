import React from 'react';
import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';

const ServerStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'success.main';
      case 'offline':
        return 'error.main';
      default:
        return 'warning.main';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <CheckCircleIcon sx={{ color: getStatusColor() }} />;
      case 'offline':
        return <ErrorIcon sx={{ color: getStatusColor() }} />;
      default:
        return <HourglassEmptyIcon sx={{ color: getStatusColor() }} />;
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {getStatusIcon()}
      <Typography
        variant="body2"
        sx={{
          color: getStatusColor(),
          fontWeight: 'medium',
          textTransform: 'capitalize'
        }}
      >
        LM Studio: {status}
      </Typography>
    </Box>
  );
};

export default ServerStatus; 