import axios from 'axios';

// Create a single Axios instance configured with the base URL coming from the
// environment variable. This prevents scattering hard-coded URLs across the
// codebase and makes it trivial to switch environments (development, staging,
// production) by simply changing VITE_API_URL.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Automatically attach the bearer token (if present) to every request so that
// pages no longer need to manually manage Authorization headers.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // eslint-disable-next-line no-param-reassign
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;