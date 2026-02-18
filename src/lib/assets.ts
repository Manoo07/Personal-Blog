/**
 * Get the correct asset path for deployment
 * Handles both development and production environments
 */
export const getAssetPath = (path: string): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // In development, use relative paths
  if (import.meta.env.DEV) {
    return `/${cleanPath}`;
  }
  
  // In production (GitHub Pages), include the base path
  return `/Personal-Blog/${cleanPath}`;
};

/**
 * Get the base URL for the application
 */
export const getBaseUrl = (): string => {
  return import.meta.env.DEV ? '/' : '/Personal-Blog/';
};