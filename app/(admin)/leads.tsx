import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
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
    Menu,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AdminPageLayout from '../../components/AdminPageLayout';

const EMPTY_FORM = {
    name: '',
    phone: '',
    address: '',
    city: '',
    pincode: '',
    notes: '',
    source: '',
    pageType: '',
    campaignId: '',
    specificDetails: '',
};

export default function LeadsScreen() {
    const { user } = useAuth();

    // ─── List state ──────────────────────────────────────────────────────
    const [leads, setLeads] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const LIMIT = 20;

    // ─── Add / Edit modal ────────────────────────────────────────────────
    const [modalVisible, setModalVisible] = useState(false);
    const [editingLead, setEditingLead] = useState<any>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState('');

    // ─── Delete state ─────────────────────────────────────────────────────
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [clearDialogVisible, setClearDialogVisible] = useState(false);
    const [clearLoading, setClearLoading] = useState(false);

    // ─── Assign state ─────────────────────────────────────────────────────
    const [assignTarget, setAssignTarget] = useState<any>(null);
    const [callers, setCallers] = useState<any[]>([]);
    const [callerSearch, setCallerSearch] = useState('');
    const [assignLoading, setAssignLoading] = useState(false);
    const [selectedCaller, setSelectedCaller] = useState<any>(null);

    // ─── Fetch leads ──────────────────────────────────────────────────────
    const fetchLeads = useCallback(async (p = 1, search = searchQuery) => {
        try {
            const res = await api.get('/leads', {
                params: { page: p, limit: LIMIT, search: search || undefined },
            });
            setLeads(res.data.leads ?? []);
            setTotal(res.data.total ?? 0);
            setPage(p);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [searchQuery]);

    useEffect(() => { fetchLeads(); }, []);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchLeads(page); }, 5000);
        return () => clearInterval(interval);
    }, [page, searchQuery]);

    const onRefresh = () => { setRefreshing(true); fetchLeads(1); };

    // ─── Fetch callers for assign modal ───────────────────────────────────
    const fetchCallers = async (search?: string) => {
        try {
            const res = await api.get('/admin/lead-callers', {
                params: { search: search || undefined },
            });
            setCallers(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const openAssign = (lead: any) => {
        setAssignTarget(lead);
        setSelectedCaller(null);
        setCallerSearch('');
        fetchCallers();
    };

    const handleAssign = async () => {
        if (!assignTarget || !selectedCaller) return;
        setAssignLoading(true);
        try {
            const res = await api.patch(`/leads/${assignTarget.id}/assign`, {
                callerId: selectedCaller.id,
            });
            setLeads(prev => prev.map(l => l.id === assignTarget.id ? { ...l, ...res.data } : l));
            setAssignTarget(null);
        } catch (err) {
            console.error(err);
        } finally {
            setAssignLoading(false);
        }
    };

    // ─── Add / Edit helpers ───────────────────────────────────────────────
    const openAddModal = () => {
        setEditingLead(null);
        setForm({ ...EMPTY_FORM });
        setFormError('');
        setModalVisible(true);
    };

    const openEditModal = (lead: any) => {
        setEditingLead(lead);
        const c = lead.customer ?? {};
        setForm({
            name: c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
            phone: c.phone || '',
            address: c.addressLine1 || '',
            city: c.city || '',
            pincode: c.pincode || '',
            notes: c.notes || '',
            source: lead.source || '',
            pageType: lead.pageType || '',
            campaignId: lead.campaignId || '',
            specificDetails: lead.specificDetails
                ? JSON.stringify(lead.specificDetails, null, 2)
                : '',
        });
        setFormError('');
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.phone.trim()) {
            setFormError('Name and phone are required.');
            return;
        }

        let parsedDetails: any = undefined;
        if (form.specificDetails.trim()) {
            try { parsedDetails = JSON.parse(form.specificDetails); }
            catch { setFormError('Specific Details must be valid JSON.'); return; }
        }

        setFormLoading(true);
        setFormError('');
        try {
            const payload: any = {
                name: form.name.trim(),
                phone: form.phone.trim(),
                address: form.address.trim() || undefined,
                city: form.city.trim() || undefined,
                pincode: form.pincode.trim() || undefined,
                notes: form.notes.trim() || undefined,
                source: form.source.trim() || undefined,
                pageType: form.pageType.trim() || undefined,
                campaignId: form.campaignId.trim() || undefined,
                specificDetails: parsedDetails,
            };

            if (editingLead) {
                const res = await api.patch(`/leads/${editingLead.id}`, payload);
                setLeads(prev => prev.map(l => l.id === editingLead.id ? { ...l, ...res.data } : l));
            } else {
                await api.post('/leads', payload);
                fetchLeads(1);
            }
            setModalVisible(false);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Failed to save lead.';
            setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setFormLoading(false);
        }
    };

    // ─── Delete helpers ───────────────────────────────────────────────────
    const handleDeleteOne = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await api.delete(`/leads/${deleteTarget.id}`);
            setLeads(prev => prev.filter(l => l.id !== deleteTarget.id));
            setTotal(t => t - 1);
        } catch (err) {
            console.error(err);
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    const handleClearAll = async () => {
        setClearLoading(true);
        try {
            const res = await api.delete('/leads', { params: { confirm: 'true' } });
            setLeads([]);
            setTotal(0);
            setClearDialogVisible(false);
            Alert.alert('Done', `${res.data.deleted} leads deleted.`);
        } catch (err) {
            console.error(err);
        } finally {
            setClearLoading(false);
        }
    };

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const getLeadName = (lead: any) => {
        const c = lead.customer ?? {};
        return c.name || `${c.firstName || ''} ${c.lastName || ''}`.trim() || '—';
    };

    // ─── Render ───────────────────────────────────────────────────────────
    return (
        <AdminPageLayout>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>
                        Leads
                    </Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                        {total} lead{total !== 1 ? 's' : ''} captured
                    </Text>
                </View>
                <View style={styles.headerActions}>
                    <Searchbar
                        placeholder="Search name or phone…"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => fetchLeads(1)}
                        style={styles.searchBar}
                        inputStyle={{ minHeight: 0 }}
                    />
                    <Button mode="contained" icon="account-plus" onPress={openAddModal} style={{ marginLeft: 8 }}>
                        Add Lead
                    </Button>
                    {isSuperAdmin && (
                        <Button
                            mode="outlined"
                            icon="delete-sweep"
                            textColor={Colors.error}
                            style={{ marginLeft: 8, borderColor: Colors.error }}
                            onPress={() => setClearDialogVisible(true)}
                        >
                            Clear All
                        </Button>
                    )}
                </View>
            </View>

            {/* Table */}
            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <ScrollView horizontal refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                        <DataTable style={{ minWidth: 1200 }}>
                            <DataTable.Header style={styles.tableHeader}>
                                <DataTable.Title style={{ flex: 1.5 }} textStyle={styles.tableTitle}>Name</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Phone</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.5 }} textStyle={styles.tableTitle}>City</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableTitle}>Source</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableTitle}>Campaign</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableTitle}>Status</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.8 }} textStyle={styles.tableTitle}>Assigned To</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Date</DataTable.Title>
                                <DataTable.Title textStyle={styles.tableTitle}>Actions</DataTable.Title>
                            </DataTable.Header>

                            {leads.length === 0 ? (
                                <View style={{ padding: 32, alignItems: 'center' }}>
                                    <Text style={{ color: Colors.textSecondary }}>No leads found.</Text>
                                </View>
                            ) : (
                                leads.map(lead => (
                                    <DataTable.Row key={lead.id} style={styles.tableRow}>
                                        <DataTable.Cell style={{ flex: 1.5 }}>
                                            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{getLeadName(lead)}</Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.2 }}>
                                            <Text variant="bodySmall">{lead.customer?.phone || '—'}</Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.5 }}>
                                            <Text variant="bodySmall">{lead.customer?.city || '—'}</Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell>
                                            <Text variant="bodySmall">{lead.source || '—'}</Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell>
                                            <Text variant="bodySmall">{lead.campaignId || '—'}</Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell>
                                            <StatusChip status={lead.status} />
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.8 }}>
                                            {lead.assignedToName ? (
                                                <Chip
                                                    icon="account"
                                                    mode="flat"
                                                    style={{ backgroundColor: '#E3F2FD' }}
                                                    textStyle={{ color: '#1565C0', fontSize: 11 }}
                                                >
                                                    {lead.assignedToName}
                                                </Chip>
                                            ) : (
                                                <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Unassigned</Text>
                                            )}
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.2 }}>
                                            <Text variant="bodySmall">
                                                {new Date(lead.createdAt).toLocaleDateString('en-IN')}
                                            </Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell>
                                            <View style={{ flexDirection: 'row' }}>
                                                <IconButton
                                                    icon="account-arrow-right"
                                                    size={18}
                                                    iconColor="#1565C0"
                                                    onPress={() => openAssign(lead)}
                                                    style={{ margin: 0 }}
                                                />
                                                <IconButton
                                                    icon="pencil-outline"
                                                    size={18}
                                                    iconColor={Colors.primary}
                                                    onPress={() => openEditModal(lead)}
                                                    style={{ margin: 0 }}
                                                />
                                                <IconButton
                                                    icon="trash-can-outline"
                                                    size={18}
                                                    iconColor={Colors.error}
                                                    onPress={() => setDeleteTarget(lead)}
                                                    style={{ margin: 0 }}
                                                />
                                            </View>
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                ))
                            )}
                        </DataTable>
                    </ScrollView>
                )}

                {total > LIMIT && (
                    <DataTable.Pagination
                        page={page - 1}
                        numberOfPages={Math.ceil(total / LIMIT)}
                        onPageChange={p => fetchLeads(p + 1)}
                        label={`Page ${page} of ${Math.ceil(total / LIMIT)}`}
                        numberOfItemsPerPage={LIMIT}
                    />
                )}
            </Card>

            {/* ── Assign Modal ── */}
            <Portal>
                <Modal
                    visible={!!assignTarget}
                    onDismiss={() => setAssignTarget(null)}
                    contentContainerStyle={[styles.modal, { maxWidth: 460 }]}
                >
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        Assign Lead
                    </Text>
                    <Text variant="bodySmall" style={{ color: Colors.textSecondary, marginBottom: 16 }}>
                        Assign "{getLeadName(assignTarget ?? {})}" to a lead caller
                    </Text>

                    <Searchbar
                        placeholder="Search callers…"
                        value={callerSearch}
                        onChangeText={v => { setCallerSearch(v); fetchCallers(v); }}
                        style={{ marginBottom: 12 }}
                        inputStyle={{ minHeight: 0 }}
                    />

                    <ScrollView style={{ maxHeight: 240 }}>
                        {callers.map(caller => (
                            <View key={caller.id}>
                                <View
                                    style={[
                                        styles.callerRow,
                                        selectedCaller?.id === caller.id && styles.callerRowSelected,
                                    ]}
                                >
                                    <View style={{ flex: 1 }}>
                                        <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{caller.name}</Text>
                                        <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{caller.phone} · {caller.email}</Text>
                                    </View>
                                    <Button
                                        mode={selectedCaller?.id === caller.id ? 'contained' : 'outlined'}
                                        compact
                                        onPress={() => setSelectedCaller(caller)}
                                    >
                                        {selectedCaller?.id === caller.id ? 'Selected' : 'Select'}
                                    </Button>
                                </View>
                            </View>
                        ))}
                        {callers.length === 0 && (
                            <Text style={{ color: Colors.textSecondary, textAlign: 'center', padding: 16 }}>
                                No lead callers found. Create one in Lead Callers tab.
                            </Text>
                        )}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Button onPress={() => setAssignTarget(null)}>Cancel</Button>
                        <Button
                            mode="contained"
                            onPress={handleAssign}
                            loading={assignLoading}
                            disabled={!selectedCaller}
                            icon="account-arrow-right"
                        >
                            Assign
                        </Button>
                    </View>
                </Modal>
            </Portal>

            {/* ── Add / Edit Modal ── */}
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 16 }}>
                            {editingLead ? 'Edit Lead' : 'Add New Lead'}
                        </Text>

                        <View style={styles.formRow}>
                            <TextInput label="Full Name *" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} mode="outlined" style={styles.formInput} />
                            <TextInput label="Phone *" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} mode="outlined" keyboardType="phone-pad" style={styles.formInput} />
                        </View>

                        <View style={styles.formRow}>
                            <TextInput label="Address" value={form.address} onChangeText={v => setForm(f => ({ ...f, address: v }))} mode="outlined" style={[styles.formInput, { flex: 2 }]} />
                            <TextInput label="City" value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))} mode="outlined" style={styles.formInput} />
                            <TextInput label="Pincode" value={form.pincode} onChangeText={v => setForm(f => ({ ...f, pincode: v }))} mode="outlined" keyboardType="numeric" style={styles.formInput} />
                        </View>

                        <View style={styles.formRow}>
                            <TextInput label="Source" value={form.source} onChangeText={v => setForm(f => ({ ...f, source: v }))} mode="outlined" placeholder="e.g. facebook" style={styles.formInput} />
                            <TextInput label="Page Type" value={form.pageType} onChangeText={v => setForm(f => ({ ...f, pageType: v }))} mode="outlined" placeholder="e.g. campaign" style={styles.formInput} />
                            <TextInput label="Campaign ID" value={form.campaignId} onChangeText={v => setForm(f => ({ ...f, campaignId: v }))} mode="outlined" style={styles.formInput} />
                        </View>

                        <TextInput label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} mode="outlined" multiline numberOfLines={2} style={{ marginBottom: 12 }} />
                        <TextInput
                            label="Specific Details (JSON)"
                            value={form.specificDetails}
                            onChangeText={v => setForm(f => ({ ...f, specificDetails: v }))}
                            mode="outlined"
                            multiline
                            numberOfLines={4}
                            placeholder={'{\n  "utm_term": "hair care"\n}'}
                            style={{ marginBottom: 12, fontFamily: 'monospace' }}
                        />

                        {formError ? <Text style={{ color: Colors.error, marginBottom: 8 }}>{formError}</Text> : null}

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
                            <Button onPress={() => setModalVisible(false)}>Cancel</Button>
                            <Button mode="contained" onPress={handleSave} loading={formLoading}>
                                {editingLead ? 'Save Changes' : 'Create Lead'}
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>

            {/* ── Delete single ── */}
            <Portal>
                <Dialog visible={!!deleteTarget} onDismiss={() => setDeleteTarget(null)} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title>Delete Lead</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Delete lead for <Text style={{ fontWeight: 'bold' }}>{getLeadName(deleteTarget ?? {})}</Text>? This cannot be undone.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDeleteTarget(null)}>Cancel</Button>
                        <Button textColor={Colors.error} onPress={handleDeleteOne} loading={deleteLoading}>Delete</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* ── Clear all ── */}
            <Portal>
                <Dialog visible={clearDialogVisible} onDismiss={() => setClearDialogVisible(false)} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title>Clear All Leads</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            This will permanently delete <Text style={{ fontWeight: 'bold' }}>all {total} leads</Text>. This action cannot be undone.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setClearDialogVisible(false)}>Cancel</Button>
                        <Button textColor={Colors.error} onPress={handleClearAll} loading={clearLoading}>Yes, Delete All</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </AdminPageLayout>
    );
}

// Status badge component
function StatusChip({ status }: { status?: string }) {
    const map: Record<string, { label: string; color: string; bg: string }> = {
        new: { label: 'New', color: '#1565C0', bg: '#E3F2FD' },
        contacted: { label: 'Contacted', color: '#F57F17', bg: '#FFFDE7' },
        follow_up: { label: 'Follow up', color: '#6A1B9A', bg: '#F3E5F5' },
        converted: { label: 'Converted', color: '#2E7D32', bg: '#E8F5E9' },
        not_interested: { label: 'Not interested', color: '#757575', bg: '#F5F5F5' },
    };
    const s = map[status ?? 'new'] ?? map.new;
    return (
        <Chip mode="flat" style={{ backgroundColor: s.bg }} textStyle={{ color: s.color, fontSize: 11 }}>
            {s.label}
        </Chip>
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
        maxWidth: 800,
        alignSelf: 'center',
        width: '100%',
        maxHeight: '90%',
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    formInput: {
        flex: 1,
    },
    callerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginBottom: 6,
        backgroundColor: '#FAFAFA',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    callerRowSelected: {
        backgroundColor: '#E3F2FD',
        borderColor: '#1565C0',
    },
});
