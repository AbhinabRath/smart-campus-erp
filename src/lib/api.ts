// =============================================================================
// Smart Campus ERP - Centralized API Client
// =============================================================================
// Provides a pre-configured axios instance for all backend API calls.
// Next.js rewrites in next.config.ts proxy /api/* requests to the Express
// backend running on port 3001. This means the browser sends requests to
// /api/... on the same origin, and Next.js forwards them to port 3001.
//
// DUAL AUTH: The API client sends credentials via BOTH:
// 1. Cookies (withCredentials: true) — works for same-site requests
// 2. Authorization: Bearer <token> header — fallback for cross-site iframe
//    contexts where SameSite=Lax cookies are blocked by the browser.
//    The token is stored in localStorage by the Zustand store on login.
// =============================================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// Request interceptor: attach Authorization header with session token.
// This is critical for cross-site iframe contexts (e.g., sandbox preview panel)
// where the browser blocks SameSite=Lax cookies on XHR/fetch subrequests.
// The Bearer token is read from localStorage, which the Zustand store sets
// on login and clears on logout.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('campus_session_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle authentication errors gracefully.
// We do NOT auto-reload on 401 to prevent infinite loops when the
// initial session check fails (which is expected for unauthenticated users).
// The session check in page.tsx handles 401 by showing the login page.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Just propagate the error — let the calling code decide what to do.
    // The page.tsx useEffect catches 401 from /auth/me and calls logout().
    return Promise.reject(error);
  }
);

export default api;
