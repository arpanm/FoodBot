package com.foodbot.mcp.search;

import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.model.Restaurant;
import com.foodbot.mcp.providers.mock.MockMCPService;
import com.foodbot.mcp.repository.RestaurantSearchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RestaurantSearchServiceTest {

    @Mock
    private RestaurantSearchRepository restaurantSearchRepository;

    @Mock
    private MockMCPService mockMCPService;

    @InjectMocks
    private RestaurantSearchService service;

    private SearchRequest defaultFilters;

    @BeforeEach
    void setUp() {
        defaultFilters = SearchRequest.builder()
                .page(1)
                .pageSize(20)
                .build();
    }

    @Test
    void searchRestaurants_shouldReturnResults() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .restaurants(List.of(
                        Restaurant.builder().id("r1").name("Pizza Palace").build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(restaurantSearchRepository.search(any(SearchRequest.class)))
                .thenReturn(expectedResponse);

        SearchResponse result = service.searchRestaurants("pizza", defaultFilters, 1, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalResults());
        assertEquals("Pizza Palace", result.getRestaurants().get(0).getName());
        assertTrue(result.getQueryTimeMs() >= 0);
    }

    @Test
    void searchRestaurants_shouldFallbackToMock_whenEsFails() {
        SearchResponse fallbackResponse = SearchResponse.builder()
                .restaurants(List.of(
                        Restaurant.builder().id("r1").name("Mock Restaurant").build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(restaurantSearchRepository.search(any(SearchRequest.class)))
                .thenThrow(new SearchException("ES unavailable"));
        when(mockMCPService.searchRestaurants(any(SearchRequest.class)))
                .thenReturn(fallbackResponse);

        SearchResponse result = service.searchRestaurants("test", defaultFilters, 1, 20);

        assertNotNull(result);
        assertEquals("MOCK_FALLBACK", result.getProvider());
        assertEquals(1, result.getTotalResults());
    }

    @Test
    void searchByLocation_shouldReturnNearbyRestaurants() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .restaurants(List.of(
                        Restaurant.builder().id("r1").name("Nearby Spot").build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(restaurantSearchRepository.searchByLocation(
                eq(37.7749), eq(-122.4194), eq(5.0), eq(1), eq(20)
        )).thenReturn(expectedResponse);

        SearchResponse result = service.searchByLocation(37.7749, -122.4194, 5.0, 1, 20);

        assertNotNull(result);
        assertEquals(1, result.getTotalResults());
    }

    @Test
    void searchByLocation_shouldThrow_forInvalidLatitude() {
        assertThrows(IllegalArgumentException.class, () ->
                service.searchByLocation(91.0, -122.4194, 5.0, 1, 20));
    }

    @Test
    void searchByLocation_shouldThrow_forInvalidLongitude() {
        assertThrows(IllegalArgumentException.class, () ->
                service.searchByLocation(37.7749, 181.0, 5.0, 1, 20));
    }

    @Test
    void searchByLocation_shouldThrow_forInvalidRadius() {
        assertThrows(IllegalArgumentException.class, () ->
                service.searchByLocation(37.7749, -122.4194, 0, 1, 20));

        assertThrows(IllegalArgumentException.class, () ->
                service.searchByLocation(37.7749, -122.4194, 101, 1, 20));
    }

    @Test
    void searchByCuisine_shouldReturnFilteredResults() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .restaurants(List.of(
                        Restaurant.builder().id("r1").name("Italian Place").build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(restaurantSearchRepository.searchByCuisine(
                eq(List.of("Italian")), any(SearchRequest.class)
        )).thenReturn(expectedResponse);

        SearchResponse result = service.searchByCuisine(List.of("Italian"), defaultFilters);

        assertNotNull(result);
        assertEquals(1, result.getTotalResults());
    }

    @Test
    void searchByCuisine_shouldReturnEmpty_forNullCuisines() {
        SearchResponse result = service.searchByCuisine(null, defaultFilters);
        assertEquals(0, result.getTotalResults());
    }

    @Test
    void searchByRating_shouldReturnFilteredResults() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .restaurants(List.of(
                        Restaurant.builder().id("r1").name("Top Rated").rating(4.5).build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(restaurantSearchRepository.searchByRating(eq(4.0), any(SearchRequest.class)))
                .thenReturn(expectedResponse);

        SearchResponse result = service.searchByRating(4.0, defaultFilters);

        assertNotNull(result);
        assertEquals(1, result.getTotalResults());
    }

    @Test
    void searchByRating_shouldThrow_forInvalidRating() {
        assertThrows(IllegalArgumentException.class, () ->
                service.searchByRating(-1, defaultFilters));

        assertThrows(IllegalArgumentException.class, () ->
                service.searchByRating(6, defaultFilters));
    }

    @Test
    void autocompleteSuggestions_shouldReturnSuggestions() {
        when(restaurantSearchRepository.autocompleteSuggestions("piz", 10))
                .thenReturn(List.of("Pizza Palace", "Pizza Hut", "Pizza Express"));

        List<String> suggestions = service.autocompleteSuggestions("piz");

        assertEquals(3, suggestions.size());
        assertTrue(suggestions.contains("Pizza Palace"));
    }

    @Test
    void autocompleteSuggestions_shouldReturnEmpty_forShortPrefix() {
        List<String> suggestions = service.autocompleteSuggestions("p");
        assertTrue(suggestions.isEmpty());
    }

    @Test
    void autocompleteSuggestions_shouldReturnEmpty_forNullPrefix() {
        List<String> suggestions = service.autocompleteSuggestions(null);
        assertTrue(suggestions.isEmpty());
    }
}
