package com.foodbot.mcp.search;

import com.foodbot.mcp.exception.SearchException;
import com.foodbot.mcp.model.Dish;
import com.foodbot.mcp.model.SearchRequest;
import com.foodbot.mcp.model.SearchResponse;
import com.foodbot.mcp.providers.mock.MockMCPService;
import com.foodbot.mcp.repository.DishSearchRepository;
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
class DishSearchServiceTest {

    @Mock
    private DishSearchRepository dishSearchRepository;

    @Mock
    private MockMCPService mockMCPService;

    @InjectMocks
    private DishSearchService service;

    @Test
    void searchDishes_shouldReturnResults() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .dishes(List.of(
                        Dish.builder().id("d1").name("Margherita Pizza").price(12.99).build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(dishSearchRepository.search(any(SearchRequest.class)))
                .thenReturn(expectedResponse);

        SearchRequest filters = SearchRequest.builder().page(1).pageSize(20).build();
        SearchResponse result = service.searchDishes("pizza", filters);

        assertNotNull(result);
        assertEquals(1, result.getTotalResults());
        assertEquals("Margherita Pizza", result.getDishes().get(0).getName());
    }

    @Test
    void searchDishes_shouldFallbackToMock_whenEsFails() {
        SearchResponse fallbackResponse = SearchResponse.builder()
                .dishes(List.of(
                        Dish.builder().id("d1").name("Mock Dish").build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(dishSearchRepository.search(any(SearchRequest.class)))
                .thenThrow(new SearchException("ES unavailable"));
        when(mockMCPService.searchDishes(any(SearchRequest.class)))
                .thenReturn(fallbackResponse);

        SearchRequest filters = SearchRequest.builder().page(1).pageSize(20).build();
        SearchResponse result = service.searchDishes("test", filters);

        assertNotNull(result);
        assertEquals("MOCK_FALLBACK", result.getProvider());
    }

    @Test
    void searchByIngredients_shouldReturnResults() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .dishes(List.of(
                        Dish.builder().id("d1").name("Caprese Salad").build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(dishSearchRepository.searchByIngredients(anyList(), anyInt(), anyInt()))
                .thenReturn(expectedResponse);

        SearchResponse result = service.searchByIngredients(List.of("mozzarella", "tomato"));

        assertNotNull(result);
        assertEquals(1, result.getTotalResults());
    }

    @Test
    void searchByIngredients_shouldReturnEmpty_forNullIngredients() {
        SearchResponse result = service.searchByIngredients(null);
        assertEquals(0, result.getTotalResults());
    }

    @Test
    void searchByIngredients_shouldReturnEmpty_forEmptyIngredients() {
        SearchResponse result = service.searchByIngredients(List.of());
        assertEquals(0, result.getTotalResults());
    }

    @Test
    void searchByDietaryRestrictions_shouldReturnResults() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .dishes(List.of(
                        Dish.builder().id("d1").name("Vegan Bowl").build()
                ))
                .totalResults(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(dishSearchRepository.searchByDietaryRestrictions(anyList(), anyInt(), anyInt()))
                .thenReturn(expectedResponse);

        SearchResponse result = service.searchByDietaryRestrictions(List.of("Vegan"));

        assertNotNull(result);
        assertEquals(1, result.getTotalResults());
    }

    @Test
    void searchByDietaryRestrictions_shouldReturnEmpty_forNullRestrictions() {
        SearchResponse result = service.searchByDietaryRestrictions(null);
        assertEquals(0, result.getTotalResults());
    }

    @Test
    void similarDishes_shouldReturnResults() {
        SearchResponse expectedResponse = SearchResponse.builder()
                .dishes(List.of(
                        Dish.builder().id("d2").name("Pepperoni Pizza").build(),
                        Dish.builder().id("d3").name("Hawaiian Pizza").build()
                ))
                .totalResults(2)
                .page(1)
                .pageSize(10)
                .totalPages(1)
                .build();

        when(dishSearchRepository.findSimilarDishes("d1", 10))
                .thenReturn(expectedResponse);

        SearchResponse result = service.similarDishes("d1");

        assertNotNull(result);
        assertEquals(2, result.getTotalResults());
    }

    @Test
    void similarDishes_shouldReturnEmpty_forNullDishId() {
        SearchResponse result = service.similarDishes(null);
        assertEquals(0, result.getTotalResults());
    }

    @Test
    void similarDishes_shouldReturnEmpty_forEmptyDishId() {
        SearchResponse result = service.similarDishes("");
        assertEquals(0, result.getTotalResults());
    }
}
