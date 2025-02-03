// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock IntersectionObserver
class IntersectionObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
global.IntersectionObserver = IntersectionObserver;

// Mock ResizeObserver
class ResizeObserver {
  constructor() {}
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}
global.ResizeObserver = ResizeObserver;

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock TextEncoder/TextDecoder
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock ReadableStream
class MockReadableStream {
  constructor(options) {
    this.options = options;
  }
  getReader() {
    return {
      read: async () => {
        // Simulate stream reading
        return { done: true, value: undefined };
      },
      cancel: () => {},
      releaseLock: () => {},
    };
  }
}
global.ReadableStream = MockReadableStream;

// Increase Jest timeout for async operations
jest.setTimeout(30000);

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
global.localStorage = localStorageMock;

// Suppress console errors during tests
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: ReactDOM.render is no longer supported')
  ) {
    return;
  }
  originalError.call(console, ...args);
};

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null
});
window.IntersectionObserver = mockIntersectionObserver; 