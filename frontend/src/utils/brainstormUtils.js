// Process a message with a specific assistant/panel
export const processWithAssistant = async (panelId, message, modelId = 'default', config = null) => {
  try {
    const response = await fetch('/api/brainstorm/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        panelId,
        message,
        model: modelId,
        config
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process with assistant');
    }
    
    const data = await response.json();
    return {
      thought_process: data.thought_process,
      response: data.response,
      model_id: data.model_id,
      config: data.config,
      timestamp: data.timestamp,
    };
  } catch (error) {
    console.error('Error processing with assistant:', error);
    throw error;
  }
};

// Generate a summary from all assistant responses
export const generateSummary = (results) => {
  const summary = {
    individual_responses: results.map((result, index) => ({
      assistant: `Panel ${index + 1}`,
      model: result.response.model_id,
      config: result.response.config,
      thought_process: result.response.thought_process,
      response: result.response.response,
    })),
    summary: summarizeResponses(results),
    verdict: generateVerdict(results),
    timestamp: new Date().toISOString(),
  };
  
  return summary;
};

// Check health of specified models
export const checkModelHealth = async (modelIds) => {
  try {
    const response = await fetch('/api/models/health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelIds }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to check model health');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking model health:', error);
    throw error;
  }
};

// Helper function to summarize all responses
const summarizeResponses = (results) => {
  // Combine key points from all responses
  const points = results.flatMap(result => 
    result.response.response.split('\n')
      .filter(line => line.trim().length > 0)
  );
  
  return points.join('\n');
};

// Helper function to generate a final verdict
const generateVerdict = (results) => {
  // Analyze responses and generate a consensus or final decision
  const consensus = results.reduce((acc, result) => {
    return acc + '\n' + result.response.response;
  }, '');
  
  return `Final Verdict:\n${consensus}`;
}; 