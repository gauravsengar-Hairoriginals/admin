import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, HelperText } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { signIn } = useAuth();

    const handleLogin = async () => {
        if (!email || !password) {
            setError('Please enter email and password');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await api.post('/auth/login', {
                email,
                password,
            });

            const { accessToken, user } = response.data;

            // Check if user has admin privileges
            const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'CEO', 'CTO', 'COO', 'LEAD_CALLER'];
            if (!allowedRoles.includes(user.role) && !user.role.startsWith('HEAD_')) {
                setError('Access Denied: You do not have admin privileges.');
                setLoading(false);
                return;
            }

            await signIn(accessToken, user);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.message || 'Login failed. Please check credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../assets/images/logo.png')}
                        style={styles.logo}
                        resizeMode="contain"
                    />
                </View>

                <TextInput
                    label="Email"
                    value={email}
                    onChangeText={setEmail}
                    mode="outlined"
                    style={styles.input}
                    autoCapitalize="none"
                    keyboardType="email-address"
                />

                <TextInput
                    label="Password"
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    style={styles.input}
                    secureTextEntry
                />

                {error ? <HelperText type="error" visible={!!error}>{error}</HelperText> : null}

                <Button
                    mode="contained"
                    onPress={handleLogin}
                    loading={loading}
                    style={styles.button}
                    buttonColor={Colors.primary}
                >
                    Login
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: 'white',
        padding: 30,
        borderRadius: 8,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logo: {
        width: 180,
        height: 60,
    },
    title: {
        textAlign: 'center',
        marginBottom: 30,
        fontWeight: 'bold',
        color: Colors.primary,
    },
    input: {
        marginBottom: 15,
        backgroundColor: 'white',
    },
    button: {
        marginTop: 10,
        paddingVertical: 5,
    },
});
