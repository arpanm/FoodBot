import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { SearchFilters } from '../SearchFilters';
import type { SearchFilterValues } from '../SearchFilters';

describe('SearchFilters Component', () => {
  const mockOnFilterChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('search-filters')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          data-testid="my-filters"
        />
      );
      expect(screen.getByTestId('my-filters')).toBeInTheDocument();
    });

    it('renders cuisine filter section', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('cuisine-filter-section')).toBeInTheDocument();
      expect(screen.getByText('Cuisine')).toBeInTheDocument();
    });

    it('renders price range filter section', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('price-filter-section')).toBeInTheDocument();
      expect(screen.getByText('Price Range')).toBeInTheDocument();
    });

    it('renders rating filter section', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('rating-filter-section')).toBeInTheDocument();
      expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    });

    it('renders dietary filter section', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('dietary-filter-section')).toBeInTheDocument();
      expect(screen.getByText('Dietary')).toBeInTheDocument();
    });

    it('renders sort by filter section', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('sort-filter-section')).toBeInTheDocument();
      expect(screen.getByText('Sort By')).toBeInTheDocument();
    });

    it('renders default cuisine options', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByText('Italian')).toBeInTheDocument();
      expect(screen.getByText('Chinese')).toBeInTheDocument();
      expect(screen.getByText('Indian')).toBeInTheDocument();
      expect(screen.getByText('Japanese')).toBeInTheDocument();
      expect(screen.getByText('Mexican')).toBeInTheDocument();
    });

    it('renders custom cuisine options when provided', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          availableCuisines={['French', 'Spanish', 'Greek']}
        />
      );
      expect(screen.getByText('French')).toBeInTheDocument();
      expect(screen.getByText('Spanish')).toBeInTheDocument();
      expect(screen.getByText('Greek')).toBeInTheDocument();
      expect(screen.queryByText('Italian')).not.toBeInTheDocument();
    });

    it('renders default dietary options', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      expect(screen.getByText('Vegan')).toBeInTheDocument();
      expect(screen.getByText('Gluten-Free')).toBeInTheDocument();
      expect(screen.getByText('Halal')).toBeInTheDocument();
    });

    it('renders custom dietary options when provided', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          availableDietary={['Low Carb', 'Keto']}
        />
      );
      expect(screen.getByText('Low Carb')).toBeInTheDocument();
      expect(screen.getByText('Keto')).toBeInTheDocument();
      expect(screen.queryByText('Vegetarian')).not.toBeInTheDocument();
    });

    it('renders price range chips', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('filter-price-1')).toHaveTextContent('$');
      expect(screen.getByTestId('filter-price-2')).toHaveTextContent('$$');
      expect(screen.getByTestId('filter-price-3')).toHaveTextContent('$$$');
      expect(screen.getByTestId('filter-price-4')).toHaveTextContent('$$$$');
    });

    it('renders rating options', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('filter-rating-3')).toHaveTextContent('3+');
      expect(screen.getByTestId('filter-rating-3.5')).toHaveTextContent('3.5+');
      expect(screen.getByTestId('filter-rating-4')).toHaveTextContent('4+');
      expect(screen.getByTestId('filter-rating-4.5')).toHaveTextContent('4.5+');
    });

    it('renders sort options', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      const select = screen.getByTestId('filter-sort');
      expect(select).toBeInTheDocument();

      const options = select.querySelectorAll('option');
      expect(options).toHaveLength(5);
    });

    it('does not render clear button when no filters are active', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);
      expect(
        screen.queryByTestId('clear-search-filters')
      ).not.toBeInTheDocument();
    });
  });

  describe('Cuisine Filters', () => {
    it('toggles cuisine filter on click', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          cuisine: ['Italian'],
        })
      );
    });

    it('can select multiple cuisines', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));
      fireEvent.click(screen.getByTestId('filter-cuisine-chinese'));

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          cuisine: ['Italian', 'Chinese'],
        })
      );
    });

    it('deselects cuisine on second click', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ cuisine: ['Italian'] }}
        />
      );

      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          cuisine: undefined,
        })
      );
    });
  });

  describe('Price Range Filters', () => {
    it('toggles price range on click', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-price-2'));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          priceRange: [2],
        })
      );
    });

    it('can select multiple price ranges', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-price-1'));
      fireEvent.click(screen.getByTestId('filter-price-2'));

      expect(mockOnFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          priceRange: [1, 2],
        })
      );
    });
  });

  describe('Rating Filters', () => {
    it('selects minimum rating', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-rating-4'));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          minRating: 4,
        })
      );
    });

    it('deselects rating on second click', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ minRating: 4 }}
        />
      );

      fireEvent.click(screen.getByTestId('filter-rating-4'));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          minRating: undefined,
        })
      );
    });
  });

  describe('Dietary Filters', () => {
    it('toggles dietary filter', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-dietary-vegan'));

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dietary: ['Vegan'],
        })
      );
    });
  });

  describe('Sort Filter', () => {
    it('changes sort option', () => {
      render(<SearchFilters onFilterChange={mockOnFilterChange} />);

      fireEvent.change(screen.getByTestId('filter-sort'), {
        target: { value: 'rating' },
      });

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'rating',
        })
      );
    });

    it('clears sort when selecting relevance', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ sortBy: 'rating' }}
        />
      );

      fireEvent.change(screen.getByTestId('filter-sort'), {
        target: { value: 'relevance' },
      });

      expect(mockOnFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: undefined,
        })
      );
    });
  });

  describe('Clear Filters', () => {
    it('shows clear button when filters are active', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ cuisine: ['Italian'] }}
        />
      );

      expect(screen.getByTestId('clear-search-filters')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ cuisine: ['Italian'], minRating: 4 }}
        />
      );

      fireEvent.click(screen.getByTestId('clear-search-filters'));

      expect(mockOnFilterChange).toHaveBeenCalledWith({});
    });
  });

  describe('Initial Filters', () => {
    it('renders with initial cuisine filters checked', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ cuisine: ['Italian', 'Chinese'] }}
        />
      );

      expect(screen.getByTestId('filter-cuisine-italian')).toBeChecked();
      expect(screen.getByTestId('filter-cuisine-chinese')).toBeChecked();
      expect(screen.getByTestId('filter-cuisine-indian')).not.toBeChecked();
    });

    it('renders with initial rating selected', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ minRating: 4 }}
        />
      );

      expect(screen.getByTestId('filter-rating-4')).toHaveClass(
        'search-filters__chip--active'
      );
    });

    it('renders with initial sort selection', () => {
      render(
        <SearchFilters
          onFilterChange={mockOnFilterChange}
          initialFilters={{ sortBy: 'price' }}
        />
      );

      expect(screen.getByTestId('filter-sort')).toHaveValue('price');
    });
  });
});
