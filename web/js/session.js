// The GitHub token stays in this browser. By default it ends with the browser session.
import { createStore } from '../core/github-store.js';

const TOKEN_KEY = 'car-service.token';
export const DATA_SOURCE = { owner: 'tipokkitkobsin', repo: 'car-service-data', path: 'data/car.json' };

const attempt = (work, fallback) => {
  try {
    return work();
  } catch {
    return fallback;
  }
};

export const readToken = () => attempt(
  () => sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(TOKEN_KEY),
  null,
);

export const clearToken = () => {
  attempt(() => sessionStorage.removeItem(TOKEN_KEY));
  attempt(() => localStorage.removeItem(TOKEN_KEY));
};

export const writeToken = (token, shouldRemember) => attempt(() => {
  clearToken();
  (shouldRemember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  return true;
}, false);

export const openStore = (token) => createStore({ ...DATA_SOURCE, token });
