import axios from 'axios';
import { API_URL } from '../constants/Colors';
import { getToken, getRefreshToken, saveToken } from '../services/storage';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// ── Request interceptor: attach auth token ────────────────────────────────────
api.interceptors.request.use(async (config) => {
    const token = await getToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ── 401 → silent token refresh → retry → only logout if refresh fails ─────────
// AuthProvider registers its signOut callback via setUnauthorizedHandler()
// so we avoid a circular import between api.ts and useAuth.tsx.
let _onUnauthorized: (() => void) | null = null;
let _isRefreshing = false;
let _refreshQueue: Array<(token: string | null) => void> = [];

export const setUnauthorizedHandler = (handler: () => void) => {
    _onUnauthorized = handler;
};

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error?.response?.status === 401 && !originalRequest._retry) {
            // If already refreshing, queue this request
            if (_isRefreshing) {
                return new Promise((resolve, reject) => {
                    _refreshQueue.push((token) => {
                        if (token) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(api(originalRequest));
                        } else {
                            reject(error);
                        }
                    });
                });
            }

            originalRequest._retry = true;
            _isRefreshing = true;

            try {
                const refreshToken = await getRefreshToken();

                if (!refreshToken) throw new Error('No refresh token stored');

                // Call the backend refresh endpoint
                const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
                const newAccessToken: string = res.data.accessToken;

                // Persist new access token and update default header
                await saveToken(newAccessToken);
                api.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

                // Flush the queued requests with the new token
                _refreshQueue.forEach(cb => cb(newAccessToken));
                _refreshQueue = [];
                _isRefreshing = false;

                // Retry the original request
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch {
                // Refresh failed — flush queue with null (they will reject) and log out
                _refreshQueue.forEach(cb => cb(null));
                _refreshQueue = [];
                _isRefreshing = false;
                if (_onUnauthorized) _onUnauthorized();
            }
        }

        return Promise.reject(error);
    },
);

export default api;
