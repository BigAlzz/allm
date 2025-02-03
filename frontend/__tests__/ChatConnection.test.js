const { checkServerHealth, connectToServer } = require('../src/utils/chatConnectionUtils');
const { WebSocket } = require('ws');
const { runNetworkDiagnostics } = require('../src/utils/networkDiagnostics');

// Remove React testing imports as we're testing API directly
const testServerUrl = 'http://192.168.50.89:1234';

const LM_STUDIO_ENDPOINTS = {
  models: '/v1/models',
  chat: '/v1/chat/completions',
  completions: '/v1/completions',
  embeddings: '/v1/embeddings'
};

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

// Enhanced network diagnostics
async function runNetworkDiagnostics() {
  const diagnostics = {
    serverReachable: false,
    endpoints: {
      models: false,
      chat: false,
      completions: false,
      embeddings: false
    },
    modelList: [],
    details: [],
    errors: []
  };

  try {
    // Basic connection test with models endpoint
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      // Try direct GET request
      const response = await fetch(`${testServerUrl}${LM_STUDIO_ENDPOINTS.models}`, {
        method: 'GET',
        headers: DEFAULT_HEADERS,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      diagnostics.serverReachable = response.ok;
      diagnostics.details.push(`Server connection: ${response.ok ? 'Success' : 'Failed'}`);
      diagnostics.details.push(`Response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        diagnostics.endpoints.models = true;
        diagnostics.modelList = data.data || [];
        diagnostics.details.push(`Available models: ${diagnostics.modelList.map(m => m.id).join(', ')}`);
      } else {
        // Try to get more error details
        try {
          const errorText = await response.text();
          diagnostics.errors.push(`Server response: ${errorText}`);
        } catch (e) {
          diagnostics.errors.push('Could not read error response');
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        diagnostics.errors.push('Connection timed out after 5 seconds');
      } else if (error.message === 'Failed to fetch') {
        diagnostics.errors.push(`Network error: Unable to reach ${testServerUrl}\nPossible causes:\n1. Server is not running\n2. Network/firewall blocking connection\n3. Incorrect server address`);
      } else {
        diagnostics.errors.push(`Connection error: ${error.message}`);
      }
    }

    // Only test other endpoints if server is reachable
    if (diagnostics.serverReachable && diagnostics.modelList.length > 0) {
      const model = diagnostics.modelList[0].id;

      // Test chat completions endpoint
      try {
        const chatResponse = await fetch(`${testServerUrl}${LM_STUDIO_ENDPOINTS.chat}`, {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'Test' }],
            stream: false,
            max_tokens: 1
          })
        });
        
        diagnostics.endpoints.chat = chatResponse.ok;
        diagnostics.details.push(`Chat endpoint: ${chatResponse.ok ? 'Available' : 'Not Available'}`);
        
        if (!chatResponse.ok) {
          const errorText = await chatResponse.text();
          diagnostics.errors.push(`Chat endpoint error: ${errorText}`);
        }
      } catch (error) {
        diagnostics.errors.push(`Chat endpoint error: ${error.message}`);
      }

      // Test completions endpoint
      try {
        const completionsResponse = await fetch(`${testServerUrl}${LM_STUDIO_ENDPOINTS.completions}`, {
          method: 'POST',
          headers: DEFAULT_HEADERS,
          body: JSON.stringify({
            model,
            prompt: 'Test',
            stream: false,
            max_tokens: 1
          })
        });
        
        diagnostics.endpoints.completions = completionsResponse.ok;
        diagnostics.details.push(`Completions endpoint: ${completionsResponse.ok ? 'Available' : 'Not Available'}`);
        
        if (!completionsResponse.ok) {
          const errorText = await completionsResponse.text();
          diagnostics.errors.push(`Completions endpoint error: ${errorText}`);
        }
      } catch (error) {
        diagnostics.errors.push(`Completions endpoint error: ${error.message}`);
      }

      // Test embeddings endpoint
      try {
        const embeddingModel = diagnostics.modelList.find(m => m.id.includes('embed'));
        if (embeddingModel) {
          const embeddingsResponse = await fetch(`${testServerUrl}${LM_STUDIO_ENDPOINTS.embeddings}`, {
            method: 'POST',
            headers: DEFAULT_HEADERS,
            body: JSON.stringify({
              model: embeddingModel.id,
              input: 'Test'
            })
          });
          
          diagnostics.endpoints.embeddings = embeddingsResponse.ok;
          diagnostics.details.push(`Embeddings endpoint: ${embeddingsResponse.ok ? 'Available' : 'Not Available'}`);
          
          if (!embeddingsResponse.ok) {
            const errorText = await embeddingsResponse.text();
            diagnostics.errors.push(`Embeddings endpoint error: ${errorText}`);
          }
        } else {
          diagnostics.details.push('No embedding model available');
        }
      } catch (error) {
        diagnostics.errors.push(`Embeddings endpoint error: ${error.message}`);
      }
    }
  } catch (error) {
    diagnostics.errors.push(`General error: ${error.message}`);
  }

  return diagnostics;
}

// Helper function to run all tests and log results
async function runConnectionTests() {
  console.log('Starting LM Studio connection tests...');
  
  try {
    // Run network diagnostics first
    console.log('\nRunning network diagnostics...');
    const diagnostics = await runNetworkDiagnostics();
    
    if (!diagnostics.serverReachable) {
      throw new Error(`Unable to connect to LM Studio server at ${testServerUrl}. Please check that:\n1. LM Studio is running\n2. Local Server is started\n3. The server address is correct\n\nDiagnostics:\n${diagnostics.details.join('\n')}\n\nErrors:\n${diagnostics.errors.join('\n')}`);
    }
    
    // Test 1: Basic Connection & Models List
    console.log('\nTesting models endpoint...');
    const modelResponse = await fetch(`${testServerUrl}${LM_STUDIO_ENDPOINTS.models}`);
    if (!modelResponse.ok) throw new Error(`Server returned ${modelResponse.status}`);
    const modelData = await modelResponse.json();
    console.log('Available models:', modelData.data);
    if (!modelData.data || !modelData.data.length) {
      throw new Error('No models available. Please load a model in LM Studio first.');
    }
    console.log('✅ Models endpoint test passed');

    // Test 2: Simple Chat Request
    console.log('\nTesting chat completion...');
    const chatResponse = await fetch(`${testServerUrl}${LM_STUDIO_ENDPOINTS.chat}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelData.data[0].id, // Use first available model
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false
      })
    });
    
    if (!chatResponse.ok) {
      const errorData = await chatResponse.text();
      throw new Error(`Chat request failed: ${chatResponse.status}\nResponse: ${errorData}`);
    }
    
    const chatData = await chatResponse.json();
    if (!chatData.choices || !chatData.choices.length) {
      throw new Error('Chat response missing choices');
    }
    console.log('✅ Chat completion test passed');
    console.log('Response:', chatData.choices[0]?.message?.content);

    // Test 3: Streaming
    console.log('\nTesting streaming response...');
    const streamResponse = await fetch(`${testServerUrl}${LM_STUDIO_ENDPOINTS.chat}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelData.data[0].id, // Use first available model
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true
      })
    });

    if (!streamResponse.ok) {
      const errorData = await streamResponse.text();
      throw new Error(`Streaming request failed: ${streamResponse.status}\nResponse: ${errorData}`);
    }

    console.log('Reading stream...');
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    let streamContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.trim() && !line.includes('[DONE]')) {
          try {
            const jsonStr = line.replace(/^data: /, '');
            const data = JSON.parse(jsonStr);
            if (data.choices?.[0]?.delta?.content) {
              streamContent += data.choices[0].delta.content;
              process.stdout.write(data.choices[0].delta.content);
            }
          } catch (e) {
            // Ignore parse errors for non-data lines
          }
        }
      }
    }
    console.log('\n✅ Streaming test passed');

    console.log('\n✅ All tests passed successfully!');
    return true;
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

describe('ChatConnection', () => {
  beforeEach(() => {
    // Reset fetch mocks before each test
    global.fetch = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should run network diagnostics successfully', async () => {
    // Mock successful responses
    global.fetch.mockImplementation((url) => {
      if (url.includes('/v1/models')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ id: 'test-model' }] }),
          text: () => Promise.resolve(''),
          status: 200,
          statusText: 'OK'
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        text: () => Promise.resolve(''),
        status: 200,
        statusText: 'OK'
      });
    });

    const diagnostics = await runNetworkDiagnostics('http://localhost:1234');
    expect(diagnostics.serverReachable).toBe(true);
    expect(diagnostics.endpoints.models).toBe(true);
    expect(diagnostics.modelList).toHaveLength(1);
    expect(diagnostics.modelList[0].id).toBe('test-model');
  });

  it('should handle server connection failure', async () => {
    // Mock failed connection
    global.fetch.mockRejectedValue(new Error('Failed to fetch'));

    const diagnostics = await runNetworkDiagnostics('http://localhost:1234');
    expect(diagnostics.serverReachable).toBe(false);
    expect(diagnostics.errors).toHaveLength(1);
    expect(diagnostics.errors[0]).toContain('Network error: Unable to reach');
  });

  it('should handle timeout', async () => {
    // Mock timeout
    global.fetch.mockImplementation((_url, options) => {
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          resolve({
            ok: false,
            status: 408,
            statusText: 'Request Timeout'
          });
        }, 6000);

        // Handle abort signal
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
            const error = new Error('AbortError');
            error.name = 'AbortError';
            reject(error);
          });
        }
      });
    });

    const diagnosticsPromise = runNetworkDiagnostics('http://localhost:1234');
    jest.advanceTimersByTime(5000); // Advance just to the timeout
    const diagnostics = await diagnosticsPromise;

    expect(diagnostics.serverReachable).toBe(false);
    expect(diagnostics.errors).toHaveLength(1);
    expect(diagnostics.errors[0]).toBe('Connection timed out after 5 seconds');
  });
});

module.exports = {
  runConnectionTests,
  runNetworkDiagnostics
}; 