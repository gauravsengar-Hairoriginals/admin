import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
    Text,
    DataTable,
    Button,
    Searchbar,
    Card,
    IconButton,
    TextInput,
    ActivityIndicator,
    Portal,
    Modal,
    Dialog,
    Chip,
    Banner,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

const EMPTY_FORM = { name: '', email: '', phone: '', password: '' };

export default function LeadCallersScreen() {
    // ─── List state ──────────────────────────────────────────────────────
    const [callers, setCallers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // ─── Add / Edit modal ────────────────────────────────────────────────
    const [modalVisible, setModalVisible] = useState(false);
    const [editingCaller, setEditingCaller] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // After-create banner (shows generated password)
    const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

    // ─── Reset password dialog ────────────────────────────────────────────
    const [resetTarget, setResetTarget] = useState<any>(null);
    const [resetPwd, setResetPwd] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // ─── Toggle status dialog ─────────────────────────────────────────────
    const [statusTarget, setStatusTarget] = useState<any>(null);
    const [statusLoading, setStatusLoading] = useState(false);

    // ─── Fetch ────────────────────────────────────────────────────────────
    const fetchCallers = useCallback(async (search = searchQuery) => {
        try {
            const res = await api.get('/admin/lead-callers', {
                params: { search: search || undefined },
            });
            setCallers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery]);

    useEffect(() => { fetchCallers(); }, []);

    // ─── Add modal ────────────────────────────────────────────────────────
    const openAddModal = () => {
        setEditingCaller(null);
        setForm({ ...EMPTY_FORM });
        setFormError('');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
            setFormError('Name, email, and phone are required.');
            return;
        }
        setFormLoading(true);
        setFormError('');
        try {
            const res = await api.post('/admin/lead-callers', {
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
                phone: form.phone.trim(),
                password: form.password.trim() || undefined, // backend will auto-generate if blank
            });
            setCallers(prev => [res.data, ...prev]);
            setModalVisible(false);
            // The backend returns the plain-text password in passwordHash field temporarily
            setNewCredentials({ email: res.data.email, password: res.data.passwordHash });
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to create lead caller.';
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setFormLoading(false);
        }
    };

    // ─── Toggle active ────────────────────────────────────────────────────
    const handleToggleStatus = async () => {
        if (!statusTarget) return;
        setStatusLoading(true);
        try {
            const res = await api.post(`/admin/lead-callers/${statusTarget.id}/status`, {
                isActive: !statusTarget.isActive,
            });
            setCallers(prev => prev.map(c => c.id === statusTarget.id ? { ...c, isActive: res.data.isActive } : c));
            setStatusTarget(null);
        } catch (err) {
            console.error(err);
        } finally {
            setStatusLoading(false);
        }
    };

    // ─── Reset password ───────────────────────────────────────────────────
    const handleResetPassword = async () => {
        if (!resetTarget || !resetPwd.trim()) return;
        setResetLoading(true);
        try {
            await api.post(`/admin/lead-callers/${resetTarget.id}/reset-password`, {
                newPassword: resetPwd.trim(),
            });
            setResetTarget(null);
            setResetPwd('');
            Alert.alert('Done', `Password reset for ${resetTarget.name}.`);
        } catch (err) {
            console.error(err);
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <AdminPageLayout>
            {/* Credentials banner */}
            {newCredentials && (
                <Banner
                    visible
                    icon="shield-key"
                    actions={[{ label: 'Dismiss', onPress: () => setNewCredentials(null) }]}
                    style={{ marginBottom: 16, backgroundColor: '#E8F5E9' }}
                >
                    <Text style={{ fontWeight: 'bold' }}>Lead caller created! Share these credentials:</Text>
                    {'\n'}Email: {newCredentials.email}{'\n'}Password: {newCredentials.password}
                </Banner>
            )}

            {/* ── Header ── */}
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>
                        Lead Callers
                    </Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                        Manage lead caller accounts
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <Searchbar
                        placeholder="Search name, email or phone…"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => fetchCallers(searchQuery)}
                        style={styles.searchBar}
                        inputStyle={{ minHeight: 0 }}
                    />
                    <Button
                        mode="contained"
                        icon="account-plus"
                        onPress={openAddModal}
                        style={{ marginLeft: 8 }}
                    >
                        Add Caller
                    </Button>
                </View>
            </View>

            {/* ── Table ── */}
            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <DataTable>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title style={{ flex: 2 }} textStyle={styles.tableTitle}>Name</DataTable.Title>
                            <DataTable.Title style={{ flex: 2 }} textStyle={styles.tableTitle}>Email</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.5 }} textStyle={styles.tableTitle}>Phone</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Status</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Joined</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Actions</DataTable.Title>
                        </DataTable.Header>

                        {callers.length === 0 ? (
                            <View style={{ padding: 32, alignItems: 'center' }}>
                                <Text style={{ color: Colors.textSecondary }}>No lead callers found.</Text>
                            </View>
                        ) : (
                            callers.map(caller => (
                                <DataTable.Row key={caller.id} style={styles.tableRow}>
                                    <DataTable.Cell style={{ flex: 2 }}>
                                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{caller.name}</Text>
                                    </DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 2 }}>
                                        <Text variant="bodySmall">{caller.email}</Text>
                                    </DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 1.5 }}>
                                        <Text variant="bodySmall">{caller.phone}</Text>
                                    </DataTable.Cell>
                                    <DataTable.Cell>
                                        <Chip
                                            mode="flat"
                                            style={{ backgroundColor: caller.isActive ? '#E8F5E9' : '#FFEBEE' }}
                                            textStyle={{ color: caller.isActive ? '#2E7D32' : '#C62828', fontSize: 12 }}
                                        >
                                            {caller.isActive ? 'Active' : 'Inactive'}
                                        </Chip>
                                    </DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 1.2 }}>
                                        <Text variant="bodySmall">
                                            {new Date(caller.createdAt).toLocaleDateString('en-IN')}
                                        </Text>
                                    </DataTable.Cell>
                                    <DataTable.Cell>
                                        <View style={{ flexDirection: 'row' }}>
                                            <IconButton
                                                icon={caller.isActive ? 'account-off' : 'account-check'}
                                                size={18}
                                                iconColor={caller.isActive ? Colors.error : Colors.success}
                                                onPress={() => setStatusTarget(caller)}
                                                style={{ margin: 0 }}
                                            />
                                            <IconButton
                                                icon="lock-reset"
                                                size={18}
                                                iconColor={Colors.textSecondary}
                                                onPress={() => { setResetTarget(caller); setResetPwd(''); }}
                                                style={{ margin: 0 }}
                                            />
                                        </View>
                                    </DataTable.Cell>
                                </DataTable.Row>
                            ))
                        )}
                    </DataTable>
                )}
            </Card>

            {/* ── Add Modal ── */}
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>
                        Add Lead Caller
                    </Text>
                    <TextInput
                        label="Full Name *"
                        value={form.name}
                        onChangeText={v => setForm(f => ({ ...f, name: v }))}
                        mode="outlined"
                        style={{ marginBottom: 12 }}
                    />
                    <TextInput
                        label="Email *"
                        value={form.email}
                        onChangeText={v => setForm(f => ({ ...f, email: v }))}
                        mode="outlined"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={{ marginBottom: 12 }}
                    />
                    <TextInput
                        label="Phone *"
                        value={form.phone}
                        onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                        mode="outlined"
                        keyboardType="phone-pad"
                        style={{ marginBottom: 12 }}
                    />
                    <TextInput
                        label="Password (leave blank to auto-generate)"
                        value={form.password}
                        onChangeText={v => setForm(f => ({ ...f, password: v }))}
                        mode="outlined"
                        secureTextEntry
                        style={{ marginBottom: 12 }}
                    />
                    {formError ? (
                        <Text style={{ color: Colors.error, marginBottom: 8 }}>{formError}</Text>
                    ) : null}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                        <Button onPress={() => setModalVisible(false)}>Cancel</Button>
                        <Button mode="contained" onPress={handleSave} loading={formLoading}>
                            Create
                        </Button>
                    </View>
                </Modal>
            </Portal>

            {/* ── Toggle Status Dialog ── */}
            <Portal>
                <Dialog
                    visible={!!statusTarget}
                    onDismiss={() => setStatusTarget(null)}
                    style={{ backgroundColor: 'white' }}
                >
                    <Dialog.Title>
                        {statusTarget?.isActive ? 'Deactivate' : 'Activate'} Caller
                    </Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            {statusTarget?.isActive ? 'Deactivate' : 'Activate'}{' '}
                            <Text style={{ fontWeight: 'bold' }}>{statusTarget?.name}</Text>?
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setStatusTarget(null)}>Cancel</Button>
                        <Button
                            textColor={statusTarget?.isActive ? Colors.error : Colors.success}
                            onPress={handleToggleStatus}
                            loading={statusLoading}
                        >
                            {statusTarget?.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* ── Reset Password Dialog ── */}
            <Portal>
                <Dialog
                    visible={!!resetTarget}
                    onDismiss={() => setResetTarget(null)}
                    style={{ backgroundColor: 'white' }}
                >
                    <Dialog.Title>Reset Password — {resetTarget?.name}</Dialog.Title>
                    <Dialog.Content>
                        <TextInput
                            label="New Password *"
                            value={resetPwd}
                            onChangeText={setResetPwd}
                            mode="outlined"
                            secureTextEntry
                            style={{ marginTop: 8 }}
                        />
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setResetTarget(null)}>Cancel</Button>
                        <Button
                            mode="contained"
                            onPress={handleResetPassword}
                            loading={resetLoading}
                            disabled={!resetPwd.trim()}
                        >
                            Reset
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </AdminPageLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
    },
    searchBar: {
        width: 280,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 0,
    },
    tableCard: {
        backgroundColor: Colors.surface,
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeader: {
        backgroundColor: '#F5F5F5',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tableTitle: {
        fontWeight: 'bold',
        color: Colors.text,
        fontSize: 13,
    },
    tableRow: {
        borderBottomColor: Colors.border,
    },
    modal: {
        backgroundColor: 'white',
        padding: 24,
        margin: 24,
        borderRadius: 12,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
    },
});
