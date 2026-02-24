import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Appbar, Button, Menu, Divider, Avatar, Text } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLayout() {
    const { signOut, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [visible, setVisible] = React.useState(false);

    const openMenu = () => setVisible(true);
    const closeMenu = () => setVisible(false);

    const isLeadCaller = user?.role === 'LEAD_CALLER';

    const allNavItems = [
        { name: 'Dashboard', route: '/(admin)/dashboard', icon: 'view-dashboard' },
        { name: 'Stylists', route: '/(admin)/stylists', icon: 'account-group' },
        { name: 'Salons', route: '/(admin)/salons', icon: 'store' },
        { name: 'Referrals', route: '/(admin)/referrals', icon: 'cash-multiple' },
        { name: 'Commissions', route: '/(admin)/commissions', icon: 'percent' },
        { name: 'Field Force', route: '/(admin)/field-force', icon: 'account-hard-hat' },
        { name: 'Leads', route: '/(admin)/leads', icon: 'account-plus' },
        { name: 'Lead Callers', route: '/(admin)/lead-callers', icon: 'phone-in-talk' },
        { name: 'Lead Management', route: '/(admin)/lead-management', icon: 'clipboard-list' },
    ];

    const navItems = isLeadCaller
        ? [{ name: 'Lead Management', route: '/(admin)/lead-management', icon: 'clipboard-list' }]
        : allNavItems;

    return (
        <View style={styles.container}>
            <Appbar.Header style={styles.header} elevated>
                <Appbar.Content
                    title={
                        <Image
                            source={require('../../assets/images/logo.png')}
                            style={{ width: 120, height: 40 }}
                            resizeMode="contain"
                        />
                    }
                    onPress={() => router.push('/(admin)/dashboard')}
                />

                <View style={styles.navLinks}>
                    {navItems.map((item) => {
                        const isActive = pathname.includes(item.route);
                        return (
                            <Button
                                key={item.route}
                                mode={isActive ? 'contained-tonal' : 'text'}
                                onPress={() => router.push(item.route as any)}
                                icon={item.icon}
                                textColor={isActive ? Colors.primary : Colors.textSecondary}
                                style={[styles.navButton, isActive && styles.activeNavButton]}
                                labelStyle={{ fontWeight: isActive ? 'bold' : 'normal' }}
                            >
                                {item.name}
                            </Button>
                        );
                    })}
                </View>

                <Menu
                    visible={visible}
                    onDismiss={closeMenu}
                    anchor={
                        <Button onPress={openMenu} mode="text" contentStyle={{ flexDirection: 'row-reverse' }}>
                            <View style={styles.userBadge}>
                                <Avatar.Text size={32} label={user?.name?.substring(0, 2).toUpperCase() || 'AD'} style={{ backgroundColor: Colors.primary }} />
                                <View style={styles.userInfo}>
                                    <Text variant="labelLarge" style={{ color: Colors.text }}>{user?.name}</Text>
                                    <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{user?.role}</Text>
                                </View>
                            </View>
                        </Button>
                    }
                    contentStyle={{ marginTop: 40 }}
                >
                    {user?.role === 'SUPER_ADMIN' && (
                        <Menu.Item onPress={() => { closeMenu(); router.push('/(admin)/admin-management'); }} title="Manage Admins" leadingIcon="shield-account" />
                    )}
                    <Divider />
                    <Menu.Item onPress={signOut} title="Logout" leadingIcon="logout" titleStyle={{ color: Colors.error }} />
                </Menu>
            </Appbar.Header>

            <View style={styles.content}>
                <Slot />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    header: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        height: 64,
        paddingHorizontal: 16,
    },
    title: {
        fontWeight: 'bold',
        color: Colors.primary,
        fontSize: 20,
    },
    navLinks: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
        display: 'flex', // Visible on web/tablet
    },
    navButton: {
        marginHorizontal: 4,
        borderRadius: 8,
    },
    activeNavButton: {
        backgroundColor: Colors.active,
    },
    userBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    userInfo: {
        alignItems: 'flex-end',
        display: 'flex', // Can hide on small screens if needed
    },
    content: {
        flex: 1,
    }
});
