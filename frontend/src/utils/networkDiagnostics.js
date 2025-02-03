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
async function runNetworkDiagnostics(serverUrl) {
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
      const response = await fetch(`${serverUrl}${LM_STUDIO_ENDPOINTS.models}`, {
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
        diagnostics.errors.push(`Network error: Unable to reach ${serverUrl}\nPossible causes:\n1. Server is not running\n2. Network/firewall blocking connection\n3. Incorrect server address`);
      } else {
        diagnostics.errors.push(`Connection error: ${error.message}`);
      }
    }

    // Only test other endpoints if server is reachable
    if (diagnostics.serverReachable && diagnostics.modelList.length > 0) {
      const model = diagnostics.modelList[0].id;

      // Test chat completions endpoint
      try {
        const chatResponse = await fetch(`${serverUrl}${LM_STUDIO_ENDPOINTS.chat}`, {
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
        const completionsResponse = await fetch(`${serverUrl}${LM_STUDIO_ENDPOINTS.completions}`, {
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
          const embeddingsResponse = await fetch(`${serverUrl}${LM_STUDIO_ENDPOINTS.embeddings}`, {
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

export {
  runNetworkDiagnostics,
  LM_STUDIO_ENDPOINTS,
  DEFAULT_HEADERS
}; 