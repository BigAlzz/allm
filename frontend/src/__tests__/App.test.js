import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

// Mock the fetch API
global.fetch = jest.fn();

// Mock response streams
const mockStream = (responses) => {
  const stream = new ReadableStream({
    async start(controller) {
      for (const response of responses) {
        const data = `data: ${JSON.stringify(response)}\n\n`;
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(data));
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate delay
      }
      controller.close();
    }
  });

  return new Response(stream);
};

// Mock models data
const mockModels = {
  status: 'online',
  models: [
    { id: 'model1', name: 'Test Model 1' },
    { id: 'model2', name: 'Test Model 2' }
  ]
};

describe('Dual Chat Interface', () => {
  beforeEach(() => {
    // Reset fetch mock
    fetch.mockReset();
    
    // Mock the models API call
    fetch.mockImplementation((url) => {
      if (url.includes('/api/models')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModels)
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    // Clear localStorage
    localStorage.clear();
  });

  test('renders both chat windows', () => {
    render(<App />);
    expect(screen.getByText('Chat Window 1')).toBeInTheDocument();
    expect(screen.getByText('Chat Window 2')).toBeInTheDocument();
  });

  test('loads and displays models', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getAllByText('Test Model 1')).toBeTruthy();
      expect(screen.getAllByText('Test Model 2')).toBeTruthy();
    });
  });

  test('sends message and receives response in left chat', async () => {
    const user = userEvent.setup();
    
    // Mock chat response
    fetch.mockImplementationOnce((url) => {
      if (url.includes('/api/chat')) {
        return Promise.resolve(mockStream([
          { status: 'thinking' },
          { status: 'streaming' },
          { chunk: 'Hello' },
          { chunk: ' world!' },
          { status: 'done' }
        ]));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });
    });

    render(<App />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Model 1')).toBeTruthy();
    });

    // Find the left chat input
    const leftChatInputs = screen.getAllByPlaceholderText('Type your message...');
    const leftChatInput = leftChatInputs[0];

    // Type and send message
    await user.type(leftChatInput, 'Test message');
    const sendButtons = screen.getAllByRole('button', { name: /send/i });
    await user.click(sendButtons[0]);

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
    });
  });

  test('maintains separate chat histories', async () => {
    const user = userEvent.setup();
    
    // Mock chat responses
    fetch
      .mockImplementationOnce((url) => {
        if (url.includes('/api/chat')) {
          return Promise.resolve(mockStream([
            { status: 'thinking' },
            { status: 'streaming' },
            { chunk: 'Left chat response' },
            { status: 'done' }
          ]));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModels)
        });
      })
      .mockImplementationOnce((url) => {
        if (url.includes('/api/chat')) {
          return Promise.resolve(mockStream([
            { status: 'thinking' },
            { status: 'streaming' },
            { chunk: 'Right chat response' },
            { status: 'done' }
          ]));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockModels)
        });
      });

    render(<App />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Model 1')).toBeTruthy();
    });

    const inputs = screen.getAllByPlaceholderText('Type your message...');
    const sendButtons = screen.getAllByRole('button', { name: /send/i });

    // Send message in left chat
    await user.type(inputs[0], 'Left message');
    await user.click(sendButtons[0]);

    // Send message in right chat
    await user.type(inputs[1], 'Right message');
    await user.click(sendButtons[1]);

    // Verify separate responses
    await waitFor(() => {
      expect(screen.getByText('Left chat response')).toBeInTheDocument();
      expect(screen.getByText('Right chat response')).toBeInTheDocument();
    });
  });

  test('shows thinking state and streaming response', async () => {
    const user = userEvent.setup();
    
    fetch.mockImplementationOnce((url) => {
      if (url.includes('/api/chat')) {
        return Promise.resolve(mockStream([
          { status: 'thinking' },
          { status: 'streaming' },
          { chunk: 'Streaming ' },
          { chunk: 'response' },
          { status: 'done' }
        ]));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });
    });

    render(<App />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Model 1')).toBeTruthy();
    });

    // Send message
    const inputs = screen.getAllByPlaceholderText('Type your message...');
    const sendButtons = screen.getAllByRole('button', { name: /send/i });
    await user.type(inputs[0], 'Test message');
    await user.click(sendButtons[0]);

    // Check thinking state
    await waitFor(() => {
      expect(screen.getByText('Thinking...')).toBeInTheDocument();
    });

    // Check streaming response
    await waitFor(() => {
      expect(screen.getByText('Streaming response')).toBeInTheDocument();
    });
  });

  test('clears chat history', async () => {
    const user = userEvent.setup();
    
    render(<App />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Model 1')).toBeTruthy();
    });

    // Open history menu
    const historyButtons = screen.getAllByRole('button', { name: /chat history/i });
    await user.click(historyButtons[0]);

    // Click clear history
    const clearButton = screen.getByText('Clear Chat History');
    await user.click(clearButton);

    // Verify chat is cleared
    const chatMessages = screen.queryByRole('listitem');
    expect(chatMessages).toBeNull();
  });

  test('handles server errors gracefully', async () => {
    const user = userEvent.setup();
    
    fetch.mockImplementationOnce((url) => {
      if (url.includes('/api/chat')) {
        return Promise.reject(new Error('Server error'));
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockModels)
      });
    });

    render(<App />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getAllByText('Test Model 1')).toBeTruthy();
    });

    // Send message
    const inputs = screen.getAllByPlaceholderText('Type your message...');
    const sendButtons = screen.getAllByRole('button', { name: /send/i });
    await user.type(inputs[0], 'Test message');
    await user.click(sendButtons[0]);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to get response from AI/)).toBeInTheDocument();
    });
  });
}); 