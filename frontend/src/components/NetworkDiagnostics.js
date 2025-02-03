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
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandIcon,
} from '@mui/icons-material';
import { runNetworkDiagnostics } from '../utils/networkDiagnostics';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  backgroundImage: 'none',
  border: `1px solid ${theme.palette.divider}`,
  '& .MuiCardContent-root': {
    padding: theme.spacing(2),
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

const NetworkDiagnostics = ({ serverUrl }) => {
  const [diagnostics, setDiagnostics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        setLoading(true);
        const results = await runNetworkDiagnostics(serverUrl);
        setDiagnostics(results);
      } catch (error) {
        console.error('Error running diagnostics:', error);
        setDiagnostics({
          serverReachable: false,
          errors: [`Failed to run diagnostics: ${error.message}`]
        });
      } finally {
        setLoading(false);
      }
    };

    runDiagnostics();
  }, [serverUrl]);

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" p={2}>
        <CircularProgress size={24} />
        <Typography variant="body2" ml={2}>
          Running network diagnostics...
        </Typography>
      </Box>
    );
  }

  if (!diagnostics) {
    return (
      <Typography color="error" variant="body2">
        Unable to run network diagnostics
      </Typography>
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
              </StatusList>

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