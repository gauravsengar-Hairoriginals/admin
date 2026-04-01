import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
    Text,
    DataTable,
    Button,
    IconButton,
    Portal,
    Modal,
    TextInput,
    ActivityIndicator,
    Switch,
    SegmentedButtons,
    Chip,
    Divider,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface ExperienceCenter {
    id: string;
    name: string;
    type: 'FULL' | 'MINI';
    city: string;
    address?: string;
    managerName?: string;
    managerContact?: string;
    isActive: boolean;
    dinggVendorLocationUuid?: string;
    dinggTokenExpiresAt?: string;
    dinggEnabled: boolean;
}

interface ECStylist {
    id: string;
    name: string;
    phone: string;
    email?: string;
    isActive: boolean;
}

interface FormState {
    name: string;
    type: string;
    city: string;
    address: string;
    managerName: string;
    managerContact: string;
    isActive: boolean;
    // DINGG credentials
    dinggAccessCode: string;
    dinggApiKey: string;
    dinggVendorLocationUuid: string;
}

const EMPTY_FORM: FormState = {
    name: '',
    type: 'FULL',
    city: '',
    address: '',
    managerName: '',
    managerContact: '',
    isActive: true,
    dinggAccessCode: '',
    dinggApiKey: '',
    dinggVendorLocationUuid: '',
};

