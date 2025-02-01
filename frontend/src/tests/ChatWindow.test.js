import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatWindow from '../components/ChatWindow';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const mockModels = [
  { id: 'deepseek-1', name: 'Deepseek Coder' },
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

  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
  });

  it('shows model selector with provided models', () => {
    renderComponent();
    const modelSelector = screen.getByRole('button', { name: /Deepseek Coder/i });
    expect(modelSelector).toBeInTheDocument();
  });

  it('shows appropriate avatar image for selected model', () => {
    renderComponent();
    const avatar = screen.getByRole('img', { name: /Deepseek Coder/i });
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', './Images/Deepseek.png');
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
    const avatar = screen.getByRole('img', { name: /Deepseek Coder/i }).closest('.MuiAvatar-root');
    expect(avatar).toHaveStyle({ backgroundColor: '#4A90E2' }); // Deepseek blue
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

  it('handles multiple model switches correctly', async () => {
    renderComponent();
    
    const modelSelector = screen.getByRole('button', { name: /Deepseek Coder/i });
    fireEvent.click(modelSelector);
    
    // Switch to Qwen
    const qwenOption = screen.getByText('Qwen');
    fireEvent.click(qwenOption);
    
    // Verify Qwen avatar and color
    const qwenAvatar = screen.getByRole('img', { name: /Qwen/i });
    expect(qwenAvatar).toHaveAttribute('src', './Images/Qwen2.png');
    expect(qwenAvatar.closest('.MuiAvatar-root')).toHaveStyle({ backgroundColor: '#9C27B0' });
    
    // Switch to Gemma
    fireEvent.click(modelSelector);
    const gemmaOption = screen.getByText('Gemma');
    fireEvent.click(gemmaOption);
    
    // Verify Gemma avatar
    const gemmaAvatar = screen.getByRole('img', { name: /Gemma/i });
    expect(gemmaAvatar).toHaveAttribute('src', './Images/Gemma.png');
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