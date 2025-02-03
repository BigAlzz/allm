import { render, fireEvent, act, waitFor } from '@testing-library/react';
import ChatWindow from '../components/ChatWindow';

describe('Model Loading Tests', () => {
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  test('models remain loaded when switching between panels', async () => {
    // Mock the models list
    const mockModels = [
      { id: 'model1', name: 'Model 1' },
      { id: 'model2', name: 'Model 2' },
    ];

    // Setup two chat panels
    const { getAllByRole, getByText } = render(
      <>
        <ChatWindow 
          position={1}
          models={mockModels}
          serverUrl="http://localhost:5000"
        />
        <ChatWindow 
          position={2}
          models={mockModels}
          serverUrl="http://localhost:5000"
        />
      </>
    );

    // Select first model in panel 1
    await act(async () => {
      const selects = getAllByRole('combobox');
      fireEvent.change(selects[0], { target: { value: 'model1' } });
    });

    // Verify first model load request
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('model1'),
        })
      );
    });

    // Select second model in panel 2
    await act(async () => {
      const selects = getAllByRole('combobox');
      fireEvent.change(selects[1], { target: { value: 'model2' } });
    });

    // Verify second model load request without unloading first
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:5000/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('model2'),
        })
      );

      // Check that no unload requests were made
      const unloadCalls = mockFetch.mock.calls.filter(call => 
        call[1].body.includes('unload_model_after_completion": true')
      );
      expect(unloadCalls.length).toBe(0);
    });

    // Try sending messages with both models
    const textareas = document.querySelectorAll('textarea');
    
    // Send message with first model
    await act(async () => {
      fireEvent.change(textareas[0], { target: { value: 'Test message 1' } });
      fireEvent.keyPress(textareas[0], { key: 'Enter', code: 13 });
    });

    // Send message with second model
    await act(async () => {
      fireEvent.change(textareas[1], { target: { value: 'Test message 2' } });
      fireEvent.keyPress(textareas[1], { key: 'Enter', code: 13 });
    });

    // Verify both models were used without unloading
    await waitFor(() => {
      const completionCalls = mockFetch.mock.calls.filter(call => 
        call[0].includes('/chat/completions')
      );
      
      // Should have 4 calls: 2 initial loads + 2 message completions
      expect(completionCalls.length).toBe(4);
      
      // Verify no unload options were set
      completionCalls.forEach(call => {
        const body = JSON.parse(call[1].body);
        expect(body.options.unload_model_after_completion).toBe(false);
      });
    });
  });
}); 