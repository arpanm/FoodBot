package com.foodbot.mcp.cache;

import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.interceptor.KeyGenerator;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.stream.Collectors;

/**
 * Custom cache key generator for complex objects.
 * Generates deterministic, collision-resistant cache keys.
 */
@Slf4j
@Component("customCacheKeyGenerator")
public class CacheKeyGenerator implements KeyGenerator {

    @Override
    public Object generate(Object target, Method method, Object... params) {
        String className = target.getClass().getSimpleName();
        String methodName = method.getName();
        String paramString = Arrays.stream(params)
                .map(p -> p != null ? p.toString() : "null")
                .collect(Collectors.joining(":"));

        String key = String.format("%s:%s:%s", className, methodName, paramString);
        log.trace("Generated cache key: {}", key);
        return key;
    }

    /**
     * Generates a cache key for restaurant details.
     */
    public static String restaurantKey(String restaurantId) {
        return String.format("restaurant:%s", restaurantId);
    }

    /**
     * Generates a cache key for dish details.
     */
    public static String dishKey(String dishId) {
        return String.format("dish:%s", dishId);
    }

    /**
     * Generates a cache key for a restaurant's menu.
     */
    public static String menuKey(String restaurantId) {
        return String.format("menu:%s", restaurantId);
    }

    /**
     * Generates a cache key for filters.
     */
    public static String filterKey(String query) {
        return String.format("filters:%s", query != null ? query : "all");
    }
}
