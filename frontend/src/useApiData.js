import { useEffect, useState } from 'react';
import { api } from './api';

export function useApiData(path, token, reloadKey = 0) {
  const [state, setState] = useState({ data: null, error: '', status: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: '', status: null, loading: true });
    api(path, { token })
      .then((data) => { if (!cancelled) setState({ data, error: '', status: 200, loading: false }); })
      .catch((err) => {
        if (!cancelled) setState({ data: null, error: err.message, status: err.status ?? null, loading: false });
      });
    return () => { cancelled = true; };
  }, [path, token, reloadKey]);

  return state;
}