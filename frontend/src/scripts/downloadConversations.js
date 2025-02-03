import { exportConversation, exportMultipleConversations } from '../utils/conversationExporter';

/**
 * Download a single conversation from localStorage
 * @param {string} position - The panel position ('left' or 'right')
 * @param {string} conversationId - Optional specific conversation ID to download
 */
export const downloadConversation = (position, conversationId = null) => {
  try {
    // Get conversations from localStorage
    const savedConversations = localStorage.getItem(`conversations-${position}`);
    if (!savedConversations) {
      console.warn('No conversations found for position:', position);
      return false;
    }

    const conversations = JSON.parse(savedConversations);
    
    if (conversationId) {
      // Download specific conversation
      const conversation = conversations.find(c => c.id === conversationId);
      if (!conversation) {
        console.warn('Conversation not found:', conversationId);
        return false;
      }
      return exportConversation(conversation);
    } else {
      // Download all conversations
      return exportMultipleConversations(conversations);
    }
  } catch (error) {
    console.error('Error downloading conversations:', error);
    return false;
  }
};

// Example usage:
// To download all conversations from left panel:
// downloadConversation('left');
// 
// To download a specific conversation:
// downloadConversation('left', '123456789'); 