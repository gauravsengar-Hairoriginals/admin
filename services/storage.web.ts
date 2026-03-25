// Web-specific storage — Metro automatically resolves this file over storage.ts on web.
// Uses localStorage since expo-secure-store is not available on web.

export const saveToken = async (token: string): Promise<void> => {
    localStorage.setItem('adminAccessToken', token);
};

export const getToken = async (): Promise<string | null> => {
    return localStorage.getItem('adminAccessToken');
};

export const removeToken = async (): Promise<void> => {
    localStorage.removeItem('adminAccessToken');
};

export const saveRefreshToken = async (token: string): Promise<void> => {
    localStorage.setItem('adminRefreshToken', token);
};

export const getRefreshToken = async (): Promise<string | null> => {
    return localStorage.getItem('adminRefreshToken');
};

export const removeRefreshToken = async (): Promise<void> => {
    localStorage.removeItem('adminRefreshToken');
};

export const saveUser = async (user: any): Promise<void> => {
    localStorage.setItem('adminUser', JSON.stringify(user));
};

export const getUser = async (): Promise<any | null> => {
    const userStr = localStorage.getItem('adminUser');
    return userStr ? JSON.parse(userStr) : null;
};

export const removeUser = async (): Promise<void> => {
    localStorage.removeItem('adminUser');
};
