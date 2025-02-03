import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrainstormControl from '../components/BrainstormControl';
import { processWithAssistant } from '../utils/brainstormUtils';

// Mock the brainstormUtils
jest.mock('../utils/brainstormUtils', () => ({
  processWithAssistant: jest.fn()
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

describe('BrainstormControl', () => {
  const mockPanels = [
    { id: 'panel1', assistantName: 'Assistant 1', selectedModel: 'hermes' },
    { id: 'panel2', assistantName: 'Assistant 2', selectedModel: 'hermes' },
    { id: 'panel3', assistantName: 'Assistant 3', selectedModel: 'gemma' }
  ];

  const mockModels = [
    { id: 'hermes', name: 'Hermes' },
    { id: 'mixtral', name: 'Mixtral' },
    { id: 'gemma', name: 'Gemma' }
  ];

  const mockOnSubmitToPanels = jest.fn();
  const mockOnToggleNotebook = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('[]');
  });

  it('renders in collapsed state initially', () => {
    render(
      <BrainstormControl
        panels={mockPanels}
        onSubmitToPanels={mockOnSubmitToPanels}
        onToggleNotebook={mockOnToggleNotebook}
        models={mockModels}
      />
    );

    expect(screen.getByText(/AI Brainstorm/)).toBeInTheDocument();
    expect(screen.queryByText('Processing Sequence')).not.toBeVisible();
  });

  it('expands and collapses when clicking the expand button', async () => {
    render(
      <BrainstormControl
        panels={mockPanels}
        onSubmitToPanels={mockOnSubmitToPanels}
        onToggleNotebook={mockOnToggleNotebook}
        models={mockModels}
      />
    );

    // Initially collapsed
    expect(screen.queryByText('Processing Sequence')).not.toBeVisible();

    // Click expand
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Should be expanded
    await waitFor(() => {
      expect(screen.getByText('Processing Sequence')).toBeVisible();
    });

    // Click collapse
    fireEvent.click(expandButton);

    // Should be collapsed again
    await waitFor(() => {
      expect(screen.queryByText('Processing Sequence')).not.toBeVisible();
    });
  });

  it('adds and removes assistants from sequence', async () => {
    render(
      <BrainstormControl
        panels={mockPanels}
        onSubmitToPanels={mockOnSubmitToPanels}
        onToggleNotebook={mockOnToggleNotebook}
        models={mockModels}
      />
    );

    // Expand the control
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Add Assistant 1 to sequence
    const assistant1Chip = screen.getByRole('button', { name: /Assistant 1/i });
    fireEvent.click(assistant1Chip);

    // Verify Assistant 1 is in sequence
    await waitFor(() => {
      expect(screen.getByText(/Assistant 1.*hermes/)).toBeInTheDocument();
    });

    // Add Assistant 2 to sequence
    const assistant2Chip = screen.getByRole('button', { name: /Assistant 2/i });
    fireEvent.click(assistant2Chip);

    // Verify both assistants are in sequence
    await waitFor(() => {
      expect(screen.getByText(/Assistant 1.*hermes/)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Assistant 2.*hermes/)).toBeInTheDocument();
    });

    // Remove Assistant 1
    const removeButtons = screen.getAllByRole('button', { name: /remove panel/i });
    fireEvent.click(removeButtons[0]);

    // Verify Assistant 1 is removed
    await waitFor(() => {
      expect(screen.queryByText(/Assistant 1.*hermes/)).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/Assistant 2.*hermes/)).toBeInTheDocument();
    });
  });

  it('processes messages through the sequence when brainstorm is enabled', async () => {
    // Mock the processWithAssistant responses
    processWithAssistant
      .mockResolvedValueOnce({ response: 'Response from Assistant 1' })
      .mockResolvedValueOnce({ response: 'Response from Assistant 2' })
      .mockResolvedValueOnce({ response: 'Final Summary' });

    render(
      <BrainstormControl
        panels={mockPanels}
        onSubmitToPanels={mockOnSubmitToPanels}
        onToggleNotebook={mockOnToggleNotebook}
        models={mockModels}
        currentMessage="Test message"
      />
    );

    // Expand the control
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    // Enable brainstorm mode
    const brainstormSwitch = screen.getByRole('checkbox');
    fireEvent.click(brainstormSwitch);

    // Add assistants to sequence
    const assistant1Chip = screen.getByRole('button', { name: /Assistant 1/i });
    const assistant2Chip = screen.getByRole('button', { name: /Assistant 2/i });
    fireEvent.click(assistant1Chip);
    fireEvent.click(assistant2Chip);

    // Select summary assistant
    const summarySelect = screen.getByRole('combobox');
    fireEvent.mouseDown(summarySelect);
    const assistant3Option = screen.getByRole('option', { name: /Assistant 3/i });
    fireEvent.click(assistant3Option);

    // Wait for processing to complete
    await waitFor(() => {
      expect(processWithAssistant).toHaveBeenCalledTimes(3);
    });
    await waitFor(() => {
      expect(mockOnSubmitToPanels).toHaveBeenCalledTimes(3);
    });

    // Verify results are displayed
    expect(screen.getByText('Response from Assistant 1')).toBeInTheDocument();
    expect(screen.getByText('Response from Assistant 2')).toBeInTheDocument();
    expect(screen.getByText('Final Summary')).toBeInTheDocument();

    // Verify localStorage was updated
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'brainstorm-sessions',
      expect.stringContaining('Test message')
    );
  });

  it('downloads report when clicking download button', async () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = jest.fn();
    const mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock document.createElement
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    };
    document.createElement = jest.fn().mockReturnValue(mockAnchor);
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    // Set up component with results
    processWithAssistant
      .mockResolvedValueOnce({ response: 'Response from Assistant 1' })
      .mockResolvedValueOnce({ response: 'Final Summary' });

    render(
      <BrainstormControl
        panels={mockPanels}
        onSubmitToPanels={mockOnSubmitToPanels}
        onToggleNotebook={mockOnToggleNotebook}
        models={mockModels}
        currentMessage="Test message"
      />
    );

    // Process a message to generate results
    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);
    
    const brainstormSwitch = screen.getByRole('checkbox');
    fireEvent.click(brainstormSwitch);

    const assistant1Chip = screen.getByRole('button', { name: /Assistant 1/i });
    fireEvent.click(assistant1Chip);

    // Wait for processing and click download
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /download report/i })).toBeInTheDocument();
    });
    
    const downloadButton = screen.getByRole('button', { name: /download report/i });
    fireEvent.click(downloadButton);

    // Verify download was initiated
    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });
}); 