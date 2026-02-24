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

// ── Call status options ───────────────────────────────────────────────────────
const CALL_OPTIONS = [
    { label: 'RNR', value: 'RNR', color: '#7B1FA2', bg: '#F3E5F5' },
    { label: 'Disconnect', value: 'Disconnect', color: '#1565C0', bg: '#E3F2FD' },
    { label: 'Callback', value: 'Requested callback', color: '#F57F17', bg: '#FFFDE7' },
    { label: 'Not Interested', value: 'Not Interested', color: '#616161', bg: '#F5F5F5' },
    { label: 'Interested', value: 'Interested', color: '#2E7D32', bg: '#E8F5E9' },
    { label: 'Not reachable', value: 'Not reachable', color: '#757575', bg: '#FAFAFA' },
    { label: 'Busy', value: 'Busy', color: '#E65100', bg: '#FFF3E0' },
    { label: 'Switch off', value: 'Switch off', color: '#B71C1C', bg: '#FFEBEE' },
];
const callStyle = (val?: string) => CALL_OPTIONS.find(o => o.value === val) ?? { color: '#9E9E9E', bg: '#F5F5F5', label: '—' };

const EXPERIENCE_CENTERS = [
    'Mumbai - Andheri', 'Mumbai - Bandra',
    'Delhi - Saket', 'Delhi - Connaught Place',
    'Bangalore - Indiranagar', 'Bangalore - Koramangala',
    'Hyderabad - Banjara Hills', 'Chennai - Anna Nagar', 'Pune - Koregaon Park',
];

const TIME_SLOTS = ['Morning 10am–1pm', 'Afternoon 1pm–4pm', 'Evening 4pm–7pm'];

// ── Table columns (compact no-scroll layout) ──────────────────────────────────
const COLS = [
    { key: 'actions', label: '', width: 56 },
    { key: 'name', label: 'Name', width: 150 },
    { key: 'phone', label: 'Phone', width: 135 },
    { key: 'city', label: 'City', width: 100 },
    { key: 'callProgress', label: 'Call Progress', width: 210 },
    { key: 'scheduled', label: 'Scheduled', width: 140 },
    { key: 'nextActionDate', label: 'Next Action', width: 120 },
    { key: 'expCenter', label: 'Exp. Center', width: 155 },
    { key: 'appointmentBooked', label: 'Appt', width: 110 },
    { key: 'preferredProducts', label: 'Products', width: 180 },
];
const TOTAL_WIDTH = COLS.reduce((s, c) => s + c.width, 0);

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

