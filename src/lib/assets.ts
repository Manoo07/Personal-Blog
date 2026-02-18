/**
 * Get the correct asset path for deployment.
 * Vite's `base` is set to "/Personal-Blog/" so public assets
 * are always served under that prefix in both dev and prod.
 */
export const getAssetPath = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  // import.meta.env.BASE_URL is set by Vite from the `base` config
  return `${import.meta.env.BASE_URL}${cleanPath}`;
};

/**
 * Get the base URL for the application
 */
export const getBaseUrl = (): string => {
  return import.meta.env.BASE_URL;
};