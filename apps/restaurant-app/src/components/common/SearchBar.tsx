/**
 * SearchBar - Reusable search input with debounce support
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onSearch: (query: string) => void;
  debounceMs?: number;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = React.memo(
  ({ placeholder = 'Search...', value = '', onSearch, debounceMs = 300, className = '' }) => {
    const [inputValue, setInputValue] = useState(value);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      setInputValue(value);
    }, [value]);

    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        const newValue = event.target.value;
        setInputValue(newValue);

        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }

        timerRef.current = setTimeout(() => {
          onSearch(newValue);
        }, debounceMs);
      },
      [onSearch, debounceMs]
    );

    const handleClear = useCallback((): void => {
      setInputValue('');
      onSearch('');
    }, [onSearch]);

    useEffect(() => {
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }, []);

    return (
      <div className={`relative ${className}`}>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          data-testid="search-bar-input"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleChange}
          className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            data-testid="search-bar-clear"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

SearchBar.displayName = 'SearchBar';
