import React from 'react';
import { View, StyleSheet, Image, ScrollView, Pressable } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Menu, Divider, Avatar, Text } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export default function AdminLayout() {
    const { signOut, user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [menuVisible, setMenuVisible] = React.useState(false);

    const isLeadCaller = user?.role === 'LEAD_CALLER';

    const allNavItems = [
        { name: 'Dashboard', route: '/(admin)/dashboard', icon: 'view-dashboard' },
        { name: 'Stylists', route: '/(admin)/stylists', icon: 'account-group' },
        { name: 'Salons', route: '/(admin)/salons', icon: 'store' },
        { name: 'Exp Centers', route: '/(admin)/experience-centers', icon: 'store-marker' },
        { name: 'Referrals', route: '/(admin)/referrals', icon: 'cash-multiple' },
        { name: 'Commissions', route: '/(admin)/commissions', icon: 'percent' },
        { name: 'Field Force', route: '/(admin)/field-force', icon: 'account-hard-hat' },
        { name: 'Leads', route: '/(admin)/leads', icon: 'account-plus' },
        { name: 'Lead Callers', route: '/(admin)/lead-callers', icon: 'phone-in-talk' },
        { name: 'Lead Management', route: '/(admin)/lead-management', icon: 'clipboard-list' },
        { name: 'FB Forms', route: '/(admin)/facebook-forms', icon: 'facebook' },
    ];

    const navItems = isLeadCaller
        ? [
            { name: 'My Dashboard', route: '/(admin)/caller-dashboard', icon: 'view-dashboard-outline' },
            { name: 'Lead Management', route: '/(admin)/lead-management', icon: 'clipboard-list' },
        ]
        : allNavItems;

    return (
        <View style={styles.root}>
            {/* ── Left Sidebar ─────────────────────────────────────── */}
            <View style={styles.sidebar}>
                {/* Logo */}
                <Pressable onPress={() => router.push('/(admin)/dashboard')} style={styles.logoArea}>
                    <Image
                        source={require('../../assets/images/logo.png')}
                        style={{ width: 120, height: 38 }}
                        resizeMode="contain"
                    />
                </Pressable>

                <Divider style={{ backgroundColor: '#E5E7EB', marginBottom: 8 }} />

                {/* Nav items */}
                <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                    {navItems.map((item) => {
                        const isActive = pathname.startsWith(item.route.replace('/(admin)', ''));
                        return (
                            <Pressable
                                key={item.route}
                                onPress={() => router.push(item.route as any)}
                                style={({ pressed }) => [
                                    styles.navItem,
                                    isActive && styles.navItemActive,
                                    pressed && !isActive && styles.navItemPressed,
                                ]}
                            >
                                <MaterialCommunityIcons
                                    name={item.icon as any}
                                    size={20}
                                    color={isActive ? Colors.primary : '#6B7280'}
                                    style={{ marginRight: 10 }}
                                />
                                <Text
                                    style={[
                                        styles.navLabel,
                                        isActive && styles.navLabelActive,
                                    ]}
                                    numberOfLines={1}
                                >
                                    {item.name}
                                </Text>
                                {isActive && <View style={styles.activeBar} />}
                            </Pressable>
                        );
                    })}
                </ScrollView>

                <Divider style={{ backgroundColor: '#E5E7EB', marginTop: 8 }} />

                {/* User profile + logout */}
                <Menu
                    visible={menuVisible}
                    onDismiss={() => setMenuVisible(false)}
                    anchor={
                        <Pressable
                            onPress={() => setMenuVisible(true)}
                            style={({ pressed }) => [styles.userArea, pressed && { opacity: 0.8 }]}
                        >
                            <Avatar.Text
                                size={36}
                                label={user?.name?.substring(0, 2).toUpperCase() || 'AD'}
                                style={{ backgroundColor: Colors.primary }}
                            />
                            <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
                                <Text style={styles.userName} numberOfLines={1}>{user?.name}</Text>
                                <Text style={styles.userRole} numberOfLines={1}>{user?.role?.replace(/_/g, ' ')}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-up" size={18} color="#9CA3AF" />
                        </Pressable>
                    }
                    contentStyle={{ backgroundColor: 'white', borderRadius: 8, marginBottom: 8, marginLeft: 8 }}
                >
                    {user?.role === 'SUPER_ADMIN' && (
                        <Menu.Item
                            onPress={() => { setMenuVisible(false); router.push('/(admin)/admin-management'); }}
                            title="Manage Admins"
                            leadingIcon="shield-account"
                        />
                    )}
                    <Divider />
                    <Menu.Item
                        onPress={signOut}
                        title="Logout"
                        leadingIcon="logout"
                        titleStyle={{ color: Colors.error }}
                    />
                </Menu>
            </View>

            {/* ── Main Content ─────────────────────────────────────── */}
            <View style={styles.main}>
                <Slot />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: Colors.background,
    },

    // ── Sidebar ─────────────────────────────────────────────────
    sidebar: {
        width: 220,
        backgroundColor: '#FFFFFF',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        paddingBottom: 12,
        flexShrink: 0,
    },
    logoArea: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        alignItems: 'flex-start',
    },

    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 10,
        marginVertical: 2,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    navItemActive: {
        backgroundColor: '#EEF2FF',
    },
    navItemPressed: {
        backgroundColor: '#F9FAFB',
    },
    navLabel: {
        fontSize: 13.5,
        color: '#6B7280',
        fontWeight: '500',
        flex: 1,
    },
    navLabelActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    activeBar: {
        position: 'absolute',
        right: 0,
        top: 6,
        bottom: 6,
        width: 3,
        borderRadius: 3,
        backgroundColor: Colors.primary,
    },

    // ── User area ───────────────────────────────────────────────
    userArea: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginHorizontal: 8,
        borderRadius: 10,
        backgroundColor: '#F9FAFB',
        marginTop: 8,
    },
    userName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#111827',
    },
    userRole: {
        fontSize: 11,
        color: '#9CA3AF',
        textTransform: 'capitalize',
        marginTop: 1,
    },

    // ── Main content ────────────────────────────────────────────
    main: {
        flex: 1,
        overflow: 'hidden',
    },
});
