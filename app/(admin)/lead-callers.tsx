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
    SegmentedButtons,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
    EC_CALLER: { bg: '#DBEAFE', text: '#1D4ED8' },
    HT_CALLER: { bg: '#D1FAE5', text: '#065F46' },
    WEBSITE_CALLER: { bg: '#EDE9FE', text: '#5B21B6' },
    POPIN_CALLER: { bg: '#FEF3C7', text: '#92400E' },
    INTERNATIONAL_CALLER: { bg: '#F3F4F6', text: '#374151' },
};

const CALLER_CATEGORIES = [
    { label: 'EC Caller', value: 'EC_CALLER' },
    { label: 'HT Caller', value: 'HT_CALLER' },
    { label: 'Website Caller', value: 'WEBSITE_CALLER' },
    { label: 'Popin Caller', value: 'POPIN_CALLER' },
    { label: 'International', value: 'INTERNATIONAL_CALLER' },
];

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', callerCategory: '', callerRegions: [] as string[] };

export default function LeadCallersScreen() {
    const [callers, setCallers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [availableRegions, setAvailableRegions] = useState<{ label: string; value: string }[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [editingCaller, setEditingCaller] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    const [newCredentials, setNewCredentials] = useState<{ email: string; password: string } | null>(null);

    const [resetTarget, setResetTarget] = useState<any>(null);
    const [resetPwd, setResetPwd] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const [statusTarget, setStatusTarget] = useState<any>(null);
    const [statusLoading, setStatusLoading] = useState(false);

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
        }
    }, [searchQuery]);

    useEffect(() => {
        fetchCallers();
        // Load available regions from DB
        api.get('/admin/city-regions').then(res => {
            setAvailableRegions(
                (res.data as any[]).map(r => ({ label: r.regionName, value: r.regionCode }))
            );
        }).catch(() => {
            // Fallback to hardcoded
            setAvailableRegions([
                { label: 'Delhi-NCR', value: 'DELHI_NCR' },
                { label: 'Hyderabad', value: 'HYDERABAD' },
                { label: 'Mumbai', value: 'MUMBAI' },
                { label: 'Rest of India', value: 'REST_OF_INDIA' },
            ]);
        });
    }, []);

    const openAddModal = () => {
        setEditingCaller(null);
        setForm({ ...EMPTY_FORM });
        setFormError('');
        setModalVisible(true);
    };

    const openEditModal = (caller: any) => {
        setEditingCaller(caller);
        setForm({
            name: caller.name || '',
            email: caller.email || '',
            phone: caller.phone || '',
            password: '',
            callerCategory: caller.callerCategory || '',
            callerRegions: Array.isArray(caller.callerRegions) ? caller.callerRegions : [],
        });
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
            if (editingCaller) {
                // Update all editable fields; password is optional
                await api.post(`/admin/lead-callers/${editingCaller.id}/update`, {
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    phone: form.phone.trim(),
                    password: form.password.trim() || undefined,
                    callerCategory: form.callerCategory || undefined,
                    callerRegions: form.callerRegions,
                });
                fetchCallers();
                setModalVisible(false);
            } else {
                // Create new
                const res = await api.post('/admin/lead-callers', {
                    name: form.name.trim(),
                    email: form.email.trim().toLowerCase(),
                    phone: form.phone.trim(),
                    password: form.password.trim() || undefined,
                    callerCategory: form.callerCategory || undefined,
                    callerRegions: form.callerRegions,
                });
                setCallers(prev => [res.data, ...prev]);
                setModalVisible(false);
                setNewCredentials({ email: res.data.email, password: res.data.passwordHash });
            }
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to save lead caller.';
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setFormLoading(false);
        }
    };

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

            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>
                        Lead Callers
                    </Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                        Manage lead caller accounts and shifts
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

            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <DataTable style={{ minWidth: 900 }}>
                            <DataTable.Header style={styles.tableHeader}>
                                <DataTable.Title style={{ flex: 2 }} textStyle={styles.tableTitle}>Name</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.5 }} textStyle={styles.tableTitle}>Category</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Region</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.5 }} textStyle={styles.tableTitle}>Phone</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableTitle}>Shift</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableTitle}>Status</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableTitle}>Actions</DataTable.Title>
                            </DataTable.Header>

                            {callers.length === 0 ? (
                                <View style={{ padding: 32, alignItems: 'center' }}>
                                    <Text style={{ color: Colors.textSecondary }}>No lead callers found.</Text>
                                </View>
                            ) : (
                                callers.map(caller => {
                                    const catColor = CATEGORY_COLORS[caller.callerCategory] ?? { bg: '#F3F4F6', text: '#374151' };
                                    const catLabel = CALLER_CATEGORIES.find(c => c.value === caller.callerCategory)?.label ?? '—';
                                    const regionLabels = Array.isArray(caller.callerRegions) && caller.callerRegions.length > 0
                                        ? caller.callerRegions.map((r: string) =>
                                            availableRegions.find(ar => ar.value === r)?.label ?? r
                                          ).join(', ')
                                        : '—';
                                    return (
                                        <DataTable.Row key={caller.id} style={styles.tableRow}>
                                            <DataTable.Cell style={{ flex: 2 }}>
                                                <View>
                                                    <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{caller.name}</Text>
                                                    <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{caller.email}</Text>
                                                </View>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ flex: 1.5 }}>
                                                <Chip mode="flat" style={{ backgroundColor: catColor.bg }} textStyle={{ color: catColor.text, fontSize: 11 }}>
                                                    {catLabel}
                                                </Chip>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ flex: 1.2 }}>
                                                <Text variant="bodySmall" numberOfLines={2}>{regionLabels}</Text>
                                            </DataTable.Cell>
                                            <DataTable.Cell style={{ flex: 1.5 }}>
                                                <Text variant="bodySmall">{caller.phone}</Text>
                                            </DataTable.Cell>
                                            <DataTable.Cell>
                                                <Chip
                                                    mode="flat"
                                                    style={{ backgroundColor: caller.isOnShift ? '#D1FAE5' : '#F3F4F6' }}
                                                    textStyle={{ color: caller.isOnShift ? '#065F46' : '#9CA3AF', fontSize: 11 }}
                                                >
                                                    {caller.isOnShift ? '🟢 On' : '⚫ Off'}
                                                </Chip>
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
                                            <DataTable.Cell>
                                                <View style={{ flexDirection: 'row' }}>
                                                    <IconButton
                                                        icon="pencil"
                                                        size={18}
                                                        iconColor={Colors.textSecondary}
                                                        onPress={() => openEditModal(caller)}
                                                        style={{ margin: 0 }}
                                                    />
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
                                    );
                                })
                            )}
                        </DataTable>
                    </ScrollView>
                )}
            </Card>

            {/* Add / Edit Modal */}
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>
                            {editingCaller ? 'Edit Caller' : 'Add Lead Caller'}
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
                            label={editingCaller ? 'New Password (leave blank to keep unchanged)' : 'Password (leave blank to auto-generate)'}
                            value={form.password}
                            onChangeText={v => setForm(f => ({ ...f, password: v }))}
                            mode="outlined"
                            secureTextEntry
                            style={{ marginBottom: 16 }}
                        />

                        <Text style={styles.fieldLabel}>Caller Category</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {CALLER_CATEGORIES.map(cat => {
                                const color = CATEGORY_COLORS[cat.value] ?? { bg: '#F3F4F6', text: '#374151' };
                                const selected = form.callerCategory === cat.value;
                                return (
                                    <Chip
                                        key={cat.value}
                                        mode="flat"
                                        selected={selected}
                                        onPress={() => setForm(f => ({ ...f, callerCategory: cat.value }))}
                                        style={{ backgroundColor: selected ? color.bg : '#F3F4F6', borderWidth: selected ? 2 : 0, borderColor: color.text }}
                                        textStyle={{ color: selected ? color.text : '#6B7280', fontWeight: selected ? '700' : '400' }}
                                    >
                                        {cat.label}
                                    </Chip>
                                );
                            })}
                        </View>

                        <Text style={styles.fieldLabel}>Regions <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(select all that apply — none = any region)</Text></Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                            {availableRegions.map(reg => {
                                const selected = (form.callerRegions as string[]).includes(reg.value);
                                return (
                                    <Chip
                                        key={reg.value}
                                        mode="flat"
                                        selected={selected}
                                        onPress={() => setForm(f => {
                                            const current = f.callerRegions as string[];
                                            return {
                                                ...f,
                                                callerRegions: selected
                                                    ? current.filter(r => r !== reg.value)
                                                    : [...current, reg.value],
                                            };
                                        })}
                                        style={{ backgroundColor: selected ? '#EEF2FF' : '#F3F4F6', borderWidth: selected ? 2 : 0, borderColor: '#4338CA' }}
                                        textStyle={{ color: selected ? '#4338CA' : '#6B7280', fontWeight: selected ? '700' : '400' }}
                                    >
                                        {reg.label}
                                    </Chip>
                                );
                            })}
                        </View>

                        {formError ? (
                            <Text style={{ color: Colors.error, marginBottom: 8 }}>{formError}</Text>
                        ) : null}
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onPress={() => setModalVisible(false)}>Cancel</Button>
                            <Button mode="contained" onPress={handleSave} loading={formLoading}>
                                {editingCaller ? 'Update' : 'Create'}
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>

            {/* Toggle Status Dialog */}
            <Portal>
                <Dialog visible={!!statusTarget} onDismiss={() => setStatusTarget(null)} style={{ backgroundColor: 'white' }}>
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

            {/* Reset Password Dialog */}
            <Portal>
                <Dialog visible={!!resetTarget} onDismiss={() => setResetTarget(null)} style={{ backgroundColor: 'white' }}>
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
                        <Button mode="contained" onPress={handleResetPassword} loading={resetLoading} disabled={!resetPwd.trim()}>
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
        maxWidth: 520,
        alignSelf: 'center',
        width: '100%',
        maxHeight: '90%',
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 8,
    },
});
