import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable, Switch } from 'react-native';
import {
    Text,
    Button,
    Card,
    TextInput,
    ActivityIndicator,
    Portal,
    Modal,
    Divider,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

// Fields available in our lead system for mapping
const LEAD_FIELDS = [
    { key: '', label: '— Unmapped —' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'address', label: 'Address' },
    { key: 'pincode', label: 'Pincode' },
    { key: 'notes', label: 'Notes' },
    { key: 'source', label: 'Source' },
    { key: 'pageType', label: 'Page Type' },
    { key: 'campaignId', label: 'Campaign ID' },
    { key: 'customerProductInterest', label: 'Product Interest' },
    { key: 'preferredExperienceCenter', label: 'Experience Center' },
    { key: 'consultationType', label: 'Consultation Type' },
    { key: 'formType', label: 'Form Type' },
];

export default function FacebookFormsScreen() {
    // ── Config State ──────────────────────────────────────────────────────
    const [configs, setConfigs] = useState<any[]>([]);
    const [configForm, setConfigForm] = useState({ pageId: '', pageName: '', accessToken: '' });
    const [configLoading, setConfigLoading] = useState(false);
    const [configSaving, setConfigSaving] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);

    // ── Forms State ───────────────────────────────────────────────────────
    const [forms, setForms] = useState<any[]>([]);
    const [formsLoading, setFormsLoading] = useState(false);
    const [importingPageId, setImportingPageId] = useState<string | null>(null);
    const [uploadingCsvFormId, setUploadingCsvFormId] = useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    // ── Mapping Modal ─────────────────────────────────────────────────────
    const [mappingForm, setMappingForm] = useState<any>(null);
    const [mappingDraft, setMappingDraft] = useState<Record<string, string>>({});
    const [mappingSaving, setMappingSaving] = useState(false);

    // ── Load Configs ──────────────────────────────────────────────────────
    const loadConfigs = useCallback(async () => {
        setConfigLoading(true);
        try {
            const res = await api.get('/facebook/config');
            setConfigs(res.data ?? []);
        } catch (err: any) {
            console.error('Load configs failed', err?.response?.data ?? err);
        }
        setConfigLoading(false);
    }, []);

    // ── Load Forms ────────────────────────────────────────────────────────
    const loadForms = useCallback(async () => {
        setFormsLoading(true);
        try {
            const res = await api.get('/facebook/forms');
            setForms(res.data ?? []);
        } catch (err: any) {
            console.error('Load forms failed', err?.response?.data ?? err);
        }
        setFormsLoading(false);
    }, []);

    useEffect(() => {
        loadConfigs();
        loadForms();
    }, []);

    // ── Save Config ───────────────────────────────────────────────────────
    const saveConfig = async () => {
        if (!configForm.pageId || !configForm.accessToken) {
            alert('Page ID and Access Token are required.');
            return;
        }
        setConfigSaving(true);
        try {
            await api.put('/facebook/config', configForm);
            alert('✅ Facebook page added!');
            setConfigForm({ pageId: '', pageName: '', accessToken: '' });
            setShowAddForm(false);
            await loadConfigs();
        } catch (err: any) {
            alert('Failed to save: ' + (err?.response?.data?.message ?? err.message));
        }
        setConfigSaving(false);
    };

    // ── Delete Config ─────────────────────────────────────────────────────
    const deleteConfig = async (configId: string, pageName: string) => {
        if (!confirm(`Remove "${pageName || configId}" from connected pages?`)) return;
        try {
            await api.delete(`/facebook/config/${configId}`);
            setConfigs(prev => prev.filter(c => c.id !== configId));
        } catch (err: any) {
            alert('Failed to delete: ' + (err?.response?.data?.message ?? err.message));
        }
    };

    // ── Toggle Config Active ──────────────────────────────────────────────
    const toggleConfigActive = async (cfg: any) => {
        try {
            const res = await api.patch(`/facebook/config/${cfg.id}/active`, { isActive: !cfg.isActive });
            setConfigs(prev => prev.map(c => c.id === cfg.id ? { ...c, ...res.data } : c));
        } catch (err: any) {
            alert('Failed to toggle: ' + (err?.response?.data?.message ?? err.message));
        }
    };

    // ── Import Forms ──────────────────────────────────────────────────────
    const importForms = async (pageId: string) => {
        setImportingPageId(pageId);
        try {
            const res = await api.post('/facebook/forms/import', { pageId });
            alert(`✅ Imported ${(res.data ?? []).length} forms from page ${pageId}!`);
            await loadForms();
        } catch (err: any) {
            alert('Import failed: ' + (err?.response?.data?.message ?? err.message));
        }
        setImportingPageId(null);
    };

    // ── Toggle Sync ───────────────────────────────────────────────────────
    const toggleSync = async (form: any) => {
        try {
            const res = await api.patch(`/facebook/forms/${form.id}/sync`, {
                syncEnabled: !form.syncEnabled,
            });
            setForms(prev => prev.map(f => f.id === form.id ? { ...f, ...res.data } : f));
        } catch (err: any) {
            alert('Failed to toggle sync: ' + (err?.response?.data?.message ?? err.message));
        }
    };

    // ── CSV Upload ────────────────────────────────────────────────────────
    const triggerFileInput = (formId: string | 'NEW') => {
        setUploadingCsvFormId(formId);
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; // Reset input
            fileInputRef.current.click();
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadingCsvFormId) return;

        const formData = new FormData();
        formData.append('file', file);

        setFormsLoading(true);
        try {
            const url = uploadingCsvFormId === 'NEW'
                ? '/facebook/forms/upload-new'
                : `/facebook/forms/${uploadingCsvFormId}/upload`;

            const res = await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            alert(`✅ ${res.data.message || 'Import successful!'}`);
            await loadForms();

            // If it was a new form, prompt to map fields
            if (uploadingCsvFormId === 'NEW') {
                const newForm = forms.find(f => f.id === res.data.formId);
                // The new form might not be in the local state yet, so we just let them click Map Fields manually.
                alert('Please click "Map Fields" on the new form to finish setup.');
            }
        } catch (err: any) {
            alert('Upload failed: ' + (err?.response?.data?.message ?? err.message));
        } finally {
            setFormsLoading(false);
            setUploadingCsvFormId(null);
        }
    };

    // ── Save Mapping ──────────────────────────────────────────────────────
    const saveMapping = async () => {
        if (!mappingForm) return;
        setMappingSaving(true);
        try {
            const res = await api.patch(`/facebook/forms/${mappingForm.id}/mapping`, {
                fieldMapping: mappingDraft,
            });
            setForms(prev => prev.map(f => f.id === mappingForm.id ? { ...f, ...res.data } : f));
            setMappingForm(null);
            alert('✅ Mapping saved!');
        } catch (err: any) {
            alert('Failed to save mapping: ' + (err?.response?.data?.message ?? err.message));
        }
        setMappingSaving(false);
    };

    // ── Open Mapping Modal ────────────────────────────────────────────────
    const openMapping = (form: any) => {
        setMappingForm(form);
        setMappingDraft({ ...(form.fieldMapping ?? {}) });
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <AdminPageLayout>
            {/* Hidden File Input for CSV Uploads */}
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".csv"
                onChange={handleFileChange}
            />
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
                {/* ── Section 1: Facebook Pages ── */}
                <Card style={s.card}>
                    <Card.Content>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={s.sectionIcon}>📘</Text>
                                <Text style={s.sectionTitle}>Connected Facebook Pages</Text>
                                <View style={s.countBadge}>
                                    <Text style={s.countText}>{configs.length}</Text>
                                </View>
                            </View>
                            <Button
                                mode="contained"
                                icon="plus"
                                buttonColor="#1877F2"
                                compact
                                onPress={() => setShowAddForm(v => !v)}
                            >
                                {showAddForm ? 'Cancel' : 'Add Page'}
                            </Button>
                        </View>

                        {configLoading ? (
                            <ActivityIndicator />
                        ) : (
                            <>
                                {/* Connected Pages List */}
                                {configs.length === 0 && !showAddForm && (
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No pages connected yet. Click "Add Page" to connect your Facebook page.</Text>
                                    </View>
                                )}
                                {configs.map((cfg, idx) => (
                                    <View key={cfg.id} style={[s.pageRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                                                {cfg.pageName || 'Unnamed Page'}
                                            </Text>
                                            <Text style={{ fontSize: 11, color: '#9CA3AF' }}>ID: {cfg.pageId}</Text>
                                        </View>

                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            {/* Active toggle */}
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                <Switch
                                                    value={cfg.isActive}
                                                    onValueChange={() => toggleConfigActive(cfg)}
                                                    trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                                                    thumbColor={cfg.isActive ? '#16A34A' : '#9CA3AF'}
                                                />
                                                <Text style={{ fontSize: 11, color: cfg.isActive ? '#16A34A' : '#9CA3AF' }}>
                                                    {cfg.isActive ? 'Active' : 'Inactive'}
                                                </Text>
                                            </View>

                                            {/* Import button */}
                                            <Button
                                                mode="outlined"
                                                icon="download"
                                                compact
                                                loading={importingPageId === cfg.pageId}
                                                disabled={!!importingPageId || !cfg.isActive}
                                                onPress={() => importForms(cfg.pageId)}
                                                style={{ borderColor: '#059669' }}
                                                textColor="#059669"
                                            >
                                                Import Forms
                                            </Button>

                                            {/* Delete */}
                                            <Pressable onPress={() => deleteConfig(cfg.id, cfg.pageName)} style={s.deleteBtn}>
                                                <Text style={{ color: '#EF4444', fontSize: 13 }}>✕</Text>
                                            </Pressable>
                                        </View>
                                    </View>
                                ))}

                                {/* Add Page Form */}
                                {showAddForm && (
                                    <View style={{ gap: 12, marginTop: 16, padding: 16, backgroundColor: '#F8FAFF', borderRadius: 12, borderWidth: 1, borderColor: '#DBEAFE' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 4 }}>➕ Add New Facebook Page</Text>
                                        <TextInput
                                            label="Page ID"
                                            value={configForm.pageId}
                                            onChangeText={v => setConfigForm(f => ({ ...f, pageId: v }))}
                                            mode="outlined"
                                            dense
                                            placeholder="e.g. 123456789012345"
                                            style={s.input}
                                        />
                                        <TextInput
                                            label="Page Name (optional)"
                                            value={configForm.pageName}
                                            onChangeText={v => setConfigForm(f => ({ ...f, pageName: v }))}
                                            mode="outlined"
                                            dense
                                            placeholder="e.g. Hair Originals India"
                                            style={s.input}
                                        />
                                        <TextInput
                                            label="Page Access Token"
                                            value={configForm.accessToken}
                                            onChangeText={v => setConfigForm(f => ({ ...f, accessToken: v }))}
                                            mode="outlined"
                                            dense
                                            placeholder="Paste long-lived page access token"
                                            secureTextEntry
                                            style={s.input}
                                        />
                                        <Button
                                            mode="contained"
                                            onPress={saveConfig}
                                            loading={configSaving}
                                            disabled={configSaving}
                                            style={{ alignSelf: 'flex-start' }}
                                            buttonColor="#1877F2"
                                        >
                                            Save & Connect
                                        </Button>
                                    </View>
                                )}
                            </>
                        )}
                    </Card.Content>
                </Card>

                {/* ── Section 2: Imported Forms ── */}
                <Card style={s.card}>
                    <Card.Content>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={s.sectionIcon}>📋</Text>
                                <Text style={s.sectionTitle}>Lead Forms</Text>
                                <View style={s.countBadge}>
                                    <Text style={s.countText}>{forms.length}</Text>
                                </View>
                            </View>
                            <Button
                                mode="contained"
                                icon="upload"
                                buttonColor="#059669"
                                compact
                                onPress={() => triggerFileInput('NEW')}
                            >
                                Upload New Form (CSV)
                            </Button>
                        </View>

                        {formsLoading ? (
                            <ActivityIndicator />
                        ) : forms.length === 0 ? (
                            <View style={{ padding: 30, alignItems: 'center' }}>
                                <Text style={{ color: '#9CA3AF', fontSize: 14 }}>
                                    No forms imported yet. Connect your Facebook page and click "Import from Facebook".
                                </Text>
                            </View>
                        ) : (
                            <ScrollView horizontal showsHorizontalScrollIndicator>
                                <View>
                                    {/* Table Header */}
                                    <View style={s.tableHeader}>
                                        <Text style={[s.headerText, { width: 220 }]}>Form Name</Text>
                                        <Text style={[s.headerText, { width: 100 }]}>Fields</Text>
                                        <Text style={[s.headerText, { width: 120 }]}>Leads Synced</Text>
                                        <Text style={[s.headerText, { width: 150 }]}>Last Synced</Text>
                                        <Text style={[s.headerText, { width: 90 }]}>Sync</Text>
                                        <Text style={[s.headerText, { width: 100 }]}>Mapped</Text>
                                        <Text style={[s.headerText, { width: 120 }]}>Actions</Text>
                                    </View>

                                    {/* Table Rows */}
                                    {forms.map((form, idx) => {
                                        const mappedCount = Object.values(form.fieldMapping ?? {}).filter(Boolean).length;
                                        const totalFields = (form.questions ?? []).length;

                                        return (
                                            <View key={form.id} style={[s.tableRow, idx % 2 === 1 && { backgroundColor: '#F9FAFB' }]}>
                                                <View style={{ width: 220, paddingRight: 12 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }} numberOfLines={2}>
                                                        {form.formName}
                                                    </Text>
                                                    <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>
                                                        ID: {form.fbFormId}
                                                    </Text>
                                                </View>

                                                <Text style={[s.cellText, { width: 100 }]}>{totalFields} fields</Text>

                                                <View style={{ width: 120 }}>
                                                    <Text style={[s.cellText, { fontWeight: '700', color: '#4F46E5' }]}>
                                                        {form.leadsSynced ?? 0}
                                                    </Text>
                                                </View>

                                                <Text style={[s.cellText, { width: 150, fontSize: 11 }]}>
                                                    {form.lastSyncedAt
                                                        ? new Date(form.lastSyncedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                        : 'Never'}
                                                </Text>

                                                <View style={{ width: 90, alignItems: 'center' }}>
                                                    <Switch
                                                        value={form.syncEnabled}
                                                        onValueChange={() => toggleSync(form)}
                                                        trackColor={{ false: '#D1D5DB', true: '#86EFAC' }}
                                                        thumbColor={form.syncEnabled ? '#16A34A' : '#9CA3AF'}
                                                    />
                                                </View>

                                                <View style={{ width: 100 }}>
                                                    <View style={{
                                                        backgroundColor: mappedCount === totalFields ? '#DCFCE7' : '#FEF3C7',
                                                        borderRadius: 10,
                                                        paddingHorizontal: 8,
                                                        paddingVertical: 2,
                                                        alignSelf: 'flex-start',
                                                    }}>
                                                        <Text style={{
                                                            fontSize: 11,
                                                            fontWeight: '700',
                                                            color: mappedCount === totalFields ? '#166534' : '#92400E',
                                                        }}>
                                                            {mappedCount}/{totalFields}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={{ width: 120, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                    <Pressable
                                                        onPress={() => openMapping(form)}
                                                        style={s.actionBtn}
                                                    >
                                                        <Text style={{ fontSize: 12, color: '#4F46E5', fontWeight: '600' }}>
                                                            🔗 Map
                                                        </Text>
                                                    </Pressable>
                                                    <Pressable
                                                        onPress={() => triggerFileInput(form.id)}
                                                        style={[s.actionBtn, { backgroundColor: '#F0FDF4' }]}
                                                    >
                                                        <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>
                                                            ⬆️ CSV
                                                        </Text>
                                                    </Pressable>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}
                    </Card.Content>
                </Card>

                {/* ── Webhook Info ── */}
                <Card style={[s.card, { backgroundColor: '#F0F9FF' }]}>
                    <Card.Content>
                        <Text style={{ fontWeight: '700', color: '#0369A1', marginBottom: 8 }}>🔔 Webhook URL (for Facebook App Settings)</Text>
                        <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#BAE6FD' }}>
                            <Text style={{ fontFamily: 'monospace', fontSize: 13, color: '#0C4A6E' }} selectable>
                                https://hairoriginals4u.com/api/v1/facebook/webhook
                            </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 8 }}>
                            Set this as the Callback URL in your Meta for Developers app → Webhooks → Page → leadgen
                        </Text>
                    </Card.Content>
                </Card>
            </ScrollView>

            {/* ── Field Mapping Modal ── */}
            <Portal>
                <Modal
                    visible={!!mappingForm}
                    onDismiss={() => setMappingForm(null)}
                    contentContainerStyle={s.modal}
                >
                    {mappingForm && (
                        <ScrollView>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                                🔗 Map Fields — {mappingForm.formName}
                            </Text>
                            <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>
                                Map each Facebook form field to the corresponding field in your lead system.
                            </Text>

                            <Divider style={{ marginBottom: 12 }} />

                            {/* Header */}
                            <View style={s.mapRow}>
                                <Text style={[s.mapLabel, { fontWeight: '700', color: '#6B7280', flex: 1 }]}>Facebook Field</Text>
                                <Text style={[s.mapLabel, { fontWeight: '700', color: '#6B7280', width: 40, textAlign: 'center' }]}>→</Text>
                                <Text style={[s.mapLabel, { fontWeight: '700', color: '#6B7280', flex: 1 }]}>Our Field</Text>
                            </View>

                            {(mappingForm.questions ?? []).map((q: any) => (
                                <View key={q.key} style={s.mapRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#111827' }}>{q.label || q.key}</Text>
                                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>type: {q.type} • key: {q.key}</Text>
                                    </View>
                                    <Text style={{ width: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 16 }}>→</Text>
                                    <View style={{ flex: 1 }}>
                                        <select
                                            value={mappingDraft[q.key] ?? ''}
                                            onChange={(e: any) => setMappingDraft(m => ({ ...m, [q.key]: e.target.value }))}
                                            style={{
                                                padding: 8,
                                                borderRadius: 8,
                                                border: '1px solid #D1D5DB',
                                                fontSize: 13,
                                                width: '100%',
                                                backgroundColor: mappingDraft[q.key] ? '#EEF2FF' : '#fff',
                                                color: mappingDraft[q.key] ? '#4338CA' : '#374151',
                                                fontWeight: mappingDraft[q.key] ? 600 : 400,
                                            }}
                                        >
                                            {LEAD_FIELDS.map(f => (
                                                <option key={f.key} value={f.key}>{f.label}</option>
                                            ))}
                                        </select>
                                    </View>
                                </View>
                            ))}

                            <Divider style={{ marginTop: 16, marginBottom: 16 }} />

                            <View style={{ flexDirection: 'row', gap: 12, justifyContent: 'flex-end' }}>
                                <Button mode="outlined" onPress={() => setMappingForm(null)}>
                                    Cancel
                                </Button>
                                <Button
                                    mode="contained"
                                    onPress={saveMapping}
                                    loading={mappingSaving}
                                    disabled={mappingSaving}
                                    buttonColor="#4F46E5"
                                >
                                    Save Mapping
                                </Button>
                            </View>
                        </ScrollView>
                    )}
                </Modal>
            </Portal>
        </AdminPageLayout>
    );
}

const s = StyleSheet.create({
    card: {
        borderRadius: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    sectionIcon: {
        fontSize: 20,
        marginRight: 8,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111827',
    },
    connectedBadge: {
        backgroundColor: '#DCFCE7',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 3,
        marginLeft: 12,
    },
    connectedText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#166534',
    },
    countBadge: {
        backgroundColor: '#EEF2FF',
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
        marginLeft: 8,
    },
    countText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#4F46E5',
    },
    input: {
        fontSize: 13,
        backgroundColor: '#fff',
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 4,
    },
    headerText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#374151',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    cellText: {
        fontSize: 13,
        color: '#374151',
    },
    actionBtn: {
        backgroundColor: '#EEF2FF',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 8,
        alignSelf: 'flex-start',
    },
    pageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: 12,
    },
    deleteBtn: {
        backgroundColor: '#FEF2F2',
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 40,
        maxHeight: '80%',
        maxWidth: 700,
        alignSelf: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
    },
    mapRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F9FAFB',
    },
    mapLabel: {
        fontSize: 13,
    },
});
