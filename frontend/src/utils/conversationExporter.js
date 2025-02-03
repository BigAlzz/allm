/**
 * Utility functions for exporting conversations
 */

/**
 * Format a single message for export
 * @param {Object} msg - The message object to format
 * @returns {string} Formatted message text
 */
export const formatMessage = (msg) => {
  const timestamp = new Date(msg.timestamp).toLocaleString();
  const model = msg.metadata?.modelName || 'Unknown Model';
  const role = msg.role === 'user' ? 'Human' : 'Assistant';
  return `[${timestamp}] ${role} (${model}):\n${msg.content}\n\n`;
};

/**
 * Export a conversation to a text file
 * @param {Object} conversation - The conversation object to export
 */
export const exportConversation = (conversation) => {
  try {
    // Format all messages
    const text = conversation.messages.map(formatMessage).join('');
    
    // Create blob and download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${conversation.name}-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error exporting conversation:', error);
    return false;
  }
};

/**
 * Export multiple conversations to a single text file
 * @param {Array} conversations - Array of conversation objects to export
 */
export const exportMultipleConversations = (conversations) => {
  try {
    // Format all conversations with headers
    const text = conversations.map(conv => {
      const header = `=== Conversation: ${conv.name} ===\nStarted: ${new Date(conv.timestamp).toLocaleString()}\n\n`;
      const messages = conv.messages.map(formatMessage).join('');
      return header + messages + '\n\n';
    }).join('\n');
    
    // Create blob and download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-conversations-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error exporting conversations:', error);
    return false;
  }
}; 