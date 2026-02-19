import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useDebounce } from '../../hooks/useDebounce';
import { searchService } from '../../services/search.service';
import { Input } from '../common/Input';

export interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  'data-testid'?: string;
}

/**
 * Search input with autocomplete suggestions.
 * Debounces input and fetches suggestions from the search API.
 */
export const SearchBar: React.FC<SearchBarProps> = React.memo(({
  onSearch,
  placeholder = 'Search restaurants, dishes...',
  initialValue = '',
  'data-testid': testId,
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const debouncedQuery = useDebounce(query, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchService
        .getRestaurantSuggestions(debouncedQuery)
        .then((results) => {
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        })
        .catch(() => {
          setSuggestions([]);
          setShowSuggestions(false);
        });
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value);
      setActiveSuggestionIndex(-1);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    setShowSuggestions(false);
    onSearch(query);
  }, [onSearch, query]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setQuery(suggestion);
      setShowSuggestions(false);
      onSearch(suggestion);
    },
    [onSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
          handleSuggestionClick(suggestions[activeSuggestionIndex]);
        } else {
          handleSubmit();
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    },
    [activeSuggestionIndex, suggestions, handleSuggestionClick, handleSubmit]
  );

  return (
    <div
      className="search-bar"
      ref={containerRef}
      data-testid={testId || 'search-bar'}
    >
      <div className="search-bar__input-wrapper">
        <Input
          type="search"
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          data-testid="search-bar-input"
          fullWidth
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          role="combobox"
        />
        <button
          className="search-bar__submit"
          onClick={handleSubmit}
          data-testid="search-bar-submit"
          aria-label="Search"
          type="button"
        >
          Search
        </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <ul
          className="search-bar__suggestions"
          data-testid="search-suggestions"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              className={`search-bar__suggestion ${
                index === activeSuggestionIndex
                  ? 'search-bar__suggestion--active'
                  : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setActiveSuggestionIndex(index)}
              data-testid={`search-suggestion-${index}`}
              role="option"
              aria-selected={index === activeSuggestionIndex}
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';
