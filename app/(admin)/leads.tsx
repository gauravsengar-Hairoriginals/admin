import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TextInput as RNTextInput, Platform } from 'react-native';
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
    Checkbox,
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

    // ─── Per-column filters ─────────────────────────────────────────
    const [colFilters, setColFilters] = useState<Record<string, string>>({});

    // ─── Export date range ──────────────────────────────────────────
    const [exportFrom, setExportFrom] = useState('');
    const [exportTo, setExportTo] = useState('');

    // ─── Multi-select state ─────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

    // ─── Fetch leads ──────────────────────────────────────────────────────
    const fetchLeads = useCallback(async (p = 1, search = searchQuery) => {
        try {
            const res = await api.get('/leads', {
                params: {
                    page: p,
                    limit: LIMIT,
                    search: search || undefined,
                    name: colFilters.name || undefined,
                    phone: colFilters.phone || undefined,
                    city: colFilters.city || undefined,
                    source: colFilters.source || undefined,
                    campaign: colFilters.campaign || undefined,
                    status: colFilters.status || undefined,
                    assignedTo: colFilters.assignedTo || undefined,
                },
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
    }, [searchQuery, colFilters]);

    // Apply filters instantly with a small debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLeads(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [colFilters, searchQuery]);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => { fetchLeads(page); }, 5000);
        return () => clearInterval(interval);
    }, [page, fetchLeads]);

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

    // ─── (Global Filtering applied via backend instead of client-side) ───────

    const LEADS_FILTER_COLS = [
        { key: 'select', flex: 0.5, skip: true },
        { key: 'name', flex: 1.5 },
        { key: 'phone', flex: 1.2 },
        { key: 'city', flex: 1.5 },
        { key: 'source', flex: 1 },
        { key: 'campaign', flex: 1 },
        { key: 'status', flex: 1 },
        { key: 'assignedTo', flex: 1.8 },
        { key: 'date', flex: 1.2, skip: true },
        { key: 'actions', flex: 1, skip: true },
    ];

    // ─── Multi-select helpers ───────────────────────────────────────
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };
    const toggleSelectAll = () => {
        if (selectedIds.size === leads.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(leads.map(l => l.id)));
        }
    };
    const allSelected = leads.length > 0 && selectedIds.size === leads.length;

    // ─── Bulk Assign handler ──────────────────────────────────────
    const handleBulkAssign = async () => {
        if (!selectedCaller || selectedIds.size === 0) return;
        setBulkAssignLoading(true);
        try {
            await api.patch('/leads/bulk-assign', {
                leadIds: Array.from(selectedIds),
                callerId: selectedCaller.id,
            });
            // Update local state
            setLeads(prev => prev.map(l => {
                if (selectedIds.has(l.id)) {
                    return { ...l, assignedToId: selectedCaller.id, assignedToName: selectedCaller.name };
                }
                return l;
            }));
            setSelectedIds(new Set());
            setBulkAssignOpen(false);
            setSelectedCaller(null);
        } catch (err: any) {
            console.error('Bulk assign failed:', err?.response?.data ?? err);
        } finally {
            setBulkAssignLoading(false);
        }
    };

    // ─── CSV Export ────────────────────────────────────────────
    const downloadCSV = async () => {
        try {
            const params: any = { limit: 10000 };
            if (exportFrom) params.fromDate = exportFrom;
            if (exportTo) params.toDate = exportTo;
            const res = await api.get('/leads', { params });
            const exportLeads = res.data.leads ?? res.data ?? [];

            if (exportLeads.length === 0) {
                alert('No leads found for the selected date range.');
                return;
            }

            const rows = exportLeads.map((l: any) => ({
                Name: (l.customer?.name ?? '').replace(/,/g, ' '),
                Phone: l.customer?.phone ?? '',
                City: l.customer?.city ?? '',
                Source: l.source ?? '',
                Campaign: l.campaignId ?? '',
                Status: l.status ?? '',
                'Assigned To': l.assignedToName ?? '',
                'Call 1': l.call1 ?? '',
                'Call 2': l.call2 ?? '',
                'Call 3': l.call3 ?? '',
                'Next Action': l.nextActionDate ? new Date(l.nextActionDate).toLocaleDateString('en-IN') : '',
                'Exp. Center': l.preferredExperienceCenter ?? '',
                'Appt Booked': l.appointmentBooked ? 'Yes' : 'No',
                Products: (l.leadProducts ?? []).map((lp: any) => lp.productTitle).join(', '),
                Date: l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN') : '',
            }));
            const headers = Object.keys(rows[0] ?? {});
            const csv = [headers.join(','), ...rows.map((r: any) => headers.map(h => `"${(r as any)[h] ?? ''}"`).join(','))].join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const fromLabel = exportFrom || 'all';
            const toLabel = exportTo || 'now';
            a.download = `leads_${fromLabel}_to_${toLabel}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
            alert('Failed to export leads. Check console for details.');
        }
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

            {/* Export Row with Date Range */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2, marginBottom: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>Export:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>From</Text>
                    <input
                        type="date"
                        value={exportFrom}
                        onChange={(e: any) => setExportFrom(e.target.value)}
                        style={{
                            border: '1px solid #E5E7EB', borderRadius: 6,
                            paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5,
                            fontSize: 12, color: '#374151', backgroundColor: '#fff',
                            width: 140, outline: 'none', cursor: 'pointer',
                        }}
                    />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>To</Text>
                    <input
                        type="date"
                        value={exportTo}
                        onChange={(e: any) => setExportTo(e.target.value)}
                        style={{
                            border: '1px solid #E5E7EB', borderRadius: 6,
                            paddingLeft: 10, paddingRight: 10, paddingTop: 5, paddingBottom: 5,
                            fontSize: 12, color: '#374151', backgroundColor: '#fff',
                            width: 140, outline: 'none', cursor: 'pointer',
                        }}
                    />
                </View>
                <Button mode="contained" icon="download" onPress={downloadCSV} compact
                    buttonColor="#4F46E5" textColor="#fff"
                    style={{ borderRadius: 8 }}>
                    Export CSV
                </Button>
                {(exportFrom || exportTo) && (
                    <Button mode="text" compact onPress={() => { setExportFrom(''); setExportTo(''); }}
                        textColor="#9CA3AF" style={{ marginLeft: -4 }}>
                        Clear dates
                    </Button>
                )}
            </View>

            {/* Table */}
            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <ScrollView horizontal refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                        <DataTable style={{ minWidth: 1400 }}>
                            <DataTable.Header style={[styles.tableHeader, { paddingVertical: 8 }]}>
                                <DataTable.Title style={{ flex: 0.5 }}>
                                    <Checkbox
                                        status={allSelected ? 'checked' : selectedIds.size > 0 ? 'indeterminate' : 'unchecked'}
                                        onPress={toggleSelectAll}
                                    />
                                </DataTable.Title>
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

                            {/* Filter row */}
                            <View style={{ flexDirection: 'row', backgroundColor: '#FAFBFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 6, paddingHorizontal: 12 }}>
                                {LEADS_FILTER_COLS.map(fc => (
                                    <View key={fc.key} style={{ flex: fc.flex ?? 1, paddingHorizontal: 4 }}>
                                        {fc.skip ? <View /> : (
                                            <RNTextInput
                                                placeholder="Filter…"
                                                placeholderTextColor="#9CA3AF"
                                                value={colFilters[fc.key] ?? ''}
                                                onChangeText={(text) => setColFilters(prev => ({ ...prev, [fc.key]: text }))}
                                                style={{
                                                    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6,
                                                    paddingHorizontal: 8, paddingVertical: 4, fontSize: 11,
                                                    color: '#374151', backgroundColor: '#fff',
                                                }}
                                            />
                                        )}
                                    </View>
                                ))}
                            </View>

                            {leads.length === 0 ? (
                                <View style={{ padding: 32, alignItems: 'center' }}>
                                    <Text style={{ color: Colors.textSecondary }}>
                                        {Object.values(colFilters).some(v => !!v) ? '🔍 No leads match the column filters' : 'No leads found.'}
                                    </Text>
                                </View>
                            ) : (
                                leads.map(lead => (
                                    <DataTable.Row key={lead.id} style={[styles.tableRow, selectedIds.has(lead.id) && { backgroundColor: '#E3F2FD' }]}>
                                        <DataTable.Cell style={{ flex: 0.5 }}>
                                            <Checkbox
                                                status={selectedIds.has(lead.id) ? 'checked' : 'unchecked'}
                                                onPress={() => toggleSelect(lead.id)}
                                            />
                                        </DataTable.Cell>
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

            {/* ── Floating Bulk Action Bar ── */}
            {selectedIds.size > 0 && (
                <View style={{
                    position: 'absolute' as any, bottom: 24, left: '50%', transform: [{ translateX: -200 }],
                    width: 400, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    backgroundColor: '#1E293B', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12,
                    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, elevation: 8,
                }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        {selectedIds.size} lead{selectedIds.size > 1 ? 's' : ''} selected
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Button
                            mode="contained"
                            icon="account-arrow-right"
                            buttonColor="#3B82F6"
                            onPress={() => { setBulkAssignOpen(true); setSelectedCaller(null); setCallerSearch(''); fetchCallers(); }}
                            compact
                        >
                            Bulk Assign
                        </Button>
                        <Button
                            mode="text"
                            textColor="#94A3B8"
                            onPress={() => setSelectedIds(new Set())}
                            compact
                        >
                            Clear
                        </Button>
                    </View>
                </View>
            )}

            {/* ── Bulk Assign Modal ── */}
            <Portal>
                <Modal
                    visible={bulkAssignOpen}
                    onDismiss={() => setBulkAssignOpen(false)}
                    contentContainerStyle={[styles.modal, { maxWidth: 460 }]}
                >
                    <Text variant="titleLarge" style={{ fontWeight: 'bold', marginBottom: 4 }}>
                        Bulk Assign {selectedIds.size} Lead{selectedIds.size > 1 ? 's' : ''}
                    </Text>
                    <Text variant="bodySmall" style={{ color: Colors.textSecondary, marginBottom: 16 }}>
                        Select a lead caller to assign all selected leads to
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
                                        <Text variant="bodyMedium" style={{ fontWeight: '600' }}>{caller.name}</Text>
                                        <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{caller.phone}</Text>
                                    </View>
                                    <Button
                                        mode={selectedCaller?.id === caller.id ? 'contained' : 'outlined'}
                                        onPress={() => setSelectedCaller(caller)}
                                        compact
                                    >
                                        {selectedCaller?.id === caller.id ? 'Selected' : 'Select'}
                                    </Button>
                                </View>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                        <Button onPress={() => setBulkAssignOpen(false)}>Cancel</Button>
                        <Button
                            mode="contained"
                            onPress={handleBulkAssign}
                            loading={bulkAssignLoading}
                            disabled={!selectedCaller}
                        >
                            Assign to {selectedCaller?.name ?? '...'}
                        </Button>
                    </View>
                </Modal>
            </Portal>

            {/* ── Assign Modal (single) ── */}
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

                        {/* Structured Popin details (read-only) */}
                        {editingLead?.specificDetails && (() => {
                            const sd = editingLead.specificDetails;
                            const meta = sd.popin_meta && typeof sd.popin_meta === 'object' && !Array.isArray(sd.popin_meta) ? sd.popin_meta : {};
                            const isPopin = !!sd.popin_event;
                            if (!isPopin) return null;

                            const InfoRow = ({ label, value }: { label: string; value: any }) => {
                                if (value === null || value === undefined || value === '') return null;
                                const isObj = typeof value === 'object';
                                return (
                                    <View style={{ flexDirection: isObj ? 'column' : 'row', gap: isObj ? 6 : 6, marginBottom: isObj ? 12 : 4, width: '100%' }}>
                                        <Text style={{ fontSize: 11, color: '#6B7280', width: isObj ? '100%' : 80, fontWeight: '600' }}>{label}</Text>
                                        {isObj ? (
                                            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', padding: 8, width: '100%' }}>
                                                <Text style={{ fontSize: 11, color: '#374151', fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }}>
                                                    {JSON.stringify(value, null, 2)}
                                                </Text>
                                            </View>
                                        ) : (
                                            <Text style={{ fontSize: 12, color: '#1F2937', flex: 1, fontWeight: '500' }}>{String(value)}</Text>
                                        )}
                                    </View>
                                );
                            };

                            return (
                                <View style={{ gap: 8, marginBottom: 14, padding: 12, backgroundColor: '#F8FAFF', borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE' }}>
                                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#4338CA' }}>📡 Popin Lead Details</Text>

                                    <View style={{ backgroundColor: '#EEF2FF', borderRadius: 8, padding: 10 }}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#4338CA', marginBottom: 6 }}>Event</Text>
                                        <InfoRow label="Type" value={sd.popin_event?.replace('popin_', '').replace(/_/g, ' ')} />
                                        <InfoRow label="Timestamp" value={sd.popin_timestamp ? new Date(sd.popin_timestamp).toLocaleString('en-IN') : null} />
                                        <InfoRow label="User ID" value={sd.popin_user_id} />
                                    </View>

                                    {(meta.utm_source || meta.utm_medium || meta.utm_campaign || meta.utm_content) && (
                                        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#166534', marginBottom: 6 }}>📊 Marketing / UTM</Text>
                                            <InfoRow label="Source" value={meta.utm_source} />
                                            <InfoRow label="Medium" value={meta.utm_medium} />
                                            <InfoRow label="Campaign" value={meta.utm_campaign} />
                                            <InfoRow label="Content" value={meta.utm_content} />
                                            <InfoRow label="Term" value={meta.utm_term} />
                                        </View>
                                    )}

                                    {sd.popin_url && (
                                        <View style={{ backgroundColor: '#FFF7ED', borderRadius: 8, padding: 10 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#9A3412', marginBottom: 6 }}>🌐 Page</Text>
                                            <Text style={{ fontSize: 12, color: '#4338CA', textDecorationLine: 'underline' }}>{sd.popin_url}</Text>
                                        </View>
                                    )}

                                    {(sd.popin_agent_name || sd.popin_agent_email) && (
                                        <View style={{ backgroundColor: '#FDF4FF', borderRadius: 8, padding: 10 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E22CE', marginBottom: 6 }}>👤 Agent</Text>
                                            <InfoRow label="Name" value={sd.popin_agent_name} />
                                            <InfoRow label="Email" value={sd.popin_agent_email} />
                                        </View>
                                    )}

                                    {(sd.popin_call_duration || sd.popin_rating) && (
                                        <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B', marginBottom: 6 }}>📞 Call</Text>
                                            <InfoRow label="Duration" value={sd.popin_call_duration ? `${sd.popin_call_duration}s` : null} />
                                            <InfoRow label="Rating" value={sd.popin_rating ? `⭐ ${sd.popin_rating}` : null} />
                                            <InfoRow label="Comments" value={sd.popin_rating_comments} />
                                            <InfoRow label="Remark" value={sd.popin_remark} />
                                        </View>
                                    )}

                                    {(sd.popin_scheduled_date_local || sd.popin_scheduled_date) && (
                                        <View style={{ backgroundColor: '#ECFEFF', borderRadius: 8, padding: 10 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#155E75', marginBottom: 6 }}>📅 Scheduled</Text>
                                            <InfoRow label="Date" value={sd.popin_scheduled_date_local || sd.popin_scheduled_date} />
                                            <InfoRow label="Time" value={sd.popin_scheduled_time_local || sd.popin_scheduled_time} />
                                        </View>
                                    )}
                                </View>
                            );
                        })()}

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
