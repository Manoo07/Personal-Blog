import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { DEFAULT_SITE_CONFIG, mergeWithDefaults, type SiteConfig } from "@/lib/site-config";

const QUERY_KEY = ["site-config"] as const;
const CACHE_KEY = "site-config:v1";

function readCache(): SiteConfig | undefined {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? mergeWithDefaults(JSON.parse(raw)) : undefined;
  } catch {
    return undefined;
  }
}

function writeCache(config: SiteConfig) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

/**
 * The site's editable content. Always returns a complete config: the last
 * cached copy (or the built-in defaults) is shown instantly, then replaced by
 * the server copy — so pages never render empty and don't flash old text for
 * returning visitors.
 */
export function useSiteConfig(): SiteConfig {
  const { data } = useQuery<SiteConfig>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const res = await api.getSiteConfig();
      const merged = mergeWithDefaults(res.config);
      writeCache(merged);
      return merged;
    },
    placeholderData: readCache,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
  return data ?? DEFAULT_SITE_CONFIG;
}

/** Whether the server has a saved config yet (for the admin screen). */
export function useSiteConfigStatus() {
  return useQuery({
    queryKey: [...QUERY_KEY, "status"],
    queryFn: () => api.getSiteConfig(),
    staleTime: 0,
  });
}

export function useUpdateSiteConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (config: SiteConfig) => api.updateSiteConfig(config),
    onSuccess: (res) => {
      const merged = mergeWithDefaults(res.config);
      writeCache(merged);
      queryClient.setQueryData(QUERY_KEY, merged);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "status"] });
    },
  });
}
