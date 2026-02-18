import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FilterPanel } from '../FilterPanel';

/**
 * FilterPanel Component Tests
 */

describe('FilterPanel Component', () => {
  const availableCuisines = ['Italian', 'Mexican', 'Japanese', 'Indian'];

  describe('Rendering', () => {
    it('renders without crashing', () => {
      render(<FilterPanel onFilterChange={jest.fn()} />);
      expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    });

    it('renders with custom data-testid', () => {
      render(<FilterPanel onFilterChange={jest.fn()} data-testid="my-filters" />);
      expect(screen.getByTestId('my-filters')).toBeInTheDocument();
    });

    it('renders cuisine filter section', () => {
      render(<FilterPanel onFilterChange={jest.fn()} availableCuisines={availableCuisines} />);
      expect(screen.getByTestId('cuisine-filters')).toBeInTheDocument();
      expect(screen.getByText('Cuisine')).toBeInTheDocument();
    });

    it('renders cuisine checkboxes', () => {
      render(<FilterPanel onFilterChange={jest.fn()} availableCuisines={availableCuisines} />);
      expect(screen.getByTestId('filter-cuisine-italian')).toBeInTheDocument();
      expect(screen.getByTestId('filter-cuisine-mexican')).toBeInTheDocument();
      expect(screen.getByTestId('filter-cuisine-japanese')).toBeInTheDocument();
      expect(screen.getByTestId('filter-cuisine-indian')).toBeInTheDocument();
    });

    it('renders rating filter section', () => {
      render(<FilterPanel onFilterChange={jest.fn()} />);
      expect(screen.getByTestId('rating-filter')).toBeInTheDocument();
      expect(screen.getByText('Minimum Rating')).toBeInTheDocument();
    });

    it('renders rating options', () => {
      render(<FilterPanel onFilterChange={jest.fn()} />);
      expect(screen.getByTestId('filter-rating-3')).toBeInTheDocument();
      expect(screen.getByTestId('filter-rating-3.5')).toBeInTheDocument();
      expect(screen.getByTestId('filter-rating-4')).toBeInTheDocument();
      expect(screen.getByTestId('filter-rating-4.5')).toBeInTheDocument();
    });

    it('renders open now filter', () => {
      render(<FilterPanel onFilterChange={jest.fn()} />);
      expect(screen.getByTestId('open-filter')).toBeInTheDocument();
      expect(screen.getByTestId('filter-open-now')).toBeInTheDocument();
      expect(screen.getByText('Open Now')).toBeInTheDocument();
    });

    it('renders clear filters button', () => {
      render(<FilterPanel onFilterChange={jest.fn()} />);
      expect(screen.getByTestId('clear-filters')).toBeInTheDocument();
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });
  });

  describe('Cuisine Filters', () => {
    it('toggles cuisine on checkbox click', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} availableCuisines={availableCuisines} />);

      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));
      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ cuisine: ['Italian'] })
      );
    });

    it('allows multiple cuisines to be selected', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} availableCuisines={availableCuisines} />);

      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));
      fireEvent.click(screen.getByTestId('filter-cuisine-mexican'));

      expect(handleFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ cuisine: ['Italian', 'Mexican'] })
      );
    });

    it('deselects cuisine when clicked again', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} availableCuisines={availableCuisines} />);

      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));
      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));

      expect(handleFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ cuisine: [] })
      );
    });
  });

  describe('Rating Filter', () => {
    it('calls onFilterChange with selected rating', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-rating-4'));
      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 4 })
      );
    });

    it('updates rating when different value selected', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-rating-3'));
      fireEvent.click(screen.getByTestId('filter-rating-4.5'));

      expect(handleFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ rating: 4.5 })
      );
    });
  });

  describe('Open Now Filter', () => {
    it('toggles open now filter', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-open-now'));
      expect(handleFilterChange).toHaveBeenCalledWith(
        expect.objectContaining({ isOpen: true })
      );
    });

    it('toggles open now off when clicked again', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} />);

      fireEvent.click(screen.getByTestId('filter-open-now'));
      fireEvent.click(screen.getByTestId('filter-open-now'));

      expect(handleFilterChange).toHaveBeenLastCalledWith(
        expect.objectContaining({ isOpen: false })
      );
    });
  });

  describe('Clear Filters', () => {
    it('clears all filters when clear button clicked', () => {
      const handleFilterChange = jest.fn();
      render(<FilterPanel onFilterChange={handleFilterChange} availableCuisines={availableCuisines} />);

      // Set some filters first
      fireEvent.click(screen.getByTestId('filter-cuisine-italian'));
      fireEvent.click(screen.getByTestId('filter-rating-4'));

      // Clear them
      fireEvent.click(screen.getByTestId('clear-filters'));
      expect(handleFilterChange).toHaveBeenLastCalledWith({});
    });
  });
});
