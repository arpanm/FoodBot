import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { FilterBar } from '../FilterBar';

const defaultOptions = [
  { label: 'All', value: 'all', count: 10 },
  { label: 'Pending', value: 'PENDING', count: 3 },
  { label: 'Delivered', value: 'DELIVERED', count: 5 },
];

describe('FilterBar', () => {
  it('should render all filter options', () => {
    const onSelect = jest.fn();
    render(<FilterBar options={defaultOptions} selected="all" onSelect={onSelect} />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('should display counts for options', () => {
    const onSelect = jest.fn();
    render(<FilterBar options={defaultOptions} selected="all" onSelect={onSelect} />);

    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should call onSelect when a filter is clicked', () => {
    const onSelect = jest.fn();
    render(<FilterBar options={defaultOptions} selected="all" onSelect={onSelect} />);

    fireEvent.click(screen.getByTestId('filter-PENDING'));
    expect(onSelect).toHaveBeenCalledWith('PENDING');
  });

  it('should highlight the selected filter', () => {
    const onSelect = jest.fn();
    render(<FilterBar options={defaultOptions} selected="PENDING" onSelect={onSelect} />);

    const pendingButton = screen.getByTestId('filter-PENDING');
    expect(pendingButton).toHaveClass('bg-primary-600');
  });

  it('should not highlight unselected filters', () => {
    const onSelect = jest.fn();
    render(<FilterBar options={defaultOptions} selected="PENDING" onSelect={onSelect} />);

    const allButton = screen.getByTestId('filter-all');
    expect(allButton).not.toHaveClass('bg-primary-600');
  });
});
