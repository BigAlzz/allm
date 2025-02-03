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
  data: [
    { id: 'test-model-1', name: 'Test Model 1' },
    { id: 'test-model-2', name: 'Test Model 2' }
  ]
};

describe('Dual Chat Interface', () => {
  const mockModels = {
    data: [
      { id: 'test-model-1', name: 'Test Model 1' },
      { id: 'test-model-2', name: 'Test Model 2' }
    ]
  };

  beforeEach(() => {
    fetch.mockClear();
  });

  // Mock stream helper
  const mockStream = (events) => ({
    ok: true,
    body: new ReadableStream({
      async start(controller) {
        for (const event of events) {
          if (event.status === 'thinking') {
            controller.enqueue(new TextEncoder().encode('data: {"status":"thinking"}\n\n'));
          } else if (event.status === 'streaming') {
            controller.enqueue(new TextEncoder().encode('data: {"status":"streaming"}\n\n'));
          } else if (event.chunk) {
            controller.enqueue(new TextEncoder().encode(`data: {"choices":[{"delta":{"content":"${event.chunk}"}}]}\n\n`));
          }
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        controller.close();
      }
    }),
    getReader() {
      return this.body.getReader();
    }
  });

  test('renders both chat panels', async () => {
    // Setup
    fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockModels)
    }));

    render(<App />);

    // Wait for initial render and model load
    const modelElement = await screen.findByText('Test Model 1');
    expect(modelElement).toBeInTheDocument();

    // Find chat panels
    const chatPanels = await screen.findAllByRole('textbox', { name: /message/i });
    expect(chatPanels).toHaveLength(2);
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
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
    });

    const inputs = screen.getAllByPlaceholderText('Type your message...');
    const sendButtons = screen.getAllByRole('button', { name: /send/i });

    // Send message in left chat
    await user.type(inputs[0], 'Left message');
    await user.click(sendButtons[0]);

    // Send message in right chat
    await user.type(inputs[1], 'Right message');
    await user.click(sendButtons[1]);

    // Verify left chat response
    await waitFor(() => {
      expect(screen.getByText('Left chat response')).toBeInTheDocument();
    });

    // Verify right chat response
    await waitFor(() => {
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

  test('AI brainstorm feature works between panels', async () => {
    const user = userEvent.setup();
    
    // Mock multiple chat responses for the brainstorm iterations
    fetch
      .mockImplementationOnce(() => Promise.resolve({ // Initial model load
        ok: true,
        json: () => Promise.resolve(mockModels)
      }))
      .mockImplementationOnce(() => Promise.resolve(mockStream([ // First panel response
        { status: 'thinking' },
        { status: 'streaming' },
        { chunk: 'First panel response' },
        { status: 'done' }
      ])))
      .mockImplementationOnce(() => Promise.resolve(mockStream([ // Second panel brainstorm
        { status: 'thinking' },
        { status: 'streaming' },
        { chunk: 'Second panel brainstorm response' },
        { status: 'done' }
      ])))
      .mockImplementationOnce(() => Promise.resolve(mockStream([ // First panel brainstorm
        { status: 'thinking' },
        { status: 'streaming' },
        { chunk: 'First panel brainstorm response' },
        { status: 'done' }
      ])));

    render(<App />);

    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByText('Test Model 1')).toBeInTheDocument();
    });

    // Enable brainstorm mode on both panels
    const brainstormButtons = screen.getAllByTitle(/Enable AI Brainstorm/i);
    await user.click(brainstormButtons[0]); // Left panel
    await user.click(brainstormButtons[1]); // Right panel

    // Verify brainstorm is enabled
    await waitFor(() => {
      expect(screen.getAllByTitle(/AI Brainstorm Active/i)).toHaveLength(2);
    });

    // Send initial message
    const inputs = screen.getAllByPlaceholderText('Type your message...');
    const sendButtons = screen.getAllByRole('button', { name: /send/i });
    await user.type(inputs[0], 'Start brainstorming');
    await user.click(sendButtons[0]);

    // Verify the chain of responses
    await waitFor(() => {
      expect(screen.getByText('First panel response')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('Second panel brainstorm response')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('First panel brainstorm response')).toBeInTheDocument();
    });

    // Verify fetch was called the expected number of times
    expect(fetch).toHaveBeenCalledTimes(4); // Initial load + 3 responses
  });
}); 