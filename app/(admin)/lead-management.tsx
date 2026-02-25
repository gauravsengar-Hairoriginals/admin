import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Platform,
} from 'react-native';
import {
    Text,
    Button,
    Searchbar,
    Card,
    IconButton,
    TextInput,
    ActivityIndicator,
    Portal,
    Modal,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';
import { useAuth } from '../../hooks/useAuth';

// ── Call status options ───────────────────────────────────────────────────────
const CALL_OPTIONS = [
    { label: 'RNR/Disconnect/Busy', value: 'RNR/Disconnect/Busy', color: '#7B1FA2', bg: '#F3E5F5' },
    { label: 'Callback', value: 'Requested callback', color: '#F57F17', bg: '#FFFDE7' },
    { label: 'Interested (NotSure)', value: 'Interested (NotSure)', color: '#0369A1', bg: '#E0F2FE' },
    { label: 'Interested', value: 'Interested', color: '#2E7D32', bg: '#E8F5E9' },
    { label: 'Wrong Number', value: 'Wrong Number', color: '#B71C1C', bg: '#FFEBEE' },
];
const callStyle = (val?: string) => CALL_OPTIONS.find(o => o.value === val) ?? { color: '#9E9E9E', bg: '#F5F5F5', label: '—' };

// ── Lead status options ────────────────────────────────────────────────────────
const LEAD_STATUS_OPTIONS = [
    { value: 'new', label: 'New', color: '#6366F1', bg: '#EEF2FF' },
    { value: 'contacted', label: 'Contacted', color: '#0369A1', bg: '#E0F2FE' },
    { value: 'converted:Marked to EC', label: 'Conv (EC)', color: '#16A34A', bg: '#F0FDF4' },
    { value: 'converted:Marked to HT', label: 'Conv (HT)', color: '#15803D', bg: '#DCFCE7' },
    { value: 'converted:Marked to VC', label: 'Conv (VC)', color: '#166534', bg: '#BBF7D0' },
    { value: 'dropped', label: 'Dropped', color: '#9CA3AF', bg: '#F3F4F6' },
];
const leadStatusStyle = (val?: string) =>
    LEAD_STATUS_OPTIONS.find(o => o.value === val) ?? { color: '#9E9E9E', bg: '#F5F5F5', label: val ?? '—' };

const EXPERIENCE_CENTERS = [
    'Mumbai - Andheri', 'Mumbai - Bandra',
    'Delhi - Saket', 'Delhi - Connaught Place',
    'Bangalore - Indiranagar', 'Bangalore - Koramangala',
    'Hyderabad - Banjara Hills', 'Chennai - Anna Nagar', 'Pune - Koregaon Park',
];



// ── Table columns ──────────────────────────────────────────────────────────────
const COLS = [
    { key: 'actions', label: '', width: 120 },
    { key: 'status', label: 'Status', width: 130 },
    { key: 'name', label: 'Name', width: 150 },
    { key: 'phone', label: 'Phone', width: 135 },
    { key: 'city', label: 'City', width: 100 },
    { key: 'source', label: 'Source', width: 120 },
    { key: 'callProgress', label: 'Call Progress', width: 210 },
    { key: 'nextActionDate', label: 'Next Action', width: 155 },
    { key: 'expCenter', label: 'Exp. Center', width: 155 },
    { key: 'appointmentBooked', label: 'Appt', width: 110 },
    { key: 'preferredProducts', label: 'Products', width: 180 },
];
const TOTAL_WIDTH = COLS.reduce((s, c) => s + c.width, 0);

// ── qkonnect Click-to-Call API ────────────────────────────────────────────────
const QKONNECT_API_KEY = '7b7dc644-cc09-4c4b-9232-007039ccba7c';

function CallConfirmModal({
    lead, agentPhone, onClose,
}: { lead: any; agentPhone: string; onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const customerPhone = lead?.customer?.phone ?? '';
    const canCall = !!agentPhone && !!customerPhone;

    const confirmCall = async () => {
        setLoading(true);
        setError('');
        try {
            // Step 1: create a pending call_log record in our DB
            try {
                await api.post('/call-logs/initiate', {
                    leadId: lead?.id,
                    customerId: lead?.customer?.id ?? lead?.customerId,
                    agentNumber: agentPhone,
                    callerNumber: customerPhone,
                });
            } catch (initErr) {
                console.warn('Failed to create call log record:', initErr);
                // Non-blocking: still proceed with the actual call
            }

            // Step 2: fire the qkonnect click-to-call API
            const url = `https://qkonnect.io/api/ctc-makecall-global.php` +
                `?api_key=${QKONNECT_API_KEY}` +
                `&call_priority=2` +
                `&agent=${encodeURIComponent(agentPhone)}` +
                `&caller=${encodeURIComponent(customerPhone)}` +
                `&custom_param_1=NA&custom_param_2=NA&custom_param_3=NA`;
            await fetch(url);
            setDone(true);
        } catch (e: any) {
            setError('Call initiation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Portal>
            <Modal
                visible
                onDismiss={onClose}
                contentContainerStyle={{
                    backgroundColor: '#fff', borderRadius: 16, padding: 24,
                    marginHorizontal: 40, alignSelf: 'center', maxWidth: 400, width: '100%',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>📞 Confirm Call</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Review the numbers before connecting.</Text>

                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, gap: 10, marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>From (Agent)</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: agentPhone ? '#111827' : '#EF4444' }}>
                            {agentPhone || '⚠️ No phone set on your profile'}
                        </Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>To (Customer)</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: customerPhone ? '#111827' : '#EF4444' }}>
                            {customerPhone || '⚠️ No phone on lead'}
                        </Text>
                    </View>
                    <View style={{ height: 1, backgroundColor: '#E5E7EB' }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#6B7280', fontWeight: '600' }}>Customer</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{lead?.customer?.name ?? '—'}</Text>
                    </View>
                </View>

                {error ? <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</Text> : null}

                {done ? (
                    <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#16A34A' }}>✅ Call initiated!</Text>
                        <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>Both phones will ring shortly.</Text>
                    </View>
                ) : (
                    <Button
                        mode="contained"
                        onPress={confirmCall}
                        loading={loading}
                        disabled={!canCall || loading}
                        style={{ borderRadius: 8, backgroundColor: canCall ? '#16A34A' : '#9CA3AF' }}
                        labelStyle={{ fontWeight: '700', fontSize: 14 }}
                    >
                        {canCall ? '📞 Confirm & Call' : 'Cannot call — check phone numbers'}
                    </Button>
                )}
                <Button onPress={onClose} style={{ marginTop: 8 }}>Close</Button>
            </Modal>
        </Portal>
    );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function CallBadge({ value }: { value?: string }) {
    const s = callStyle(value);
    return (
        <View style={[tbl.badge, { backgroundColor: s.bg }]}>
            <Text style={[tbl.badgeText, { color: s.color }]}>{value ?? '—'}</Text>
        </View>
    );
}

function BoolBadge({ value }: { value?: boolean | null }) {
    return (
        <View style={[tbl.badge, { backgroundColor: value ? '#E8F5E9' : '#F3F4F6' }]}>
            <Text style={[tbl.badgeText, { color: value ? '#2E7D32' : '#9E9E9E' }]}>{value ? 'Yes' : 'No'}</Text>
        </View>
    );
}

// Step bubbles: ① ② ③ with colours based on value
function CallProgressCell({ lead }: { lead: any }) {
    const steps = [
        { n: 1, val: lead.call1 },
        { n: 2, val: lead.call2 },
        { n: 3, val: lead.call3 },
    ];
    return (
        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {steps.map(({ n, val }) => {
                const s = callStyle(val);
                const locked = n === 2 ? !lead.call1 : n === 3 ? !lead.call2 : false;
                return (
                    <View key={n} style={{ alignItems: 'center', gap: 2 }}>
                        <View style={[
                            prog.bubble,
                            locked ? prog.locked : { backgroundColor: val ? s.bg : '#F3F4F6' },
                            val && { borderColor: s.color, borderWidth: 1.5 },
                        ]}>
                            <Text style={[prog.bubbleNum, { color: locked ? '#D1D5DB' : val ? s.color : '#9CA3AF' }]}>
                                {n}
                            </Text>
                        </View>
                        {val && !locked && (
                            <Text style={[prog.bubbleLabel, { color: s.color }]} numberOfLines={1}>
                                {val.length > 7 ? val.slice(0, 7) + '…' : val}
                            </Text>
                        )}
                    </View>
                );
            })}
        </View>
    );
}

function DatePickerInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    if (Platform.OS === 'web') {
        return (
            <View style={{ marginBottom: 14 }}>
                <Text style={md.label}>{label}</Text>
                {/* @ts-ignore */}
                <input
                    type="date"
                    value={value || ''}
                    onChange={(e: any) => onChange(e.target.value)}
                    style={{
                        border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '10px 12px',
                        fontSize: 14, width: '100%', outline: 'none', fontFamily: 'inherit',
                        color: value ? '#111827' : '#9E9E9E', backgroundColor: '#FFFFFF',
                        cursor: 'pointer', boxSizing: 'border-box',
                    }}
                />
            </View>
        );
    }
    return (
        <TextInput label={label} value={value} onChangeText={onChange} mode="outlined"
            placeholder="YYYY-MM-DD" style={{ marginBottom: 14 }} />
    );
}

// Datetime picker (date + time) — used for Next Action Date
function DateTimePickerInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    // Normalise any timestamp format → datetime-local value (YYYY-MM-DDTHH:mm local time)
    const toLocalDTInput = (v: string) => {
        if (!v) return '';
        const d = new Date(v);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const localValue = toLocalDTInput(value);
    if (Platform.OS === 'web') {
        return (
            <View style={{ marginBottom: 14 }}>
                <Text style={md.label}>{label}</Text>
                {/* @ts-ignore */}
                <input
                    type="datetime-local"
                    value={localValue}
                    onChange={(e: any) => onChange(e.target.value)}
                    style={{
                        border: '1.5px solid #D1D5DB', borderRadius: 8, padding: '10px 12px',
                        fontSize: 14, width: '100%', outline: 'none', fontFamily: 'inherit',
                        color: localValue ? '#111827' : '#9E9E9E', backgroundColor: '#FFFFFF',
                        cursor: 'pointer', boxSizing: 'border-box',
                    }}
                />
            </View>
        );
    }
    return (
        <TextInput label={label} value={value} onChangeText={onChange} mode="outlined"
            placeholder="YYYY-MM-DDTHH:mm" style={{ marginBottom: 14 }} />
    );
}

function CallSelector({ stepNum, label, value, onChange, locked }: {
    stepNum: number; label: string; value?: string;
    onChange: (v: string) => void; locked: boolean;
}) {
    const opt = CALL_OPTIONS.find(o => o.value === value);
    // "frozen" = locked because a later call was submitted (has a value)
    const frozen = locked && !!value;
    // "pending" = locked because previous step not done yet
    const pending = locked && !value;
    return (
        <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={[prog.bubble, { width: 24, height: 24, borderRadius: 12 },
                frozen
                    ? { backgroundColor: opt?.bg ?? '#F3F4F6', borderColor: opt?.color ?? '#9CA3AF', borderWidth: 1.5 }
                    : pending
                        ? prog.locked
                        : { backgroundColor: '#EEF2FF', borderColor: '#6366F1', borderWidth: 1.5 }
                ]}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: frozen ? (opt?.color ?? '#6B7280') : pending ? '#D1D5DB' : '#6366F1' }}>{stepNum}</Text>
                </View>
                <Text style={[md.label, { marginBottom: 0, color: pending ? '#D1D5DB' : '#374151' }]}>{label}</Text>
                {frozen && opt && (
                    <View style={{ backgroundColor: opt.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1.5, borderColor: opt.color }}>
                        <Text style={{ fontSize: 12, color: opt.color, fontWeight: '700' }}>{opt.label}</Text>
                    </View>
                )}
                {frozen && <Text style={{ fontSize: 10, color: '#9CA3AF' }}>· locked</Text>}
                {pending && <Text style={{ fontSize: 11, color: '#D1D5DB' }}>(complete previous step first)</Text>}
            </View>
            {!locked && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                        {CALL_OPTIONS.map(opt => (
                            <Pressable
                                key={opt.value}
                                onPress={() => onChange(opt.value)}
                                style={[md.chip, { backgroundColor: opt.bg, borderColor: value === opt.value ? opt.color : 'transparent', borderWidth: 2 }]}
                            >
                                <Text style={{ color: opt.color, fontSize: 12, fontWeight: '600' }}>{opt.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

// ── HistoryRow: single history entry card ─────────────────────────────────────
// Palette of distinct colors, one per episode (current lead first, then prior visits)
const EPISODE_PALETTE = [
    { color: '#6366F1', bg: '#EEF2FF', label: 'indigo' },
    { color: '#0369A1', bg: '#E0F2FE', label: 'blue' },
    { color: '#7C3AED', bg: '#F5F3FF', label: 'violet' },
    { color: '#0F766E', bg: '#F0FDFA', label: 'teal' },
    { color: '#B45309', bg: '#FEF3C7', label: 'amber' },
    { color: '#BE185D', bg: '#FDF2F8', label: 'pink' },
];

function HistoryRow({ item, accentColor = '#6366F1' }: { item: any; accentColor?: string }) {
    const name = item.changedBy?.name || item.changedByName || null;
    const email = item.changedBy?.email || item.changedByEmail || null;
    const displayName = name || email || 'System';

    return (
        <View style={{
            backgroundColor: '#F8FAFF', borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: '#E5E7EB',
            borderLeftWidth: 4, borderLeftColor: accentColor,
        }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
                <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: accentColor }}>
                        👤 {displayName}
                    </Text>
                    {email && name && (
                        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{email}</Text>
                    )}
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                    {new Date(item.changedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
                {item.fieldName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 12, color: '#B91C1C' }}>{item.oldValue || '(empty)'}</Text>
                </View>
                <Text style={{ fontSize: 14, color: '#9CA3AF' }}>→</Text>
                <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 12, color: '#065F46' }}>{item.newValue || '(empty)'}</Text>
                </View>
            </View>
        </View>
    );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function LeadManagementScreen() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'fresh' | 'reminder' | 'revisit' | 'converted' | 'dropped'>('all');
    const [products, setProducts] = useState<{ id: string; title: string; options: { name: string; values: string[] }[] }[]>([]);

    const [editTarget, setEditTarget] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [editLoading, setEditLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    // ── History ───────────────────────────────────────────────────────────
    const [historyLead, setHistoryLead] = useState<any>(null);
    const [callLead, setCallLead] = useState<any>(null);
    const { user } = useAuth();
    const [historyData, setHistoryData] = useState<{ currentLead: any; priorLeads: any[] } | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const openHistory = async (lead: any) => {
        setHistoryLead(lead);
        setHistoryData(null);
        setHistoryLoading(true);
        try {
            const res = await api.get(`/leads/${lead.id}/history`);
            setHistoryData(res.data ?? null);
        } catch (e) { console.error(e); }
        finally { setHistoryLoading(false); }
    };

    const loadLeads = useCallback(async (q = '') => {
        setLoading(true);
        try {
            const res = await api.get('/leads', { params: { search: q || undefined, limit: 100 } });
            setLeads(res.data.leads ?? res.data ?? []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { loadLeads(); }, []);

    useEffect(() => {
        api.get('/products', { params: { limit: 200 } })
            .then(res => {
                const list = res.data.products ?? res.data ?? [];
                setProducts(list.map((p: any) => ({ id: p.id, title: p.title, options: p.options ?? [] })));
            }).catch(() => { });
    }, []);

    const openEdit = (lead: any) => {
        setEditTarget(lead);
        setEditForm({
            // Customer-level fields (editable)
            name: lead.customer?.name ?? '',
            city: lead.customer?.city ?? '',
            address: lead.customer?.addressLine1 ?? '',
            pincode: lead.customer?.pincode ?? '',
            // Lead-record fields
            status: lead.status ?? '',
            call1: lead.call1 ?? '',
            call2: lead.call2 ?? '',
            call3: lead.call3 ?? '',
            nextActionDate: lead.nextActionDate ?? '',
            appointmentBooked: lead.appointmentBooked ?? false,
            bookedDate: lead.bookedDate ?? '',
            remarks: lead.remarks ?? '',
            preferredExperienceCenter: lead.preferredExperienceCenter ?? '',
            preferredProducts: lead.preferredProducts ?? [],
            preferredProductOptions: lead.preferredProductOptions ?? {},
        });
    };

    const saveEdit = async () => {
        if (!editTarget) return;
        setEditLoading(true);
        try {
            // Enforce sequential using the *already-saved* lead as baseline:
            // call2 requires call1 (saved OR just set); call3 requires call2 (saved OR just set)
            const raw: any = { ...editForm };
            const effectiveCall1 = raw.call1 || editTarget?.call1;
            const effectiveCall2 = raw.call2 || editTarget?.call2;
            if (!effectiveCall1) { raw.call2 = undefined; raw.call3 = undefined; }
            else if (!effectiveCall2) { raw.call3 = undefined; }

            // Strip empty strings & empty arrays so backend validators don't reject them
            const payload: any = {};
            for (const key of Object.keys(raw)) {
                const v = raw[key];
                if (v === '' || v === null) continue;              // skip empty strings / nulls
                if (Array.isArray(v) && v.length === 0) continue;  // skip empty arrays
                if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue; // skip empty objects
                payload[key] = v;
            }

            const res = await api.patch(`/leads/${editTarget.id}`, payload);
            setLeads(prev => prev.map(l => l.id === editTarget.id ? { ...l, ...res.data } : l));
            setEditTarget(null);
        } catch (err: any) {
            console.error('Save failed:', err?.response?.data ?? err);
        }
        finally { setEditLoading(false); }
    };

    const c = (lead: any) => lead?.customer ?? {};

    // ── Filter logic ─────────────────────────────────────────────────────────
    const today = new Date();
    today.setHours(23, 59, 59, 999); // end of today
    const CLOSED_STATUSES = ['dropped', 'converted:Marked to EC', 'converted:Marked to HT', 'converted:Marked to VC'];
    const isActive = (l: any) => !CLOSED_STATUSES.includes(l.status);

    const activeLeads = leads.filter(isActive);
    const freshLeads = activeLeads.filter(l => !l.call1);
    const reminderLeads = activeLeads.filter(l => {
        if (!l.nextActionDate) return false;
        const nad = new Date(l.nextActionDate);
        const updated = new Date(l.updatedAt);
        return nad <= today && updated < nad;
    });
    const revisitLeads = activeLeads.filter(l => l.isRevisit === true);
    const convertedLeads = leads.filter(l => (l.status ?? '').startsWith('converted:'));
    const droppedLeads = leads.filter(l => l.status === 'dropped');

    const filteredLeads =
        filter === 'fresh' ? freshLeads :
            filter === 'reminder' ? reminderLeads :
                filter === 'revisit' ? revisitLeads :
                    filter === 'converted' ? convertedLeads :
                        filter === 'dropped' ? droppedLeads :
                            activeLeads;  // 'all' → only active leads

    const FILTERS = [
        { key: 'all', label: 'All Leads', count: activeLeads.length, color: '#6366F1', bg: '#EEF2FF' },
        { key: 'fresh', label: 'Fresh', count: freshLeads.length, color: '#0369A1', bg: '#E0F2FE' },
        { key: 'reminder', label: '🔔 Reminder', count: reminderLeads.length, color: '#B45309', bg: '#FEF3C7' },
        { key: 'revisit', label: '🔄 Revisit', count: revisitLeads.length, color: '#7C3AED', bg: '#F5F3FF' },
        { key: 'converted', label: '✅ Converted', count: convertedLeads.length, color: '#16A34A', bg: '#F0FDF4' },
        { key: 'dropped', label: '🚫 Dropped', count: droppedLeads.length, color: '#9CA3AF', bg: '#F3F4F6' },
    ] as const;

    return (
        <AdminPageLayout>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>My Leads</Text>
                    <Text style={styles.headerSubtitle}>
                        {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (${filter})` : ''}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Searchbar
                        placeholder="Search name or phone…"
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={() => loadLeads(search)}
                        style={styles.searchBar}
                        inputStyle={{ minHeight: 0 }}
                    />
                    <Button mode="outlined" icon="refresh" onPress={() => loadLeads(search)} compact>
                        Refresh
                    </Button>
                </View>
            </View>

            {/* ── Filter Tabs ── */}
            <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 2, marginBottom: 12 }}>
                {FILTERS.map(f => (
                    <Pressable
                        key={f.key}
                        onPress={() => setFilter(f.key)}
                        style={[
                            {
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingHorizontal: 14, paddingVertical: 7,
                                borderRadius: 20, borderWidth: 1.5,
                                borderColor: filter === f.key ? f.color : '#E5E7EB',
                                backgroundColor: filter === f.key ? f.bg : '#fff',
                            },
                        ]}
                    >
                        <Text style={{ fontSize: 13, fontWeight: filter === f.key ? '700' : '500', color: filter === f.key ? f.color : '#6B7280' }}>
                            {f.label}
                        </Text>
                        <View style={{
                            backgroundColor: filter === f.key ? f.color : '#E5E7EB',
                            borderRadius: 10, minWidth: 20, height: 20,
                            alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
                        }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: filter === f.key ? '#fff' : '#6B7280' }}>{f.count}</Text>
                        </View>
                    </Pressable>
                ))}
            </View>

            {/* ── Table ── */}
            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 60 }} />
                ) : filteredLeads.length === 0 ? (
                    <View style={{ padding: 48, alignItems: 'center' }}>
                        <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>
                            {filter === 'fresh' ? '🎉 No fresh leads' : filter === 'reminder' ? '✅ No pending reminders' : 'No leads assigned to you yet.'}
                        </Text>
                    </View>
                ) : (
                    <ScrollView horizontal={TOTAL_WIDTH > 1200} showsHorizontalScrollIndicator>
                        <View style={{ minWidth: TOTAL_WIDTH }}>

                            {/* Header row */}
                            <View style={tbl.headerRow}>
                                {COLS.map(col => (
                                    <View key={col.key} style={[tbl.headerCell, { width: col.width }]}>
                                        <Text style={tbl.headerText}>{col.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Data rows */}
                            {filteredLeads.map((lead, idx) => (
                                <View key={lead.id} style={[tbl.row, idx % 2 === 1 && tbl.rowAlt]}>
                                    {/* Edit + History + Call buttons */}
                                    <View style={[tbl.cell, { width: 120, alignItems: 'center', flexDirection: 'row', gap: 0 }]}>
                                        <IconButton icon="pencil" size={18} onPress={() => openEdit(lead)}
                                            style={{ margin: 0 }} iconColor={Colors.primary} />
                                        <IconButton icon="history" size={18} onPress={() => openHistory(lead)}
                                            style={{ margin: 0 }} iconColor="#6B7280" />
                                        <IconButton icon="phone" size={18} onPress={() => setCallLead(lead)}
                                            style={{ margin: 0 }} iconColor="#16A34A" />
                                    </View>

                                    {/* Status */}
                                    <View style={[tbl.cell, { width: 130 }]}>
                                        {(() => {
                                            const s = leadStatusStyle(lead.status);
                                            return (
                                                <View style={[tbl.badge, { backgroundColor: s.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }]}>
                                                    <Text style={[tbl.badgeText, { color: s.color, fontWeight: '700' }]}>{s.label}</Text>
                                                </View>
                                            );
                                        })()}
                                    </View>

                                    <View style={[tbl.cell, { width: 150 }]}>
                                        <Text style={tbl.nameText} numberOfLines={2}>{c(lead).name || '—'}</Text>
                                    </View>
                                    <View style={[tbl.cell, { width: 135 }]}>
                                        <Text style={tbl.cellText}>{c(lead).phone || '—'}</Text>
                                    </View>
                                    <View style={[tbl.cell, { width: 100 }]}>
                                        <Text style={tbl.cellText}>{c(lead).city || '—'}</Text>
                                    </View>

                                    {/* Source */}
                                    <View style={[tbl.cell, { width: 120 }]}>
                                        {lead.source ? (
                                            <View style={[tbl.badge, { backgroundColor: '#EEF2FF', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }]}>
                                                <Text style={[tbl.badgeText, { color: '#4338CA', fontWeight: '600' }]} numberOfLines={1}>{lead.source}</Text>
                                            </View>
                                        ) : (
                                            <Text style={tbl.cellText}>—</Text>
                                        )}
                                    </View>

                                    {/* Call Progress */}
                                    <View style={[tbl.cell, { width: 210 }]}>
                                        <CallProgressCell lead={lead} />
                                    </View>

                                    {/* Next Action */}
                                    <View style={[tbl.cell, { width: 155 }]}>
                                        <Text style={tbl.cellText}>
                                            {lead.nextActionDate
                                                ? (() => {
                                                    const d = new Date(lead.nextActionDate);
                                                    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                                                        + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                                                })()
                                                : '—'}
                                        </Text>
                                    </View>

                                    {/* Exp. Center */}
                                    <View style={[tbl.cell, { width: 155 }]}>
                                        <Text style={tbl.cellText} numberOfLines={2}>{lead.preferredExperienceCenter || '—'}</Text>
                                    </View>

                                    {/* Appt */}
                                    <View style={[tbl.cell, { width: 110, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }]}>
                                        <BoolBadge value={lead.appointmentBooked} />
                                        {lead.bookedDate && (
                                            <Text style={{ fontSize: 11, color: '#374151' }}>📅 {lead.bookedDate}</Text>
                                        )}
                                    </View>

                                    {/* Products — last */}
                                    <View style={[tbl.cell, { width: 180, flexWrap: 'wrap', gap: 4 }]}>
                                        {lead.preferredProducts && lead.preferredProducts.length > 0
                                            ? lead.preferredProducts.map((p: string) => (
                                                <View key={p} style={{ marginBottom: 3 }}>
                                                    <View style={{ backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 2 }}>
                                                        <Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '600' }} numberOfLines={1}>{p}</Text>
                                                    </View>
                                                    {/* Show selected options below the product chip */}
                                                    {lead.preferredProductOptions?.[p] && Object.entries(lead.preferredProductOptions[p]).map(([optName, optVal]) => (
                                                        <View key={optName} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 4 }}>
                                                            <Text style={{ fontSize: 9, color: '#9CA3AF' }}>{optName}:</Text>
                                                            <View style={{ backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                                                                <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>{optVal as string}</Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                                </View>
                                            ))
                                            : <Text style={tbl.cellText}>—</Text>
                                        }
                                    </View>
                                </View>
                            ))}

                        </View>
                    </ScrollView>
                )
                }
            </Card >

            {/* ── Edit Modal ── */}
            < Portal >
                <Modal
                    visible={!!editTarget}
                    onDismiss={() => setEditTarget(null)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={md.title}>Update Lead</Text>
                        <Text style={md.subtitle}>{c(editTarget).name}  ·  {c(editTarget).phone}</Text>

                        {/* Cancel at the top */}
                        <View style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                            <Button onPress={() => setEditTarget(null)} icon="close">Close</Button>
                        </View>

                        {/* ── Campaign Info (read-only) ── */}
                        <View style={[md.section, { backgroundColor: '#F8FAFF', borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE', padding: 14, marginBottom: 14 }]}>
                            <Text style={[md.sectionTitle, { marginBottom: 10 }]}>🏷️ Campaign Info</Text>
                            <View style={{ gap: 8 }}>
                                {[
                                    { label: 'Source', value: editTarget?.source },
                                    { label: 'Page Type', value: editTarget?.pageType },
                                    { label: 'Campaign ID', value: editTarget?.campaignId },
                                ].map(({ label, value }) => (
                                    <View key={label} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                                        <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', width: 90 }}>{label}</Text>
                                        <Text style={{ fontSize: 13, color: value ? '#111827' : '#D1D5DB', flex: 1, fontWeight: value ? '600' : '400' }}>
                                            {value || '—'}
                                        </Text>
                                    </View>
                                ))}
                                {editTarget?.specificDetails && Object.keys(editTarget.specificDetails).length > 0 && (
                                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                                        <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', width: 90 }}>Extra Details</Text>
                                        <View style={{ flex: 1, gap: 4 }}>
                                            {Object.entries(editTarget.specificDetails).map(([k, v]) => (
                                                <Text key={k} style={{ fontSize: 12, color: '#374151' }}>
                                                    <Text style={{ fontWeight: '600' }}>{k}:</Text> {String(v)}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* ── Customer Info (Editable) ── */}
                        <View style={[md.section, { paddingVertical: 10 }]}>
                            <Text style={[md.sectionTitle, { marginBottom: 8 }]}>👤 Customer Info</Text>
                            {/* Full-width name */}
                            <TextInput
                                label="Full Name"
                                value={editForm.name}
                                onChangeText={v => setEditForm((f: any) => ({ ...f, name: v }))}
                                mode="outlined" dense
                                style={{ marginBottom: 8, fontSize: 13 }}
                            />
                            {/* City + Pincode side by side */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                <TextInput
                                    label="City"
                                    value={editForm.city}
                                    onChangeText={v => setEditForm((f: any) => ({ ...f, city: v }))}
                                    mode="outlined" dense
                                    style={{ flex: 1, fontSize: 13 }}
                                />
                                <TextInput
                                    label="Pincode"
                                    value={editForm.pincode}
                                    onChangeText={v => setEditForm((f: any) => ({ ...f, pincode: v }))}
                                    mode="outlined" dense keyboardType="numeric"
                                    style={{ width: 100, fontSize: 13 }}
                                />
                            </View>
                            {/* Address */}
                            <TextInput
                                label="Address"
                                value={editForm.address}
                                onChangeText={v => setEditForm((f: any) => ({ ...f, address: v }))}
                                mode="outlined" dense multiline numberOfLines={2}
                                style={{ fontSize: 13 }}
                            />
                        </View>

                        {/* ── Sequential Call Steps ── */}
                        <View style={md.section}>
                            <Text style={md.sectionTitle}>📞 Call Log</Text>
                            <CallSelector
                                stepNum={1} label="Call 1" value={editForm.call1} locked={!!editTarget?.call2}
                                onChange={v => setEditForm((f: any) => ({ ...f, call1: v }))}
                            />
                            <CallSelector
                                stepNum={2} label="Call 2" value={editForm.call2} locked={!editTarget?.call1 || !!editTarget?.call3}
                                onChange={v => setEditForm((f: any) => ({ ...f, call2: v }))}
                            />
                            <CallSelector
                                stepNum={3} label="Call 3" value={editForm.call3} locked={!editTarget?.call2}
                                onChange={v => setEditForm((f: any) => ({ ...f, call3: v }))}
                            />
                        </View>

                        {/* ── Scheduling ── */}
                        <View style={md.section}>
                            <Text style={md.sectionTitle}>📅 Next Action</Text>
                            <DateTimePickerInput label="Next Action Date & Time" value={editForm.nextActionDate}
                                onChange={v => setEditForm((f: any) => ({ ...f, nextActionDate: v }))} />
                        </View>

                        {/* ── Lead Status ── */}
                        <View style={md.section}>
                            <Text style={md.sectionTitle}>🟢 Lead Status</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {LEAD_STATUS_OPTIONS.map(opt => (
                                    <Pressable
                                        key={opt.value}
                                        onPress={() => setEditForm((f: any) => ({ ...f, status: opt.value }))}
                                        style={[md.chip, { backgroundColor: opt.bg, paddingHorizontal: 14, paddingVertical: 8 },
                                        editForm.status === opt.value && { borderColor: opt.color, borderWidth: 2.5 }]}
                                    >
                                        <Text style={{ color: opt.color, fontSize: 13, fontWeight: editForm.status === opt.value ? '700' : '500' }}>
                                            {opt.label}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* ── Appointment & Preferred Salon ── */}
                        <View style={md.section}>
                            <Text style={md.sectionTitle}>✅ Appointment & Preferred Salon</Text>

                            <Text style={md.label}>Appointment Booked</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                                {[true, false].map(val => (
                                    <Pressable key={String(val)}
                                        onPress={() => setEditForm((f: any) => ({ ...f, appointmentBooked: val }))}
                                        style={[md.toggleBtn, editForm.appointmentBooked === val && {
                                            backgroundColor: val ? '#E8F5E9' : '#FFEBEE',
                                            borderColor: val ? '#2E7D32' : '#E53935',
                                        }]}>
                                        <Text style={{ color: val ? '#2E7D32' : '#E53935', fontWeight: '600' }}>
                                            {val ? 'Yes' : 'No'}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <DatePickerInput label="Booked Date" value={editForm.bookedDate}
                                onChange={v => setEditForm((f: any) => ({ ...f, bookedDate: v }))} />

                            <Text style={[md.label, { marginTop: 6 }]}>Preferred Experience Center</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {EXPERIENCE_CENTERS.map(ec => (
                                        <Pressable key={ec}
                                            onPress={() => setEditForm((f: any) => ({ ...f, preferredExperienceCenter: ec }))}
                                            style={[md.chip, editForm.preferredExperienceCenter === ec && { backgroundColor: '#EEF2FF', borderColor: '#4338CA', borderWidth: 2 }]}>
                                            <Text style={{ color: editForm.preferredExperienceCenter === ec ? '#4338CA' : Colors.text, fontSize: 12 }}>{ec}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>
                        </View>

                        {/* ── Products & Remarks ── */}
                        <View style={md.section}>
                            <Text style={md.sectionTitle}>⭐ Products & Remarks</Text>

                            <Text style={md.label}>Add Products</Text>

                            {/* Search box */}
                            <View style={{ position: 'relative', marginBottom: 6 }}>
                                <TextInput
                                    mode="outlined"
                                    placeholder="Search products…"
                                    value={productSearch}
                                    onChangeText={setProductSearch}
                                    left={<TextInput.Icon icon="magnify" />}
                                    style={{ backgroundColor: '#fff' }}
                                    dense
                                />
                            </View>

                            {/* Dropdown results */}
                            {productSearch.trim().length > 0 && (() => {
                                const term = productSearch.toLowerCase();
                                const already: string[] = editForm.preferredProducts ?? [];
                                const hits = products.filter(p =>
                                    p.title.toLowerCase().includes(term) && !already.includes(p.title)
                                ).slice(0, 8);
                                if (hits.length === 0) return (
                                    <View style={{ padding: 10, backgroundColor: '#F9FAFB', borderRadius: 8, marginBottom: 10 }}>
                                        <Text style={{ color: Colors.textSecondary, fontSize: 13 }}>No products found</Text>
                                    </View>
                                );
                                return (
                                    <View style={{
                                        backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
                                        borderColor: '#E5E7EB', marginBottom: 10,
                                        shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, elevation: 3,
                                    }}>
                                        {hits.map((p, i) => (
                                            <Pressable key={p.id}
                                                onPress={() => {
                                                    setEditForm((f: any) => ({
                                                        ...f,
                                                        preferredProducts: [...(f.preferredProducts ?? []), p.title],
                                                    }));
                                                    setProductSearch('');
                                                }}
                                                style={[{
                                                    paddingHorizontal: 14, paddingVertical: 11,
                                                    borderBottomWidth: i < hits.length - 1 ? 1 : 0,
                                                    borderBottomColor: '#F3F4F6',
                                                }]}
                                            >
                                                <Text style={{ fontSize: 13, color: '#111827' }}>{p.title}</Text>
                                            </Pressable>
                                        ))}
                                    </View>
                                );
                            })()}

                            {/* Selected products as cards with options */}
                            {(editForm.preferredProducts ?? []).length > 0 && (
                                <View style={{ gap: 10, marginBottom: 6 }}>
                                    {(editForm.preferredProducts ?? []).map((title: string) => {
                                        const prod = products.find(p => p.title === title);
                                        return (
                                            <View key={title} style={{
                                                backgroundColor: '#F8F9FF', borderRadius: 10,
                                                borderWidth: 1.5, borderColor: '#C7D2FE',
                                                padding: 12,
                                            }}>
                                                {/* Product header row */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#3730A3', flex: 1, marginRight: 8 }} numberOfLines={2}>{title}</Text>
                                                    <Pressable
                                                        onPress={() => setEditForm((f: any) => {
                                                            const newProds = (f.preferredProducts ?? []).filter((x: string) => x !== title);
                                                            const newOpts = { ...(f.preferredProductOptions ?? {}) };
                                                            delete newOpts[title];
                                                            return { ...f, preferredProducts: newProds, preferredProductOptions: newOpts };
                                                        })}
                                                        style={{ padding: 4 }}
                                                    >
                                                        <Text style={{ fontSize: 16, color: '#EF4444', lineHeight: 18 }}>✕</Text>
                                                    </Pressable>
                                                </View>

                                                {/* Option selectors */}
                                                {prod?.options?.map((opt: { name: string; values: string[] }) => (
                                                    <View key={opt.name} style={{ marginBottom: 8 }}>
                                                        <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 5 }}>{opt.name}</Text>
                                                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                            <View style={{ flexDirection: 'row', gap: 6 }}>
                                                                {opt.values.map((val: string) => {
                                                                    const curOpts = editForm.preferredProductOptions ?? {};
                                                                    const isChosen = curOpts[title]?.[opt.name] === val;
                                                                    return (
                                                                        <Pressable key={val}
                                                                            onPress={() => setEditForm((f: any) => {
                                                                                const opts = { ...(f.preferredProductOptions ?? {}) };
                                                                                opts[title] = { ...(opts[title] ?? {}), [opt.name]: val };
                                                                                return { ...f, preferredProductOptions: opts };
                                                                            })}
                                                                            style={[md.chip,
                                                                            { paddingHorizontal: 10, paddingVertical: 4 },
                                                                            isChosen && { backgroundColor: '#F0FDF4', borderColor: '#16A34A', borderWidth: 2 },
                                                                            ]}>
                                                                            <Text style={{ fontSize: 11, color: isChosen ? '#15803D' : Colors.text, fontWeight: isChosen ? '700' : '400' }}>{val}</Text>
                                                                        </Pressable>
                                                                    );
                                                                })}
                                                            </View>
                                                        </ScrollView>
                                                    </View>
                                                ))}
                                                {(!prod?.options || prod.options.length === 0) && (
                                                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>No options available</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}

                            <TextInput label="Remarks" value={editForm.remarks}
                                onChangeText={v => setEditForm((f: any) => ({ ...f, remarks: v }))}
                                mode="outlined" multiline numberOfLines={3} style={{ marginBottom: 8 }} />
                        </View>

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                            <Button mode="contained" onPress={saveEdit} loading={editLoading}>Save Changes</Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal >

            {/* ── History Modal ── */}
            < Portal >
                <Modal
                    visible={!!historyLead}
                    onDismiss={() => setHistoryLead(null)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={md.title}>📋 Lead History</Text>
                        <Text style={md.subtitle}>
                            {historyLead?.customer?.name ?? 'Unknown'} · {historyLead?.customer?.phone}
                        </Text>

                        {historyLoading ? (
                            <ActivityIndicator style={{ marginVertical: 32 }} />
                        ) : !historyData ? (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>No changes recorded yet.</Text>
                                <Text style={{ color: Colors.textSecondary, fontSize: 12, marginTop: 6 }}>Changes appear here after the first edit.</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 16 }}>
                                {/* ── Current Lead Episode ── */}
                                <View style={{
                                    borderRadius: 12, overflow: 'hidden',
                                    borderWidth: 1.5, borderColor: EPISODE_PALETTE[0].color,
                                }}>
                                    <View style={{ backgroundColor: EPISODE_PALETTE[0].bg, paddingHorizontal: 14, paddingVertical: 10 }}>
                                        <Text style={{ fontSize: 13, fontWeight: '700', color: EPISODE_PALETTE[0].color }}>
                                            📌 This Lead
                                        </Text>
                                    </View>
                                    <View style={{ padding: 12 }}>
                                        {historyData.currentLead.history.length === 0 ? (
                                            <Text style={{ fontSize: 13, color: Colors.textSecondary, paddingLeft: 4 }}>No edits yet on this lead.</Text>
                                        ) : (
                                            <View style={{ gap: 8 }}>
                                                {historyData.currentLead.history.map((item: any) => (
                                                    <HistoryRow key={item.id} item={item} accentColor={EPISODE_PALETTE[0].color} />
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                </View>

                                {/* ── Prior Lead Episodes ── */}
                                {historyData.priorLeads.map((priorLead: any, idx: number) => {
                                    const palette = EPISODE_PALETTE[(idx + 1) % EPISODE_PALETTE.length];
                                    return (
                                        <View key={priorLead.id} style={{
                                            borderRadius: 12, overflow: 'hidden',
                                            borderWidth: 1.5, borderColor: palette.color,
                                        }}>
                                            <View style={{ backgroundColor: palette.bg, paddingHorizontal: 14, paddingVertical: 10 }}>
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: palette.color }}>
                                                    🔄 Previous Visit {historyData.priorLeads.length - idx} — {new Date(priorLead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </Text>
                                            </View>
                                            <View style={{ padding: 12 }}>
                                                {priorLead.history.length === 0 ? (
                                                    <Text style={{ fontSize: 13, color: Colors.textSecondary, paddingLeft: 4 }}>No edits recorded for this visit.</Text>
                                                ) : (
                                                    <View style={{ gap: 8 }}>
                                                        {priorLead.history.map((item: any) => (
                                                            <HistoryRow key={item.id} item={item} accentColor={palette.color} />
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
                            <Button onPress={() => setHistoryLead(null)}>Close</Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal >

            {/* ── Click-to-Call Confirmation Modal ── */}
            {callLead && (
                <CallConfirmModal
                    lead={callLead}
                    agentPhone={user?.phone ?? ''}
                    onClose={() => setCallLead(null)}
                />
            )}
        </AdminPageLayout >
    );
}

// ── Progress bubble styles ─────────────────────────────────────────────────────
const prog = StyleSheet.create({
    bubble: {
        width: 28, height: 28, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F3F4F6',
    },
    locked: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },
    bubbleNum: { fontSize: 13, fontWeight: '700' },
    bubbleLabel: { fontSize: 9, fontWeight: '600', textAlign: 'center', maxWidth: 40 },
});

// ── Table styles ───────────────────────────────────────────────────────────────
const tbl = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        backgroundColor: '#F0F4FF',
        borderBottomWidth: 2,
        borderBottomColor: '#D0D7F0',
        paddingVertical: 10,
    },
    headerCell: { paddingHorizontal: 10, justifyContent: 'center' },
    headerText: { fontWeight: '700', fontSize: 11, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 },
    row: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        minHeight: 54,
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    rowAlt: { backgroundColor: '#FAFBFF' },
    cell: { paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' },
    nameText: { fontWeight: '600', fontSize: 13, color: '#111827' },
    cellText: { fontSize: 13, color: '#374151' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
    badgeText: { fontSize: 11, fontWeight: '600' },
});

// ── Modal styles ───────────────────────────────────────────────────────────────
const md = StyleSheet.create({
    title: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 4 },
    subtitle: { fontSize: 13, color: Colors.textSecondary, marginBottom: 16 },
    section: {
        backgroundColor: '#F8FAFF',
        borderRadius: 10, padding: 14, marginBottom: 14,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
    chip: {
        paddingHorizontal: 12, paddingVertical: 7,
        borderRadius: 20, backgroundColor: '#F3F4F6',
        borderWidth: 1.5, borderColor: 'transparent',
    },
    toggleBtn: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 8, borderWidth: 1.5,
        borderColor: '#D1D5DB', backgroundColor: '#F9FAFB',
    },
});

// ── Screen styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    headerLeft: { flexDirection: 'column', justifyContent: 'center' },
    headerTitle: { fontWeight: '700', fontSize: 22, color: Colors.text, lineHeight: 28 },
    headerSubtitle: { color: Colors.textSecondary, fontSize: 13, marginTop: 2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    searchBar: { width: 280, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.border, elevation: 0, height: 44 },
    tableCard: { backgroundColor: Colors.surface, borderRadius: 10, overflow: 'hidden' },
    modal: {
        backgroundColor: 'white',
        padding: 24, margin: 20, borderRadius: 14,
        maxWidth: 640, alignSelf: 'center', width: '100%', maxHeight: '90%',
    },
});
