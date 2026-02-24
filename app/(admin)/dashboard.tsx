import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Card, ActivityIndicator, useTheme } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'expo-router';
import AdminPageLayout from '../../components/AdminPageLayout';

export default function DashboardScreen() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();
    const theme = useTheme();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Need to implement this endpoint in backend
            // const response = await api.get('/admin/dashboard');
            // setStats(response.data);

            // Mock data for now
            setTimeout(() => {
                setStats({
                    totalRevenue: 1250000,
                    activeStylists: 45,
                    pendingReferrals: 12,
                    totalSalons: 8
                });
                setLoading(false);
            }, 1000);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    return (
        <AdminPageLayout>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>Overview</Text>
                <Text variant="bodyLarge" style={{ color: Colors.textSecondary }}>Welcome back, {user?.name}</Text>
            </View>

            {isSuperAdmin && (
                <Card style={[styles.card, styles.actionCard]} onPress={() => router.push('/(admin)/admin-management')} mode="outlined">
                    <Card.Content>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View>
                                <Text variant="titleMedium" style={{ color: Colors.primary, fontWeight: 'bold' }}>Manage Admins</Text>
                                <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Create, edit, and manage admin users and permissions.</Text>
                            </View>
                        </View>
                    </Card.Content>
                </Card>
            )}

            <View style={styles.statsGrid}>
                <StatsCard title="Total Revenue" value={`₹${stats?.totalRevenue.toLocaleString()}`} color={Colors.primary} icon="cash" />
                <StatsCard title="Active Stylists" value={stats?.activeStylists} color={Colors.secondary} icon="account-group" />
                <StatsCard title="Pending Referrals" value={stats?.pendingReferrals} color={Colors.error} icon="clock-outline" />
                <StatsCard title="Total Salons" value={stats?.totalSalons} color={Colors.warning} icon="store" />
            </View>
        </AdminPageLayout>
    );
}

const StatsCard = ({ title, value, color, icon }: any) => (
    <Card style={styles.statsCard} mode="elevated" elevation={2}>
        <Card.Content>
            <Text variant="titleMedium" style={{ color: Colors.textSecondary, marginBottom: 8 }}>{title}</Text>
            <Text variant="headlineMedium" style={{ color: color, fontWeight: 'bold' }}>{value}</Text>
        </Card.Content>
    </Card>
);

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginBottom: 32,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
    },
    statsCard: {
        minWidth: 250,
        flex: 1,
        backgroundColor: Colors.surface,
    },
    card: {
        marginBottom: 32,
    },
    actionCard: {
        backgroundColor: Colors.active,
        borderColor: Colors.primary,
    }
});
