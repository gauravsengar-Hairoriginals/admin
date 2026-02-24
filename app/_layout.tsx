import { Slot } from 'expo-router';
import { MD3LightTheme, Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';

const theme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: Colors.primary,
        secondary: Colors.secondary,
        background: Colors.background,
        surface: Colors.surface,
        error: Colors.error,
        onSurface: '#000000', // Text color on surface
        onBackground: '#000000', // Text color on background
        onSurfaceVariant: '#000000', // Secondary text color (forced black)
    },
};

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <PaperProvider theme={theme}>
                <AuthProvider>
                    <Slot />
                </AuthProvider>
            </PaperProvider>
        </SafeAreaProvider>
    );
}
