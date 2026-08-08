import { fetchFormConfig } from '../../services/slopbop';
import { useResource } from '../useResource';

// The application form config is static for a session — fetch once, cached +
// in-flight-deduped by useResource's cache mode. Unlike the world hooks it
// surfaces an `error` flag so the form can render an inline load-failure state
// instead of a toast. A failed load is retryable on remount.
export function useFormConfig() {
  const { data: config, loading, error } = useResource(fetchFormConfig, 'form-config', {
    cache: true,
  });
  return { config, loading, error: error ? 'Failed to load form' : null };
}