export default function ExperienceCentersScreen() {
    const { user } = useAuth();
    const [ecs, setEcs] = useState<ExperienceCenter[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingEc, setEditingEc] = useState<ExperienceCenter | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<FormState>(EMPTY_FORM);

    // DINGG test connection
    const [testingId, setTestingId] = useState<string | null>(null);

    // Secure fields toggle
    const [showAccessCode, setShowAccessCode] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    // ── Stylists state ──────────────────────────────────────────────────
    const [stylists, setStylists] = useState<ECStylist[]>([]);
    const [stylistsLoading, setStylistsLoading] = useState(false);
    const [newStylistPhone, setNewStylistPhone] = useState('');
    const [newStylistName, setNewStylistName] = useState('');
    const [addingStylist, setAddingStylist] = useState(false);
    const [removingStylistId, setRemovingStylistId] = useState<string | null>(null);

    useEffect(() => { if (user) loadEcs(); }, [user]);

    const loadEcs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/experience-centers');
            setEcs(res.data);
        } catch {
            Alert.alert('Error', 'Failed to load experience centers');
        } finally {
            setLoading(false);
        }
    };

    const loadStylists = async (ecId: string) => {
        setStylistsLoading(true);
        try {
            const res = await api.get(`/admin/experience-centers/${ecId}/stylists`);
            setStylists(res.data ?? []);
        } catch {
            setStylists([]);
        } finally {
            setStylistsLoading(false);
        }
    };

    const handleAddStylist = async () => {
        if (!newStylistPhone.trim() || !editingEc) return;
        setAddingStylist(true);
        try {
            const res = await api.post(`/admin/experience-centers/${editingEc.id}/stylists`, {
                phone: newStylistPhone.trim(),
                name: newStylistName.trim() || undefined,
            });
            setStylists(res.data ?? []);
            setNewStylistPhone('');
            setNewStylistName('');
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to add stylist');
        } finally {
            setAddingStylist(false);
        }
    };

    const handleRemoveStylist = async (stylistId: string) => {
        if (!editingEc) return;
        setRemovingStylistId(stylistId);
        try {
            const res = await api.delete(`/admin/experience-centers/${editingEc.id}/stylists/${stylistId}`);
            setStylists(res.data ?? []);
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to remove stylist');
        } finally {
            setRemovingStylistId(null);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.city.trim()) {
            Alert.alert('Validation', 'Name and City are required.');
            return;
        }
        setSaving(true);
        try {
            const payload: any = {
                name: form.name.trim(),
                type: form.type,
                city: form.city.trim(),
                address: form.address.trim(),
                managerName: form.managerName.trim(),
                managerContact: form.managerContact.trim(),
                isActive: form.isActive,
                dinggVendorLocationUuid: form.dinggVendorLocationUuid.trim() || undefined,
            };
            // Only send credentials if provided (to avoid overwriting with blank)
            if (form.dinggAccessCode.trim()) payload.dinggAccessCode = form.dinggAccessCode.trim();
            if (form.dinggApiKey.trim())     payload.dinggApiKey     = form.dinggApiKey.trim();

            if (editingEc) {
                await api.post(`/admin/experience-centers/${editingEc.id}`, payload);
            } else {
                await api.post('/admin/experience-centers', payload);
            }
            setModalVisible(false);
            loadEcs();
            Alert.alert('Success', editingEc ? 'Experience center updated.' : 'Experience center created.');
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (id: string, current: boolean) => {
        try {
            await api.post(`/admin/experience-centers/${id}/status`, { isActive: !current });
            loadEcs();
        } catch {
            Alert.alert('Error', 'Could not update status');
        }
    };

    const testDinggConnection = async (id: string) => {
        setTestingId(id);
        try {
            const res = await api.post(`/admin/experience-centers/${id}/test-dingg`);
            if (res.data?.success) {
                Alert.alert('✅ DINGG Connected', res.data.message);
                loadEcs(); // refresh to show dinggEnabled = true
            } else {
                Alert.alert('❌ Connection Failed', res.data?.message || 'Unknown error');
            }
        } catch (err: any) {
            Alert.alert('❌ Error', err?.response?.data?.message || 'Test failed');
        } finally {
            setTestingId(null);
        }
    };

    const openCreateModal = () => {
        setEditingEc(null);
        setForm(EMPTY_FORM);
        setShowAccessCode(false);
        setShowApiKey(false);
        setModalVisible(true);
    };

    const openEditModal = (ec: ExperienceCenter) => {
        setEditingEc(ec);
        setForm({
            name: ec.name || '',
            type: ec.type || 'FULL',
            city: ec.city || '',
            address: ec.address || '',
            managerName: ec.managerName || '',
            managerContact: ec.managerContact || '',
            isActive: ec.isActive !== false,
            // Credentials are select:false — leave blank, user must re-enter to change
            dinggAccessCode: '',
            dinggApiKey: '',
            dinggVendorLocationUuid: ec.dinggVendorLocationUuid || '',
        });
        setShowAccessCode(false);
        setShowApiKey(false);
        setNewStylistPhone('');
        setNewStylistName('');
        setStylists([]);
        setModalVisible(true);
        loadStylists(ec.id);
    };

    const dinggStatus = (ec: ExperienceCenter) => {
        if (ec.dinggEnabled && ec.dinggTokenExpiresAt) {
            const expires = new Date(ec.dinggTokenExpiresAt);
            const isValid = expires > new Date();
            return isValid ? 'connected' : 'expired';
        }
        if (ec.dinggVendorLocationUuid) return 'partial'; // has location UUID but no token yet
        return 'none';
    };

    const DinggBadge = ({ ec }: { ec: ExperienceCenter }) => {
        const status = dinggStatus(ec);
        const config: Record<string, { label: string; bg: string; color: string; icon: any }> = {
            connected: { label: 'DINGG ✓', bg: '#D1FAE5', color: '#065F46', icon: 'check-circle' },
            expired:   { label: 'Token Expired', bg: '#FEF3C7', color: '#92400E', icon: 'clock-alert' },
            partial:   { label: 'Needs Test', bg: '#EDE9FE', color: '#5B21B6', icon: 'link-variant' },
            none:      { label: 'Not Set', bg: '#F3F4F6', color: '#6B7280', icon: 'link-off' },
        };
        const c = config[status];
        return (
            <View style={[styles.dinggBadge, { backgroundColor: c.bg }]}>
                <MaterialCommunityIcons name={c.icon} size={12} color={c.color} />
                <Text style={[styles.dinggBadgeText, { color: c.color }]}>{c.label}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Experience Centers</Text>
                    <Text style={styles.subtitle}>Manage physical stores, mini centers & DINGG integration</Text>
                </View>
                <Button mode="contained" onPress={openCreateModal} icon="plus" style={styles.addBtn}>
                    Add Center
                </Button>
            </View>

            {/* Table */}
            <ScrollView style={styles.tableContainer} horizontal>
                <View style={{ minWidth: 1050 }}>
                    <DataTable>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title style={{ flex: 2.5 }}>Name</DataTable.Title>
                            <DataTable.Title style={{ flex: 1 }}>Type</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.5 }}>City</DataTable.Title>
                            <DataTable.Title style={{ flex: 2 }}>Manager</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.5 }}>DINGG</DataTable.Title>
                            <DataTable.Title style={{ flex: 1 }}>Active</DataTable.Title>
                            <DataTable.Title style={{ flex: 2, justifyContent: 'center' }}>Actions</DataTable.Title>
                        </DataTable.Header>

                        {loading ? (
                            <ActivityIndicator style={{ marginTop: 40 }} />
                        ) : ecs.length === 0 ? (
                            <Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>
                                No experience centers found.
                            </Text>
                        ) : (
                            ecs.map((ec) => (
                                <DataTable.Row key={ec.id} style={styles.tableRow}>
                                    <DataTable.Cell style={{ flex: 2.5 }}>
                                        <View>
                                            <Text style={styles.ecName}>{ec.name}</Text>
                                            {!!ec.address && (
                                                <Text style={styles.ecAddress} numberOfLines={1}>{ec.address}</Text>
                                            )}
                                        </View>
                                    </DataTable.Cell>

                                    <DataTable.Cell style={{ flex: 1 }}>
                                        <View style={[styles.badge, {
                                            backgroundColor: ec.type === 'FULL' ? '#DBEAFE' : '#FEF3C7'
                                        }]}>
                                            <Text style={{
                                                fontSize: 11,
                                                color: ec.type === 'FULL' ? '#1D4ED8' : '#D97706',
                                                fontWeight: '600'
                                            }}>{ec.type}</Text>
                                        </View>
                                    </DataTable.Cell>

                                    <DataTable.Cell style={{ flex: 1.5 }}>
                                        <Text style={{ color: '#374151' }}>{ec.city || '—'}</Text>
                                    </DataTable.Cell>

                                    <DataTable.Cell style={{ flex: 2 }}>
                                        <View>
                                            <Text style={{ fontSize: 13, color: '#111827' }}>{ec.managerName || '—'}</Text>
                                            {!!ec.managerContact && (
                                                <Text style={{ fontSize: 11, color: '#6B7280' }}>{ec.managerContact}</Text>
                                            )}
                                        </View>
                                    </DataTable.Cell>

                                    <DataTable.Cell style={{ flex: 1.5 }}>
                                        <DinggBadge ec={ec} />
                                    </DataTable.Cell>

                                    <DataTable.Cell style={{ flex: 1 }}>
                                        <Switch
                                            value={ec.isActive}
                                            onValueChange={() => toggleStatus(ec.id, ec.isActive)}
                                            color="#10B981"
                                        />
                                    </DataTable.Cell>

                                    <DataTable.Cell style={{ flex: 2, justifyContent: 'center' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <IconButton
                                                icon="pencil"
                                                size={18}
                                                iconColor="#4B5563"
                                                onPress={() => openEditModal(ec)}
                                            />
                                            <IconButton
                                                icon="connection"
                                                size={18}
                                                iconColor={ec.dinggEnabled ? '#059669' : '#8B5CF6'}
                                                onPress={() => testDinggConnection(ec.id)}
                                                disabled={testingId === ec.id}
                                            />
                                            {testingId === ec.id && <ActivityIndicator size={14} />}
                                        </View>
                                    </DataTable.Cell>
                                </DataTable.Row>
                            ))
                        )}
                    </DataTable>
                </View>
            </ScrollView>

            {/* Legend */}
            <View style={styles.legend}>
                <MaterialCommunityIcons name="connection" size={14} color="#8B5CF6" />
                <Text style={styles.legendText}>  Tap the connection icon to test DINGG credentials</Text>
            </View>

            {/* Edit / Create Modal */}
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>
                            {editingEc ? `Edit — ${editingEc.name}` : 'New Experience Center'}
                        </Text>

                        {/* ── Basic Info ─────────────────────────────────── */}
                        <Text style={styles.sectionHeading}>Basic Information</Text>

                        <Text style={styles.label}>Type</Text>
                        <SegmentedButtons
                            value={form.type}
                            onValueChange={(val) => setForm({ ...form, type: val })}
                            buttons={[
                                { value: 'FULL', label: 'Full Center' },
                                { value: 'MINI', label: 'Mini Center' },
                            ]}
                            style={{ marginBottom: 16 }}
                        />

                        <Text style={styles.label}>Center Name *</Text>
                        <TextInput
                            value={form.name}
                            onChangeText={(v) => setForm({ ...form, name: v })}
                            mode="outlined"
                            style={styles.input}
                            placeholder="e.g. Bangalore HSR Layout"
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>City *</Text>
                                <TextInput
                                    value={form.city}
                                    onChangeText={(v) => setForm({ ...form, city: v })}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Full Address</Text>
                        <TextInput
                            value={form.address}
                            onChangeText={(v) => setForm({ ...form, address: v })}
                            mode="outlined"
                            style={styles.input}
                            multiline
                            numberOfLines={2}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Manager Name</Text>
                                <TextInput
                                    value={form.managerName}
                                    onChangeText={(v) => setForm({ ...form, managerName: v })}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Manager Contact</Text>
                                <TextInput
                                    value={form.managerContact}
                                    onChangeText={(v) => setForm({ ...form, managerContact: v })}
                                    mode="outlined"
                                    style={styles.input}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        {/* ── DINGG Credentials ──────────────────────────── */}
                        <Divider style={{ marginVertical: 20 }} />
                        <View style={styles.dinggSectionHeader}>
                            <MaterialCommunityIcons name="connection" size={18} color="#7C3AED" />
                            <Text style={[styles.sectionHeading, { color: '#7C3AED', marginBottom: 0, marginLeft: 8 }]}>
                                DINGG Integration
                            </Text>
                        </View>
                        <Text style={styles.dinggHint}>
                            {editingEc
                                ? 'Leave Access Code / API Key blank to keep existing credentials. Enter new values to update.'
                                : 'Obtain credentials from the DINGG tech-partner team.'}
                        </Text>

                        <Text style={styles.label}>Access Code</Text>
                        <TextInput
                            value={form.dinggAccessCode}
                            onChangeText={(v) => setForm({ ...form, dinggAccessCode: v })}
                            mode="outlined"
                            style={styles.input}
                            placeholder={editingEc ? '••••••• (unchanged)' : 'Enter access code'}
                            secureTextEntry={!showAccessCode}
                            right={
                                <TextInput.Icon
                                    icon={showAccessCode ? 'eye-off' : 'eye'}
                                    onPress={() => setShowAccessCode(!showAccessCode)}
                                />
                            }
                        />

                        <Text style={styles.label}>API Key</Text>
                        <TextInput
                            value={form.dinggApiKey}
                            onChangeText={(v) => setForm({ ...form, dinggApiKey: v })}
                            mode="outlined"
                            style={styles.input}
                            placeholder={editingEc ? '••••••• (unchanged)' : 'Enter API key'}
                            secureTextEntry={!showApiKey}
                            right={
                                <TextInput.Icon
                                    icon={showApiKey ? 'eye-off' : 'eye'}
                                    onPress={() => setShowApiKey(!showApiKey)}
                                />
                            }
                        />

                        <Text style={styles.label}>Vendor Location UUID</Text>
                        <TextInput
                            value={form.dinggVendorLocationUuid}
                            onChangeText={(v) => setForm({ ...form, dinggVendorLocationUuid: v })}
                            mode="outlined"
                            style={styles.input}
                            placeholder="e.g. abc123-def456-..."
                            autoCapitalize="none"
                        />

                        {/* Show test-connection button only when editing an existing EC */}
                        {editingEc && (
                            <TouchableOpacity
                                style={styles.testBtn}
                                onPress={() => {
                                    setModalVisible(false);
                                    setTimeout(() => testDinggConnection(editingEc.id), 400);
                                }}
                                disabled={testingId === editingEc?.id}
                            >
                                <MaterialCommunityIcons name="connection" size={16} color="#7C3AED" />
                                <Text style={styles.testBtnText}>Test DINGG Connection</Text>
                            </TouchableOpacity>
                        )}

                        {/* DINGG status info for existing ECs */}
                        {editingEc && (
                            <View style={[styles.statusRow, {
                                backgroundColor: editingEc.dinggEnabled ? '#D1FAE5' : '#FEF3C7'
                            }]}>
                                <MaterialCommunityIcons
                                    name={editingEc.dinggEnabled ? 'check-circle' : 'alert-circle'}
                                    size={16}
                                    color={editingEc.dinggEnabled ? '#065F46' : '#92400E'}
                                />
                                <Text style={[styles.statusText, {
                                    color: editingEc.dinggEnabled ? '#065F46' : '#92400E'
                                }]}>
                                    {editingEc.dinggEnabled
                                        ? `Connected · Token expires: ${editingEc.dinggTokenExpiresAt
                                            ? new Date(editingEc.dinggTokenExpiresAt).toLocaleDateString('en-IN')
                                            : '—'}`
                                        : 'Not connected — save credentials then tap Test Connection'
                                    }
                                </Text>
                            </View>
                        )}

                        {/* ── Stylists Section (edit mode only) ──────────── */}
                        {editingEc && (
                            <>
                                <Divider style={{ marginVertical: 20 }} />
                                <View style={styles.dinggSectionHeader}>
                                    <MaterialCommunityIcons name="account-group" size={18} color="#0891B2" />
                                    <Text style={[styles.sectionHeading, { color: '#0891B2', marginBottom: 0, marginLeft: 8 }]}>
                                        Stylists in this EC
                                    </Text>
                                </View>

                                {/* Existing stylists list */}
                                {stylistsLoading ? (
                                    <ActivityIndicator style={{ marginVertical: 8 }} />
                                ) : stylists.length === 0 ? (
                                    <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 12 }}>No stylists assigned yet.</Text>
                                ) : (
                                    <View style={{ marginBottom: 12 }}>
                                        {stylists.map((s) => (
                                            <View key={s.id} style={styles.stylistRow}>
                                                <View style={styles.stylistAvatar}>
                                                    <Text style={styles.stylistAvatarText}>
                                                        {s.name.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.stylistName}>{s.name}</Text>
                                                    <Text style={styles.stylistPhone}>{s.phone}</Text>
                                                </View>
                                                <Chip
                                                    mode="outlined"
                                                    style={[styles.stylistStatusChip, { borderColor: s.isActive ? '#10B981' : '#D1D5DB' }]}
                                                    textStyle={{ fontSize: 10, color: s.isActive ? '#059669' : '#9CA3AF' }}
                                                >
                                                    {s.isActive ? 'Active' : 'Inactive'}
                                                </Chip>
                                                <IconButton
                                                    icon="close-circle"
                                                    size={18}
                                                    iconColor="#EF4444"
                                                    disabled={removingStylistId === s.id}
                                                    onPress={() =>
                                                        Alert.alert(
                                                            'Remove Stylist',
                                                            `Remove ${s.name} from this EC?`,
                                                            [
                                                                { text: 'Cancel', style: 'cancel' },
                                                                { text: 'Remove', style: 'destructive', onPress: () => handleRemoveStylist(s.id) },
                                                            ]
                                                        )
                                                    }
                                                />
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {/* Add new stylist */}
                                <Text style={[styles.label, { marginTop: 4 }]}>Add Stylist by Phone</Text>
                                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                    <TextInput
                                        value={newStylistPhone}
                                        onChangeText={setNewStylistPhone}
                                        mode="outlined"
                                        placeholder="Phone number"
                                        keyboardType="phone-pad"
                                        style={{ flex: 1.2, backgroundColor: '#fff', marginBottom: 0 }}
                                        dense
                                    />
                                    <TextInput
                                        value={newStylistName}
                                        onChangeText={setNewStylistName}
                                        mode="outlined"
                                        placeholder="Name (optional)"
                                        style={{ flex: 1, backgroundColor: '#fff', marginBottom: 0 }}
                                        dense
                                    />
                                    <Button
                                        mode="contained"
                                        onPress={handleAddStylist}
                                        loading={addingStylist}
                                        disabled={addingStylist || !newStylistPhone.trim()}
                                        style={{ backgroundColor: '#0891B2', alignSelf: 'center' }}
                                        compact
                                    >
                                        Add
                                    </Button>
                                </View>
                                <Text style={styles.dinggHint}>If the phone doesn't exist in the system, a new stylist account will be created automatically.</Text>
                            </>
                        )}

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            <Button mode="text" onPress={() => setModalVisible(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSave}
                                loading={saving}
                                disabled={saving}
                            >
                                {editingEc ? 'Save Changes' : 'Create Center'}
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6', padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    addBtn: { backgroundColor: '#7C3AED' },

    tableContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flex: 1,
    },
    tableHeader: { backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tableRow: { borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },

    ecName: { fontWeight: '600', color: '#111827', fontSize: 13 },
    ecAddress: { fontSize: 11, color: '#9CA3AF' },

    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },

    dinggBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 8, paddingVertical: 4,
        borderRadius: 12, alignSelf: 'flex-start',
    },
    dinggBadgeText: { fontSize: 11, fontWeight: '600' },

    legend: {
        flexDirection: 'row', alignItems: 'center',
        marginTop: 12, paddingHorizontal: 4,
    },
    legendText: { fontSize: 12, color: '#6B7280' },

    // Modal
    modal: {
        backgroundColor: 'white',
        padding: 24,
        margin: 20,
        borderRadius: 16,
        maxWidth: 560,
        alignSelf: 'center',
        width: '100%',
        maxHeight: '92%',
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20 },

    sectionHeading: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 14, marginTop: 4 },

    label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
    input: { marginBottom: 16, backgroundColor: '#FFFFFF' },

    dinggSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    dinggHint: { fontSize: 12, color: '#6B7280', marginBottom: 16, lineHeight: 18 },

    testBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1.5,
        borderColor: '#7C3AED',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 16,
        alignSelf: 'flex-start',
    },
    testBtnText: { color: '#7C3AED', fontWeight: '600', fontSize: 14 },

    statusRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 12, borderRadius: 8, marginBottom: 16,
    },
    statusText: { fontSize: 13, fontWeight: '500', flex: 1 },

    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },

    // Stylist rows
    stylistRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 8, paddingHorizontal: 4,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    stylistAvatar: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center',
    },
    stylistAvatarText: { fontSize: 14, fontWeight: '700', color: '#1D4ED8' },
    stylistName: { fontSize: 13, fontWeight: '600', color: '#111827' },
    stylistPhone: { fontSize: 11, color: '#6B7280' },
    stylistStatusChip: { height: 24 },
});
