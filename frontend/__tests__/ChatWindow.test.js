const React = require('react');
const { render, screen, fireEvent, act, waitFor, within } = require('@testing-library/react');
require('@testing-library/jest-dom');
const ChatWindow = require('../components/ChatWindow').default;
const { ThemeProvider, createTheme } = require('@mui/material/styles');

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const mockModels = [
  { id: 'hermes', name: 'Hermes' },
  { id: 'qwen-1', name: 'Qwen' },
  { id: 'gemma-1', name: 'Gemma' },
];

describe('ChatWindow Component', () => {
  const defaultProps = {
    position: 'left',
    models: mockModels,
    streamingResponse: '',
    isThinking: false,
    setStreamingResponses: jest.fn(),
    setThinking: jest.fn(),
    serverUrl: 'http://localhost:1234',
  };

  beforeEach(() => {
    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      clear: jest.fn(),
    };
    global.localStorage = localStorageMock;
    
    // Mock fetch
    global.fetch = jest.fn();
  });

  const renderComponent = (props = {}) => {
    return render(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow {...defaultProps} {...props} />
      </ThemeProvider>
    );
  };

  const switchModel = (modelName) => {
    const modelSelector = screen.getByRole('button', { name: /Hermes/i });
    fireEvent.click(modelSelector);
    fireEvent.click(screen.getByText(modelName));
  };

  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('shows model selector with provided models', () => {
    renderComponent();
    const modelSelector = screen.getByRole('button', { name: /Hermes/i });
    expect(modelSelector).toBeInTheDocument();
  });

  it('shows appropriate avatar image for selected model', () => {
    renderComponent();
    const avatar = screen.getByRole('img', { name: /Hermes/i });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', './Images/Hermes.png');
  });

  it('handles message input and submission', async () => {
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test response"}}]}\n\n'));
        controller.close();
      }
    });

    global.fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      body: mockResponse,
      getReader: () => mockResponse.getReader(),
    }));

    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:1234/v1/chat/completions',
        expect.any(Object)
      );
    });
  });

  it('handles file uploads for supported models', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    global.fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ id: 'test-file-id' }),
    }));

    renderComponent();
    
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:1234/v1/files',
        expect.any(Object)
      );
    });
  });

  it('handles emoji picker', () => {
    renderComponent();
    
    const emojiButton = screen.getByRole('button', { name: /emoji/i });
    fireEvent.click(emojiButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles conversation management', () => {
    renderComponent();
    
    const newChatButton = screen.getByRole('button', { name: /new chat/i });
    fireEvent.click(newChatButton);
    
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('shows error message when server is unavailable', async () => {
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch')));

    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/unable to get response/i)).toBeInTheDocument();
    });
  });

  it('handles streaming response updates', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Part 1"}}]}\n\n'));
        controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Part 2"}}]}\n\n'));
        controller.close();
      }
    });

    global.fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      body: mockStream,
      getReader: () => mockStream.getReader(),
    }));

    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(defaultProps.setStreamingResponses).toHaveBeenCalledWith(
        expect.objectContaining({
          left: expect.stringContaining('Part')
        })
      );
    });
  });

  it('handles model-specific avatar colors', () => {
    renderComponent();
    const avatarContainer = screen.getByTestId('model-avatar');
    expect(avatarContainer).toHaveStyle({ backgroundColor: '#4A90E2' }); // Hermes blue
  });

  it('handles long messages with proper scrolling', async () => {
    const longMessage = 'a'.repeat(1000);
    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: longMessage } });
    
    const messageList = screen.getByRole('list');
    expect(messageList.scrollHeight).toBeGreaterThan(messageList.clientHeight);
  });

  it('handles markdown formatting in messages', async () => {
    const markdownMessage = '# Title\n**bold** and *italic*\n```code block```';
    const mockResponse = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"${markdownMessage}"}}]}\n\n`));
        controller.close();
      }
    });

    global.fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      body: mockResponse,
      getReader: () => mockResponse.getReader(),
    }));

    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: markdownMessage } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByText('bold')).toHaveStyle({ fontWeight: 'bold' });
      expect(screen.getByText('code block')).toHaveStyle({ fontFamily: 'monospace' });
    });
  });

  describe('model switching', () => {
    describe('Qwen model', () => {
      it('shows Qwen avatar after switching', async () => {
        renderComponent();
        switchModel('Qwen');
        const avatar = await screen.findByRole('img', { name: /Qwen/i });
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', './Images/Qwen2.png');
      });

      it('shows correct Qwen avatar color', async () => {
        renderComponent();
        switchModel('Qwen');
        const avatarContainer = await screen.findByTestId('model-avatar');
        expect(avatarContainer).toHaveStyle({ backgroundColor: '#9C27B0' });
      });
    });

    describe('Gemma model', () => {
      it('shows Gemma avatar after switching', async () => {
        renderComponent();
        switchModel('Gemma');
        const avatar = await screen.findByRole('img', { name: /Gemma/i });
        expect(avatar).toBeInTheDocument();
        expect(avatar).toHaveAttribute('src', './Images/Gemma.png');
      });

      it('shows correct Gemma avatar color', async () => {
        renderComponent();
        switchModel('Gemma');
        const avatarContainer = await screen.findByTestId('model-avatar');
        expect(avatarContainer).toHaveStyle({ backgroundColor: '#FF5722' });
      });
    });
  });

  it('handles conversation renaming based on first message', async () => {
    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'First message of conversation' } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      const conversationName = screen.getByText('First message of conver...');
      expect(conversationName).toBeInTheDocument();
    });
  });

  it('handles stop generation button', async () => {
    const mockResponse = new ReadableStream({
      start(controller) {
        // Simulate a long-running response
        setInterval(() => {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"."}}]}\n\n'));
        }, 100);
      }
    });

    global.fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      body: mockResponse,
      getReader: () => mockResponse.getReader(),
    }));

    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Generate long response' } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      const stopButton = screen.getByRole('button', { name: /stop/i });
      expect(stopButton).toBeInTheDocument();
      fireEvent.click(stopButton);
      expect(defaultProps.setThinking).toHaveBeenCalledWith(expect.objectContaining({ left: false }));
    });
  });

  it('handles network timeout and retries', async () => {
    // Mock a timeout error
    global.fetch.mockImplementationOnce(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), 5000);
    }));

    renderComponent();
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Test message' } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText(/retrying in/i)).toBeInTheDocument();
    });
  });

  it('handles file upload errors', async () => {
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    global.fetch.mockImplementationOnce(() => Promise.reject(new Error('Upload failed')));

    renderComponent();
    
    const fileInput = screen.getByTestId('file-input');
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/failed to upload file/i)).toBeInTheDocument();
    });
  });

  it('handles conversation deletion', () => {
    renderComponent();
    
    const menuButton = screen.getByRole('button', { name: /more/i });
    fireEvent.click(menuButton);
    
    const deleteButton = screen.getByText(/delete current chat/i);
    fireEvent.click(deleteButton);

    expect(localStorage.setItem).toHaveBeenCalled();
    expect(screen.getByText(/new chat/i)).toBeInTheDocument();
  });

  it('preserves message formatting on window resize', async () => {
    const markdownMessage = '# Title\n```code\nformatted text\n```';
    renderComponent();
    
    // Trigger resize
    global.dispatchEvent(new Event('resize'));
    
    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: markdownMessage } });
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      const codeBlock = screen.getByText('formatted text');
      expect(codeBlock).toHaveStyle({ fontFamily: 'monospace' });
    });
  });
});

describe('ChatWindow AI Brainstorm Feature', () => {
  const mockModels = [
    { id: 'gemma', name: 'Gemma' },
    { id: 'hermes', name: 'Hermes' }
  ];

  const defaultProps = {
    position: 'left',
    models: mockModels,
    streamingResponse: '',
    isThinking: false,
    setStreamingResponses: jest.fn(),
    setThinking: jest.fn(),
    serverUrl: 'http://localhost:1234',
    otherPanelMessages: [],
    onBrainstormMessage: jest.fn(),
  };

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset all mocks
    jest.clearAllMocks();
    // Mock fetch
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: mockModels }),
        text: () => Promise.resolve('Success'),
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"Test response"}}]}\n\n'));
            controller.close();
          }
        }),
      })
    );
  });

  it('should enable/disable brainstorm mode when clicking the toggle button', () => {
    render(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow {...defaultProps} />
      </ThemeProvider>
    );

    // Find and click the brainstorm toggle button
    const brainstormButton = screen.getByTitle(/Enable AI Brainstorm/i);
    fireEvent.click(brainstormButton);

    // Check if the state is saved in localStorage
    expect(localStorage.getItem('brainstorm-enabled-left')).toBe('true');

    // Click again to disable
    fireEvent.click(brainstormButton);
    expect(localStorage.getItem('brainstorm-enabled-left')).toBe('false');
  });

  it('should process messages from other panel when brainstorm is enabled', async () => {
    const mockMessage = {
      content: 'Test message from other panel',
      timestamp: new Date().toISOString(),
      role: 'assistant',
      metadata: {
        fromPanel: 'right',
        model: 'hermes',
        modelName: 'Hermes'
      }
    };

    // Enable brainstorm mode through localStorage
    localStorage.setItem('brainstorm-enabled-left', 'true');
    localStorage.setItem('selectedModel-left', 'gemma');

    const { rerender } = render(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow {...defaultProps} />
      </ThemeProvider>
    );

    // Simulate receiving a message from the other panel
    rerender(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow 
          {...defaultProps} 
          otherPanelMessages={[mockMessage]}
        />
      </ThemeProvider>
    );

    // Wait for the message to be processed
    await waitFor(() => {
      expect(defaultProps.setThinking).toHaveBeenCalledWith(
        expect.objectContaining({ left: true })
      );
    });

    // Verify that the message was sent to the API
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:1234/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining(mockMessage.content)
      })
    );
  });

  it('should not process messages when brainstorm is disabled', async () => {
    const mockMessage = {
      content: 'Test message from other panel',
      timestamp: new Date().toISOString(),
      role: 'assistant',
      metadata: {
        fromPanel: 'right',
        model: 'hermes',
        modelName: 'Hermes'
      }
    };

    // Ensure brainstorm mode is disabled
    localStorage.setItem('brainstorm-enabled-left', 'false');
    localStorage.setItem('selectedModel-left', 'gemma');

    const { rerender } = render(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow {...defaultProps} />
      </ThemeProvider>
    );

    // Simulate receiving a message from the other panel
    rerender(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow 
          {...defaultProps} 
          otherPanelMessages={[mockMessage]}
        />
      </ThemeProvider>
    );

    // Wait a moment to ensure no processing occurs
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Verify that no API calls were made
    expect(global.fetch).not.toHaveBeenCalledWith(
      'http://localhost:1234/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('should prevent message loops between panels', async () => {
    const mockMessage = {
      content: 'Test message',
      timestamp: new Date().toISOString(),
      role: 'assistant',
      metadata: {
        fromPanel: 'left', // Same panel
        model: 'gemma',
        modelName: 'Gemma'
      },
      processed: false
    };

    // Enable brainstorm mode
    localStorage.setItem('brainstorm-enabled-left', 'true');
    localStorage.setItem('selectedModel-left', 'gemma');

    const { rerender } = render(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow {...defaultProps} />
      </ThemeProvider>
    );

    // Simulate receiving a message from the same panel
    rerender(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow 
          {...defaultProps} 
          otherPanelMessages={[mockMessage]}
        />
      </ThemeProvider>
    );

    // Wait a moment to ensure no processing occurs
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });

    // Verify that no API calls were made (preventing loops)
    expect(global.fetch).not.toHaveBeenCalledWith(
      'http://localhost:1234/v1/chat/completions',
      expect.any(Object)
    );
  });

  it('should maintain brainstorm state after page reload', () => {
    // Set initial state
    localStorage.setItem('brainstorm-enabled-left', 'true');

    const { unmount } = render(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow {...defaultProps} />
      </ThemeProvider>
    );

    // Verify initial state
    expect(screen.getByTitle(/AI Brainstorm Active/i)).toBeInTheDocument();

    // Unmount and remount to simulate page reload
    unmount();

    render(
      <ThemeProvider theme={darkTheme}>
        <ChatWindow {...defaultProps} />
      </ThemeProvider>
    );

    // Verify state is maintained
    expect(screen.getByTitle(/AI Brainstorm Active/i)).toBeInTheDocument();
  });
}); 