import * as React from "react";
import { useInfiniteQuery, type QueryKey } from "@tanstack/react-query";

export interface PaginatedPage<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  /** Server-computed. See the note on `lookupPageSchema` in @repo/types. */
  hasMore: boolean;
}

export interface UsePaginatedListOptions<T> {
  /**
   * react-query cache scope. Include every server-side filter that affects the result —
   * the debounced search term is appended automatically.
   */
  queryKey: QueryKey;
  fetchPage: (params: {
    page: number;
    pageSize: number;
    search: string;
    signal?: AbortSignal;
  }) => Promise<PaginatedPage<T>>;
  pageSize?: number;
  /** Raw search term; debounced internally. */
  search?: string;
  debounceMs?: number;
  /** Don't fetch until the term is at least this long. v4's `searchAsYouType`, as a number. */
  minSearchLength?: number;
  /** AsyncCombobox passes the popover's `open` so a closed dropdown fetches nothing. */
  enabled?: boolean;
  staleTime?: number;
  /** Fraction of the scroll container that must be passed to page in. */
  scrollThreshold?: number;
  /** Stable identity for cross-page dedupe. Without it, pages are concatenated as-is. */
  getItemKey?: (item: T) => string;
}

export interface UsePaginatedListResult<T> {
  items: T[];
  total: number | null;
  /** First page in flight, INCLUDING the debounce window. */
  isLoading: boolean;
  isLoadingMore: boolean;
  isDebouncing: boolean;
  error: Error | null;
  hasMore: boolean;
  fetchNextPage: () => void;
  refetch: () => void;
  /** Put on the scroll container. */
  onScroll: React.UIEventHandler<HTMLElement>;
  /** Alternative trigger: a sentinel element at the end of the list. */
  sentinelRef: (node: HTMLElement | null) => void;
}

/**
 * Page-based infinite list over `useInfiniteQuery`.
 *
 * Replaces v4's `usePaginatedList` (167 LOC) and `utils/autocompleteCache.ts` (236 LOC).
 * v4's generation counter, `loadingMoreRef`, `pageRef` and `hasMoreRef` all existed to
 * compensate for hand-rolled request state; react-query makes every one of those races
 * structurally impossible — stale responses are discarded by query key, the page cursor
 * lives in the cache entry's `pageParams`, and concurrent calls are deduped.
 *
 * `autocompleteCache` is not ported at all: its "smart" cache key returned an EXISTING
 * key whenever the new term was within Levenshtein distance 2, so searching "nashik"
 * could silently serve rows cached for "nasik". `staleTime` does the same job correctly.
 *
 * Pages are 0-based, matching `paginationQuerySchema`.
 */
export function usePaginatedList<T>({
  queryKey,
  fetchPage,
  pageSize = 20,
  search = "",
  debounceMs = 300,
  minSearchLength = 0,
  enabled = true,
  staleTime = 5 * 60_000,
  scrollThreshold = 0.8,
  getItemKey,
}: UsePaginatedListOptions<T>): UsePaginatedListResult<T> {
  const debouncedSearch = useDebouncedValue(search, debounceMs);
  const isDebouncing = search !== debouncedSearch;
  const meetsMinLength = debouncedSearch.trim().length >= minSearchLength;
  const queryEnabled = enabled && meetsMinLength;

  const query = useInfiniteQuery({
    queryKey: [...queryKey, debouncedSearch, pageSize],
    queryFn: ({ pageParam, signal }) =>
      fetchPage({ page: pageParam, pageSize, search: debouncedSearch, signal }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: queryEnabled,
    staleTime,
  });

  const items = React.useMemo(() => {
    const pages = query.data?.pages ?? [];
    const flat = pages.flatMap((page) => page.data);
    if (!getItemKey) return flat;
    // A row can legitimately appear on two pages if the underlying set changed between
    // requests; rendering it twice would produce duplicate React keys.
    const seen = new Set<string>();
    return flat.filter((item) => {
      const key = getItemKey(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [query.data, getItemKey]);

  const total = query.data?.pages.at(-1)?.total ?? null;
  const hasMore = Boolean(query.hasNextPage);

  const fetchNextPage = React.useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
  }, [query]);

  const onScroll = React.useCallback<React.UIEventHandler<HTMLElement>>(
    (event) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      // Load-bearing guard, not defensive: jsdom performs no layout and reports 0 for all
      // three, which would make the fraction below NaN/Infinity and page on every scroll.
      if (scrollHeight <= clientHeight) return;
      const progress = (scrollTop + clientHeight) / scrollHeight;
      if (progress >= scrollThreshold) fetchNextPage();
    },
    [fetchNextPage, scrollThreshold],
  );

  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const sentinelRef = React.useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      if (!node) return;
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) fetchNextPage();
      });
      observerRef.current.observe(node);
    },
    [fetchNextPage],
  );

  React.useEffect(() => () => observerRef.current?.disconnect(), []);

  return {
    items,
    total,
    isLoading: queryEnabled && (isDebouncing || (query.isFetching && !query.isFetchingNextPage)),
    isLoadingMore: query.isFetchingNextPage,
    isDebouncing,
    error: (query.error as Error | null) ?? null,
    hasMore,
    fetchNextPage,
    refetch: () => void query.refetch(),
    onScroll,
    sentinelRef,
  };
}

/** Trailing-edge debounce. `delay <= 0` passes the value straight through. */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
