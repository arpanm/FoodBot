import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SearchBar } from '../SearchBar';

// Mock the search service
const mockGetRestaurantSuggestions = jest.fn();
jest.mock('../../../services/search.service', () => ({
  searchService: {
    getRestaurantSuggestions: (...args: unknown[]) => mockGetRestaurantSuggestions(...args),
  },
}));

// Mock the useDebounce hook to return the value immediately
let mockDebouncedValue = '';
jest.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (value: string) => {
    mockDebouncedValue = value;
    return value;
  },
}));

describe('SearchBar Component', () => {
  const mockOnSearch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockDebouncedValue = '';
    mockGetRestaurantSuggestions.mockResolvedValue([]);
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<SearchBar onSearch={mockOnSearch} data-testid="my-search-bar" />);
      expect(screen.getByTestId('my-search-bar')).toBeInTheDocument();
    });

    it('renders the search input', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      expect(screen.getByTestId('search-bar-input')).toBeInTheDocument();
    });

    it('renders the search submit button', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      expect(screen.getByTestId('search-bar-submit')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('renders with default placeholder text', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      expect(
        screen.getByPlaceholderText('Search restaurants, dishes...')
      ).toBeInTheDocument();
    });

    it('renders with custom placeholder text', () => {
      render(
        <SearchBar onSearch={mockOnSearch} placeholder="Find food nearby..." />
      );
      expect(
        screen.getByPlaceholderText('Find food nearby...')
      ).toBeInTheDocument();
    });

    it('renders with initial value', () => {
      render(<SearchBar onSearch={mockOnSearch} initialValue="pizza" />);
      expect(screen.getByTestId('search-bar-input')).toHaveValue('pizza');
    });

    it('has correct aria attributes', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');
      expect(input).toHaveAttribute('aria-autocomplete', 'list');
      expect(input).toHaveAttribute('role', 'combobox');
    });
  });

  describe('User Input', () => {
    it('updates input value when user types', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      fireEvent.change(input, { target: { value: 'Pizza' } });
      expect(input).toHaveValue('Pizza');
    });

    it('calls onSearch when submit button is clicked', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      fireEvent.change(input, { target: { value: 'Burger' } });
      fireEvent.click(screen.getByTestId('search-bar-submit'));

      expect(mockOnSearch).toHaveBeenCalledWith('Burger');
    });

    it('calls onSearch when Enter key is pressed', () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      fireEvent.change(input, { target: { value: 'Sushi' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSearch).toHaveBeenCalledWith('Sushi');
    });
  });

  describe('Autocomplete Suggestions', () => {
    it('fetches suggestions when query length >= 2', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
      ]);

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pi' } });
      });

      await waitFor(() => {
        expect(mockGetRestaurantSuggestions).toHaveBeenCalledWith('Pi');
      });
    });

    it('does not fetch suggestions for single character', async () => {
      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'P' } });
      });

      expect(mockGetRestaurantSuggestions).not.toHaveBeenCalled();
    });

    it('displays suggestions dropdown when results are available', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
        'Pizza Express',
      ]);

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
        expect(screen.getByTestId('search-suggestion-0')).toHaveTextContent(
          'Pizza Palace'
        );
        expect(screen.getByTestId('search-suggestion-1')).toHaveTextContent(
          'Pizza Hut'
        );
        expect(screen.getByTestId('search-suggestion-2')).toHaveTextContent(
          'Pizza Express'
        );
      });
    });

    it('calls onSearch with suggestion text when suggestion is clicked', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
      ]);

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestion-0')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('search-suggestion-0'));

      expect(mockOnSearch).toHaveBeenCalledWith('Pizza Palace');
    });

    it('hides suggestions when Escape key is pressed', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
      ]);

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.queryByTestId('search-suggestions')).not.toBeInTheDocument();
    });

    it('handles suggestion fetch error gracefully', async () => {
      mockGetRestaurantSuggestions.mockRejectedValue(new Error('Network error'));

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(
          screen.queryByTestId('search-suggestions')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates suggestions with ArrowDown key', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
      ]);

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });

      expect(screen.getByTestId('search-suggestion-0')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('navigates suggestions with ArrowUp key', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
      ]);

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      // Navigate down twice then up once
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'ArrowUp' });

      expect(screen.getByTestId('search-suggestion-0')).toHaveAttribute(
        'aria-selected',
        'true'
      );
    });

    it('selects highlighted suggestion on Enter', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
      ]);

      render(<SearchBar onSearch={mockOnSearch} />);
      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      fireEvent.keyDown(input, { key: 'ArrowDown' });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnSearch).toHaveBeenCalledWith('Pizza Palace');
    });
  });

  describe('Click Outside', () => {
    it('hides suggestions when clicking outside the component', async () => {
      mockGetRestaurantSuggestions.mockResolvedValue([
        'Pizza Palace',
        'Pizza Hut',
      ]);

      render(
        <div>
          <SearchBar onSearch={mockOnSearch} />
          <div data-testid="outside-element">Outside</div>
        </div>
      );

      const input = screen.getByTestId('search-bar-input');

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Pizza' } });
      });

      await waitFor(() => {
        expect(screen.getByTestId('search-suggestions')).toBeInTheDocument();
      });

      fireEvent.mouseDown(screen.getByTestId('outside-element'));

      expect(screen.queryByTestId('search-suggestions')).not.toBeInTheDocument();
    });
  });
});