// ── Main screen ───────────────────────────────────────────────────────────────
export default function LeadManagementScreen() {
    const [leads, setLeads] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'fresh' | 'reminder'>('all');
    const [products, setProducts] = useState<{ id: string; title: string; options: { name: string; values: string[] }[] }[]>([]);

    const [editTarget, setEditTarget] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [editLoading, setEditLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');

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
            call1: lead.call1 ?? '',
            call2: lead.call2 ?? '',
            call3: lead.call3 ?? '',
            scheduled: lead.scheduled ?? false,
            selectedDate: lead.selectedDate ?? '',
            timeSlot: lead.timeSlot ?? '',
            appointmentBooked: lead.appointmentBooked ?? false,
            bookedDate: lead.bookedDate ?? '',
            remarks: lead.remarks ?? '',
            preferredExperienceCenter: lead.preferredExperienceCenter ?? '',
            nextActionDate: lead.nextActionDate ?? '',
            preferredProducts: lead.preferredProducts ?? [],
            preferredProductOptions: lead.preferredProductOptions ?? {},
        });
    };

    const saveEdit = async () => {
        if (!editTarget) return;
        setEditLoading(true);
        try {
            // Enforce sequential: if call1 is cleared, also clear call2 & call3
            const raw: any = { ...editForm };
            if (!raw.call1) { raw.call2 = undefined; raw.call3 = undefined; }
            else if (!raw.call2) { raw.call3 = undefined; }

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

    const freshLeads = leads.filter(l => !l.call1);
    const reminderLeads = leads.filter(l => {
        if (!l.nextActionDate) return false;
        const nad = new Date(l.nextActionDate);
        const updated = new Date(l.updatedAt);
        return nad <= today && updated < nad;
    });

    const filteredLeads =
        filter === 'fresh' ? freshLeads :
            filter === 'reminder' ? reminderLeads :
                leads;

    const FILTERS = [
        { key: 'all', label: 'All Leads', count: leads.length, color: '#6366F1', bg: '#EEF2FF' },
        { key: 'fresh', label: 'Fresh', count: freshLeads.length, color: '#0369A1', bg: '#E0F2FE' },
        { key: 'reminder', label: '🔔 Reminder', count: reminderLeads.length, color: '#B45309', bg: '#FEF3C7' },
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
                                    {/* Edit */}
                                    <View style={[tbl.cell, { width: 56, alignItems: 'center' }]}>
                                        <IconButton icon="pencil" size={18} onPress={() => openEdit(lead)}
                                            style={{ margin: 0 }} iconColor={Colors.primary} />
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

                                    {/* Call Progress */}
                                    <View style={[tbl.cell, { width: 210 }]}>
                                        <CallProgressCell lead={lead} />
                                    </View>

                                    {/* Scheduled */}
                                    <View style={[tbl.cell, { width: 140, flexDirection: 'column', alignItems: 'flex-start', gap: 3 }]}>
                                        <BoolBadge value={lead.scheduled} />
                                        {lead.selectedDate && (
                                            <Text style={{ fontSize: 11, color: '#374151' }}>📅 {lead.selectedDate}</Text>
                                        )}
                                        {lead.timeSlot && (
                                            <Text style={{ fontSize: 11, color: '#6366F1' }}>🕐 {lead.timeSlot}</Text>
                                        )}
                                    </View>

                                    {/* Next Action */}
                                    <View style={[tbl.cell, { width: 120 }]}>
                                        <Text style={tbl.cellText}>{lead.nextActionDate || '—'}</Text>
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
                )}
            </Card>

            {/* ── Edit Modal ── */}
            <Portal>
                <Modal
                    visible={!!editTarget}
                    onDismiss={() => setEditTarget(null)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={md.title}>Update Lead</Text>
                        <Text style={md.subtitle}>{c(editTarget).name}  ·  {c(editTarget).phone}</Text>

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
                            <Text style={md.sectionTitle}>📅 Scheduling</Text>

                            <Text style={md.label}>Schedule</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                                {[true, false].map(val => (
                                    <Pressable key={String(val)}
                                        onPress={() => setEditForm((f: any) => ({ ...f, scheduled: val }))}
                                        style={[md.toggleBtn, editForm.scheduled === val && {
                                            backgroundColor: val ? '#E8F5E9' : '#FFEBEE',
                                            borderColor: val ? '#2E7D32' : '#E53935',
                                        }]}>
                                        <Text style={{ color: val ? '#2E7D32' : '#E53935', fontWeight: '600' }}>
                                            {val ? 'Yes' : 'No'}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>

                            <DatePickerInput label="Selected Date" value={editForm.selectedDate}
                                onChange={v => setEditForm((f: any) => ({ ...f, selectedDate: v }))} />

                            <Text style={md.label}>Time Slot</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                                {TIME_SLOTS.map(ts => (
                                    <Pressable key={ts}
                                        onPress={() => setEditForm((f: any) => ({ ...f, timeSlot: ts }))}
                                        style={[md.toggleBtn, editForm.timeSlot === ts && { backgroundColor: '#E3F2FD', borderColor: '#1565C0' }]}>
                                        <Text style={{ color: editForm.timeSlot === ts ? '#1565C0' : Colors.text, fontSize: 13 }}>{ts}</Text>
                                    </Pressable>
                                ))}
                            </View>

                            <DatePickerInput label="Next Action Date" value={editForm.nextActionDate}
                                onChange={v => setEditForm((f: any) => ({ ...f, nextActionDate: v }))} />
                        </View>

                        {/* ── Appointment ── */}
                        <View style={md.section}>
                            <Text style={md.sectionTitle}>✅ Appointment</Text>

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
                        </View>

                        {/* ── Preferences ── */}
                        <View style={md.section}>
                            <Text style={md.sectionTitle}>⭐ Preferences</Text>

                            <Text style={md.label}>Preferred Experience Center</Text>
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
                            <Button onPress={() => setEditTarget(null)}>Cancel</Button>
                            <Button mode="contained" onPress={saveEdit} loading={editLoading}>Save Changes</Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>
        </AdminPageLayout>
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
