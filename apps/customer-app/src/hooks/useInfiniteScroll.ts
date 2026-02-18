import { useEffect, useRef } from 'react';

export interface UseInfiniteScrollOptions {
  threshold?: number;
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

/**
 * Hook for implementing infinite scroll pagination
 */
export function useInfiniteScroll({
  threshold = 100,
  onLoadMore,
  hasMore,
  loading,
}: UseInfiniteScrollOptions) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (loading || !hasMore) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading, hasMore, onLoadMore, threshold]);

  return { loadMoreRef };
}
