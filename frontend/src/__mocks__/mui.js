// Mock file for Material-UI components
const React = require('react');

const mockTheme = {
  palette: {
    mode: 'dark',
    primary: {
      main: '#1976d2'
    },
    secondary: {
      main: '#dc004e'
    }
  }
};

const ThemeProvider = ({ children }) => React.createElement('div', null, children);
const createTheme = () => mockTheme;

module.exports = {
  ThemeProvider,
  createTheme,
  mockTheme
}; 