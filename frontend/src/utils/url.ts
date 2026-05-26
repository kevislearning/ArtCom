export const getBackendUrl = () => {
  return (import.meta.env.VITE_API_URL as string)?.replace('/api', '') || 'http://localhost:5000';
};

export const getImageUrl = (path?: string) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('blob') || path.startsWith('data:')) {
    return path;
  }
  return `${getBackendUrl()}${path}`;
};
