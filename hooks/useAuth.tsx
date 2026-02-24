import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import api from '../services/api';
import { getToken, getUser, saveToken, saveUser, removeToken, removeUser } from '../services/storage';

interface AuthContextType {
    user: any | null;
    isLoading: boolean;
    signIn: (token: string, user: any) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: true,
    signIn: async () => { },
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const segments = useSegments();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        try {
            const token = await getToken();
            const userData = await getUser();
            if (token && userData) {
                setUser(userData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isLoading) return;

        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        } else if (user && inAuthGroup) {
            router.replace('/(admin)/dashboard');
        }
    }, [user, segments, isLoading]);

    const signIn = async (token: string, userData: any) => {
        await saveToken(token);
        await saveUser(userData);
        setUser(userData);
    };

    const signOut = async () => {
        await removeToken();
        await removeUser();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};
