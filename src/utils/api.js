export function apiUrl(path) {
  const base = import.meta.env.VITE_API_URL?.trim();
  if (!base) {
    return path;
  }

  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}
