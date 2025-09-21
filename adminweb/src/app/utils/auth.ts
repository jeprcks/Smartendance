export const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  
  // Check both localStorage and cookies
  const token = localStorage.getItem('token');
  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
  
  // Ensure token exists and is not empty
  const hasValidToken = (token && token.length > 0) || (tokenCookie && tokenCookie.split('=')[1].length > 0);
  
  return hasValidToken;
};

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('token');
  if (!token) {
    // If no token in localStorage, check cookies
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find(cookie => cookie.trim().startsWith('token='));
    if (tokenCookie) {
      return tokenCookie.split('=')[1];
    }
  }
  return token;
};

export const setToken = (token: string) => {
  if (typeof window === 'undefined' || !token) return;
  
  // Set in localStorage
  localStorage.setItem('token', token);
  
  // Set in cookies with path=/ to make it available across all pages
  document.cookie = `token=${token};path=/;max-age=86400;Secure;SameSite=Strict`; // 24 hours expiry
};

export const removeToken = () => {
  if (typeof window === 'undefined') return;
  
  // Remove from localStorage
  localStorage.removeItem('token');
  sessionStorage.clear(); // Clear any session data
  
  // Remove from cookies more thoroughly
  document.cookie = 'token=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;Secure;SameSite=Strict';
  document.cookie = 'token=;path=/home;expires=Thu, 01 Jan 1970 00:00:01 GMT;Secure;SameSite=Strict';
  document.cookie = 'token=;path=/dashboard;expires=Thu, 01 Jan 1970 00:00:01 GMT;Secure;SameSite=Strict';
};