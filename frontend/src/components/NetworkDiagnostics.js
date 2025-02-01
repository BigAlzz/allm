import React, { useState, useEffect } from 'react';
import {
  Button,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Box,
  Alert,
  Collapse,
  IconButton,
  styled,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { runNetworkDiagnostics } from '../tests/ChatConnection.test';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  backgroundImage: 'none',
  border: `1px solid ${theme.palette.divider}`,
  '& .MuiCardContent-root': {
    padding: theme.spacing(2),
  },
}));

const StatusBadge = styled(Badge)(({ theme }) => ({
  '& .MuiBadge-badge': {
    backgroundColor: '#44b700',
    color: '#44b700',
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    '&::after': {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      borderRadius: '50%',
      animation: 'ripple 1.2s infinite ease-in-out',
      border: '1px solid currentColor',
      content: '""',
    },
  },
  '@keyframes ripple': {
    '0%': {
      transform: 'scale(.8)',
      opacity: 1,
    },
    '100%': {
      transform: 'scale(2.4)',
      opacity: 0,
    },
  },
}));

const StatusList = styled(List)(({ theme }) => ({
  '& .MuiListItem-root': {
    padding: theme.spacing(0.5, 0),
  },
}));

const DetailsList = styled(List)(({ theme }) => ({
  '& .MuiListItem-root': {
    padding: theme.spacing(0.5, 0),
  },
  '& .MuiListItemText-secondary': {
    color: theme.palette.text.secondary,
  },
}));

const ExpandButton = styled(IconButton)(({ theme, expanded }) => ({
  transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
}));

const NetworkDiagnostics = ({ variant = 'full', showTestButton = true }) => {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      const results = await runNetworkDiagnostics();
      setDiagnostics(results);
      setExpanded(true);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
      setDiagnostics({ 
        serverReachable: false,
        endpoints: {},
        modelList: [],
        details: [],
        errors: [error.message]
      });
    } finally {
      setLoading(false);
    }
  };

  // Run diagnostics on mount and every 5 seconds
  useEffect(() => {
    runTests();
    const interval = setInterval(runTests, 5000);
    return () => clearInterval(interval);
  }, []);

  if (variant === 'compact') {
    const isConnected = diagnostics?.serverReachable;
    const hasModels = diagnostics?.modelList?.length > 0;
    const allEndpointsAvailable = diagnostics?.endpoints && 
      Object.values(diagnostics.endpoints).every(status => status);
    
    const getStatusColor = () => {
      if (!isConnected) return '#ff1744'; // Red for no connection
      if (!hasModels) return '#ff9800'; // Orange for no models
      if (!allEndpointsAvailable) return '#ffeb3b'; // Yellow for partial availability
      return '#44b700'; // Green for all good
    };

    const getStatusText = () => {
      if (!isConnected) return 'Not Connected';
      if (!hasModels) return 'No Models';
      if (!allEndpointsAvailable) return 'Partial';
      return 'Connected';
    };

    const getTooltipText = () => {
      if (!isConnected) return 'Not Connected to LM Studio';
      if (!hasModels) return 'Connected but no models loaded';
      if (!allEndpointsAvailable) return 'Some endpoints are not available';
      return 'Connected to LM Studio';
    };

    const statusColor = getStatusColor();
    const statusText = getStatusText();

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Tooltip title={getTooltipText()}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusBadge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              variant="dot"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: statusColor,
                  color: statusColor,
                  '&::after': {
                    animation: isConnected ? 'ripple 1.2s infinite ease-in-out' : 'none',
                  },
                },
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  color: statusColor,
                  fontWeight: 500,
                  fontSize: '0.875rem',
                }}
              >
                {statusText}
              </Typography>
            </StatusBadge>
          </Box>
        </Tooltip>
        {showTestButton && (
          <Button
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={runTests}
            disabled={loading}
          >
            Test
          </Button>
        )}
      </Box>
    );
  }

  return (
    <StyledCard>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500 }}>
              LM Studio Status
            </Typography>
            {diagnostics && (
              <ExpandButton
                size="small"
                onClick={() => setExpanded(!expanded)}
                expanded={expanded}
              >
                <ExpandIcon />
              </ExpandButton>
            )}
          </Box>
          {showTestButton && (
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
              onClick={runTests}
              disabled={loading}
              size="small"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </Button>
          )}
        </Box>

        <Collapse in={expanded}>
          {diagnostics && (
            <Box mt={2}>
              <StatusList>
                <ListItem>
                  <ListItemIcon>
                    {diagnostics.serverReachable ? (
                      <CheckIcon color="success" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText 
                    primary="Server Connection"
                    secondary={diagnostics.serverReachable ? 'Connected' : 'Not Connected'}
                  />
                </ListItem>

                {Object.entries(diagnostics.endpoints).map(([endpoint, status]) => (
                  <ListItem key={endpoint}>
                    <ListItemIcon>
                      {status ? (
                        <CheckIcon color="success" />
                      ) : (
                        <ErrorIcon color="error" />
                      )}
                    </ListItemIcon>
                    <ListItemText 
                      primary={`${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)} Endpoint`}
                      secondary={status ? 'Available' : 'Not Available'}
                    />
                  </ListItem>
                ))}
              </StatusList>

              {diagnostics.modelList.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom color="textSecondary">
                    Available Models
                  </Typography>
                  <DetailsList>
                    {diagnostics.modelList.map((model) => (
                      <ListItem key={model.id}>
                        <ListItemText 
                          primary={model.id}
                          secondary={`Type: ${model.object}`}
                        />
                      </ListItem>
                    ))}
                  </DetailsList>
                </Box>
              )}

              {diagnostics.details.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom color="textSecondary">
                    Details
                  </Typography>
                  <DetailsList>
                    {diagnostics.details.map((detail, index) => (
                      <ListItem key={index}>
                        <ListItemText secondary={detail} />
                      </ListItem>
                    ))}
                  </DetailsList>
                </Box>
              )}

              {diagnostics.errors.length > 0 && (
                <Box mt={2}>
                  <Alert 
                    severity="error"
                    sx={{ 
                      backgroundColor: 'rgba(211, 47, 47, 0.1)',
                      color: '#ff4444',
                    }}
                  >
                    <Typography variant="subtitle2">Errors</Typography>
                    <DetailsList>
                      {diagnostics.errors.map((error, index) => (
                        <ListItem key={index}>
                          <ListItemText secondary={error} />
                        </ListItem>
                      ))}
                    </DetailsList>
                  </Alert>
                </Box>
              )}
            </Box>
          )}
        </Collapse>
      </CardContent>
    </StyledCard>
  );
};

export default NetworkDiagnostics; 