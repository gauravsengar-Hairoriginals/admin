import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
    Text, Card, Button, TextInput, ActivityIndicator,
    Portal, Modal, Chip, Divider, IconButton, Switch,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

//asdas

// ── Available permissions ────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
    { key: 'MANAGE_STYLISTS', label: 'Manage Stylists', icon: 'account-group' },
    { key: 'MANAGE_SALONS', label: 'Manage Salons', icon: 'store' },
    { key: 'MANAGE_LEADS', label: 'Manage Leads', icon: 'clipboard-list' },
    { key: 'MANAGE_REFERRALS', label: 'Manage Referrals', icon: 'cash-multiple' },
    { key: 'VIEW_FINANCIALS', label: 'View Financials', icon: 'chart-bar' },
    { key: 'MANAGE_FIELD_FORCE', label: 'Manage Field Force', icon: 'account-hard-hat' },
    { key: 'VIEW_ORDERS', label: 'View Orders', icon: 'package-variant' },
];

const FORM_EMPTY = { name: '', email: '', phone: '', password: '' };

export default function AdminManagementScreen() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // ── Add modal ──
    const [addVisible, setAddVisible] = useState(false);
    const [form, setForm] = useState(FORM_EMPTY);
    const [formPerms, setFormPerms] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);

    // ── Permissions editor ──
    const [editPermsTarget, setEditPermsTarget] = useState<any>(null);
    const [editPerms, setEditPerms] = useState<string[]>([]);
    const [editPermsLoading, setEditPermsLoading] = useState(false);

    // ── Reset password result ──
    const [resetResult, setResetResult] = useState<{ adminName: string; password: string } | null>(null);

    const loadAdmins = useCallback(async () => {
        try {
            const res = await api.get('/admin/users');
            setAdmins(res.data ?? []);
        } catch {
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { loadAdmins(); }, []);

    const onRefresh = () => { setRefreshing(true); loadAdmins(); };

    // ── Add admin ──────────────────────────────────────────────────────────────
    const handleAdd = async () => {
        if (!form.name || !form.email || !form.phone || !form.password) {
            setSaveError('All fields are required.');
            return;
        }
        setSaving(true);
        setSaveError('');
        try {
            await api.post('/admin/users', { ...form, permissions: formPerms });
            setCreatedCreds({ email: form.email, password: form.password });
            setAddVisible(false);
            setForm(FORM_EMPTY);
            setFormPerms([]);
            loadAdmins();
        } catch (e: any) {
            setSaveError(e?.response?.data?.message ?? 'Failed to create admin.');
        } finally {
            setSaving(false);
        }
    };

    // ── Toggle status ──────────────────────────────────────────────────────────
    const handleToggleStatus = async (admin: any) => {
        try {
            const res = await api.post(`/admin/users/${admin.id}/toggle-status`);
            setAdmins(prev => prev.map(a => a.id === admin.id ? { ...a, isActive: res.data.isActive } : a));
        } catch {
            Alert.alert('Error', 'Failed to toggle status.');
        }
    };

    // ── Reset password ─────────────────────────────────────────────────────────
    const handleResetPassword = async (admin: any) => {
        try {
            const res = await api.post(`/admin/users/${admin.id}/reset-password`);
            setResetResult({ adminName: admin.name, password: res.data.temporaryPassword });
        } catch {
            Alert.alert('Error', 'Failed to reset password.');
        }
    };

    // ── Save permissions ───────────────────────────────────────────────────────
    const handleSavePerms = async () => {
        if (!editPermsTarget) return;
        setEditPermsLoading(true);
        try {
            await api.post(`/admin/users/${editPermsTarget.id}/permissions`, { permissions: editPerms });
            setAdmins(prev => prev.map(a => a.id === editPermsTarget.id ? { ...a, permissions: editPerms } : a));
            setEditPermsTarget(null);
        } catch {
            Alert.alert('Error', 'Failed to update permissions.');
        } finally {
            setEditPermsLoading(false);
        }
    };

    const togglePerm = (key: string, list: string[], set: (v: string[]) => void) => {
        set(list.includes(key) ? list.filter(p => p !== key) : [...list, key]);
    };

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <AdminPageLayout>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header */}
                <View style={styles.pageHeader}>
                    <View>
                        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>Manage Admins</Text>
                        <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                            {admins.length} admin{admins.length !== 1 ? 's' : ''} in the system
                        </Text>
                    </View>
                    <Button
                        mode="contained"
                        icon="account-plus"
                        onPress={() => { setForm(FORM_EMPTY); setFormPerms([]); setSaveError(''); setAddVisible(true); }}
                        style={{ borderRadius: 10 }}
                    >
                        Add Admin
                    </Button>
                </View>

                {/* Credentials banner */}
                {createdCreds && (
                    <Card mode="elevated" style={[styles.banner, { backgroundColor: '#D1FAE5', borderColor: '#6EE7B7', borderWidth: 1 }]}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontWeight: '700', color: '#065F46' }}>✅ Admin Created</Text>
                                <IconButton icon="close" size={16} onPress={() => setCreatedCreds(null)} iconColor="#065F46" style={{ margin: 0 }} />
                            </View>
                            <Text style={{ fontSize: 13, color: '#065F46', marginTop: 4 }}>
                                Email: <Text style={{ fontWeight: '700' }}>{createdCreds.email}</Text>
                            </Text>
                            <Text style={{ fontSize: 13, color: '#065F46' }}>
                                Temporary Password: <Text style={{ fontWeight: '700', fontFamily: 'monospace' }}>{createdCreds.password}</Text>
                            </Text>
                        </Card.Content>
                    </Card>
                )}

                {/* Reset password result banner */}
                {resetResult && (
                    <Card mode="elevated" style={[styles.banner, { backgroundColor: '#FEF3C7', borderColor: '#FCD34D', borderWidth: 1 }]}>
                        <Card.Content>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ fontWeight: '700', color: '#92400E' }}>🔑 Password Reset — {resetResult.adminName}</Text>
                                <IconButton icon="close" size={16} onPress={() => setResetResult(null)} iconColor="#92400E" style={{ margin: 0 }} />
                            </View>
                            <Text style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>
                                New Temporary Password: <Text style={{ fontWeight: '700', fontFamily: 'monospace' }}>{resetResult.password}</Text>
                            </Text>
                        </Card.Content>
                    </Card>
                )}

                {/* Admin list */}
                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 48 }} />
                ) : admins.length === 0 ? (
                    <Card mode="outlined" style={{ borderRadius: 12, marginTop: 20 }}>
                        <Card.Content style={{ alignItems: 'center', paddingVertical: 40 }}>
                            <Text style={{ fontSize: 36 }}>👤</Text>
                            <Text variant="titleMedium" style={{ marginTop: 12, color: Colors.textSecondary }}>No admins yet</Text>
                            <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>Click "Add Admin" to create one</Text>
                        </Card.Content>
                    </Card>
                ) : (
                    <View style={{ gap: 12 }}>
                        {admins.map(admin => (
                            <Card key={admin.id} mode="elevated" elevation={1} style={styles.adminCard}>
                                <Card.Content>
                                    {/* Top row */}
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        {/* Avatar circle */}
                                        <View style={[styles.avatar, { backgroundColor: admin.isActive ? Colors.primary : '#9CA3AF' }]}>
                                            <Text style={{ color: 'white', fontWeight: '800', fontSize: 16 }}>
                                                {admin.name?.substring(0, 2).toUpperCase() ?? '??'}
                                            </Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontWeight: '700', fontSize: 15, color: Colors.text }}>{admin.name}</Text>
                                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{admin.email}</Text>
                                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{admin.phone ?? '—'}</Text>
                                        </View>
                                        {/* Active toggle */}
                                        <View style={{ alignItems: 'center' }}>
                                            <Switch
                                                value={admin.isActive}
                                                onValueChange={() => handleToggleStatus(admin)}
                                                color={Colors.primary}
                                            />
                                            <Text style={{ fontSize: 10, color: admin.isActive ? '#16A34A' : '#9CA3AF', marginTop: 2 }}>
                                                {admin.isActive ? 'Active' : 'Inactive'}
                                            </Text>
                                        </View>
                                    </View>

                                    <Divider style={{ marginVertical: 12 }} />

                                    {/* Permissions */}
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 6 }}>Permissions</Text>
                                    {admin.permissions?.length ? (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                            {admin.permissions.map((p: string) => {
                                                const meta = ALL_PERMISSIONS.find(x => x.key === p);
                                                return (
                                                    <Chip
                                                        key={p}
                                                        icon={meta?.icon ?? 'shield-check'}
                                                        mode="flat"
                                                        style={{ backgroundColor: '#EEF2FF' }}
                                                        textStyle={{ fontSize: 11, color: '#4338CA' }}
                                                    >
                                                        {meta?.label ?? p}
                                                    </Chip>
                                                );
                                            })}
                                        </View>
                                    ) : (
                                        <Text style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No permissions assigned</Text>
                                    )}

                                    {/* Actions */}
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                                        <Button
                                            mode="outlined"
                                            compact
                                            icon="shield-edit"
                                            onPress={() => { setEditPermsTarget(admin); setEditPerms(admin.permissions ?? []); }}
                                            style={{ borderRadius: 8 }}
                                        >
                                            Permissions
                                        </Button>
                                        <Button
                                            mode="outlined"
                                            compact
                                            icon="lock-reset"
                                            textColor="#D97706"
                                            style={{ borderRadius: 8, borderColor: '#FCD34D' }}
                                            onPress={() => handleResetPassword(admin)}
                                        >
                                            Reset Password
                                        </Button>
                                    </View>
                                </Card.Content>
                            </Card>
                        ))}
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Add Admin Modal ─────────────────────────────────────────────── */}
            <Portal>
                <Modal
                    visible={addVisible}
                    onDismiss={() => setAddVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>Add New Admin</Text>
                        {saveError ? (
                            <Text style={{ color: '#DC2626', fontSize: 13, marginBottom: 10 }}>{saveError}</Text>
                        ) : null}

                        <TextInput
                            label="Full Name *"
                            value={form.name}
                            onChangeText={v => setForm(f => ({ ...f, name: v }))}
                            mode="outlined"
                            dense
                            style={styles.input}
                        />
                        <TextInput
                            label="Email *"
                            value={form.email}
                            onChangeText={v => setForm(f => ({ ...f, email: v.trim() }))}
                            mode="outlined"
                            dense
                            autoCapitalize="none"
                            keyboardType="email-address"
                            style={styles.input}
                        />
                        <TextInput
                            label="Phone *"
                            value={form.phone}
                            onChangeText={v => setForm(f => ({ ...f, phone: v.trim() }))}
                            mode="outlined"
                            dense
                            keyboardType="phone-pad"
                            style={styles.input}
                        />
                        <TextInput
                            label="Password *"
                            value={form.password}
                            onChangeText={v => setForm(f => ({ ...f, password: v }))}
                            mode="outlined"
                            dense
                            secureTextEntry
                            style={styles.input}
                        />

                        <Text style={styles.sectionLabel}>Permissions</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                            {ALL_PERMISSIONS.map(p => {
                                const on = formPerms.includes(p.key);
                                return (
                                    <Chip
                                        key={p.key}
                                        icon={p.icon}
                                        selected={on}
                                        mode={on ? 'flat' : 'outlined'}
                                        onPress={() => togglePerm(p.key, formPerms, setFormPerms)}
                                        style={{ backgroundColor: on ? '#EEF2FF' : 'white' }}
                                        textStyle={{ color: on ? '#4338CA' : '#6B7280', fontSize: 12 }}
                                    >
                                        {p.label}
                                    </Chip>
                                );
                            })}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                            <Button onPress={() => setAddVisible(false)} mode="outlined">Cancel</Button>
                            <Button
                                mode="contained"
                                onPress={handleAdd}
                                loading={saving}
                                disabled={saving}
                                style={{ backgroundColor: Colors.primary }}
                            >
                                Create Admin
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>

            {/* ── Edit Permissions Modal ──────────────────────────────────────── */}
            <Portal>
                <Modal
                    visible={!!editPermsTarget}
                    onDismiss={() => setEditPermsTarget(null)}
                    contentContainerStyle={styles.modal}
                >
                    <Text style={styles.modalTitle}>Edit Permissions</Text>
                    <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 16 }}>
                        {editPermsTarget?.name}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
                        {ALL_PERMISSIONS.map(p => {
                            const on = editPerms.includes(p.key);
                            return (
                                <Chip
                                    key={p.key}
                                    icon={p.icon}
                                    selected={on}
                                    mode={on ? 'flat' : 'outlined'}
                                    onPress={() => togglePerm(p.key, editPerms, setEditPerms)}
                                    style={{ backgroundColor: on ? '#EEF2FF' : 'white' }}
                                    textStyle={{ color: on ? '#4338CA' : '#6B7280', fontSize: 12 }}
                                >
                                    {p.label}
                                </Chip>
                            );
                        })}
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                        <Button onPress={() => setEditPermsTarget(null)} mode="outlined">Cancel</Button>
                        <Button
                            mode="contained"
                            onPress={handleSavePerms}
                            loading={editPermsLoading}
                            style={{ backgroundColor: Colors.primary }}
                        >
                            Save
                        </Button>
                    </View>
                </Modal>
            </Portal>
        </AdminPageLayout>
    );
}

const styles = StyleSheet.create({
    pageHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    banner: {
        borderRadius: 10,
        marginBottom: 16,
    },
    adminCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 40,
        alignSelf: 'center',
        maxWidth: 520,
        width: '100%',
        maxHeight: '85%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'white',
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
        marginBottom: 10,
    },
});
