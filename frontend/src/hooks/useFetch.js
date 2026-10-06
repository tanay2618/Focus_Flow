import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client.js';

/**
 * Runs an async loader whenever `deps` change. Keeps the previous data on screen while
 * refreshing, so lists do not flash back to a spinner after every action.
 */
export function useFetch(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    loader()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((err) => { if (!cancelled) setState((s) => ({ data: s.data, loading: false, error: getErrorMessage(err) })); });
    return () => { cancelled = true; };
  }, [...deps, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
