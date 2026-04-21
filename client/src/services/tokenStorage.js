const TOKEN_STORAGE_KEY = "token";

export const getAuthToken = () => sessionStorage.getItem(TOKEN_STORAGE_KEY);

export const setAuthToken = (token) => {
  if (!token) {
    return;
  }

  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearAuthToken = () => {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};
