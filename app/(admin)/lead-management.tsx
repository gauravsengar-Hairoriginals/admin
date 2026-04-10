import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Platform,
    TextInput as RNTextInput,
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
    Chip,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';
import { useAuth } from '../../hooks/useAuth';
import { useEcBooking } from '../../hooks/useEcBooking';

// ── Call status options ───────────────────────────────────────────────────────
const CALL_OPTIONS = [
    { label: 'RNR/Disconnect/Busy', value: 'RNR/Disconnect/Busy', color: '#7B1FA2', bg: '#F3E5F5' },
    { label: 'Callback', value: 'Requested callback', color: '#F57F17', bg: '#FFFDE7' },
    { label: 'Interested (NotSure)', value: 'Interested (NotSure)', color: '#0369A1', bg: '#E0F2FE' },
    { label: 'Not Interested', value: 'Not Interested', color: '#B71C1C', bg: '#FFEBEE' },
    { label: 'Interested', value: 'Interested', color: '#2E7D32', bg: '#E8F5E9' },
    { label: 'Wrong Number', value: 'Wrong Number', color: '#B71C1C', bg: '#FFEBEE' },
];
const callStyle = (val?: string) => CALL_OPTIONS.find(o => o.value === val) ?? { color: '#9E9E9E', bg: '#F5F5F5', label: '—' };

// ── Lead status options ────────────────────────────────────────────────────────
const LEAD_STATUS_OPTIONS = [
    { value: 'new', label: 'New', color: '#6366F1', bg: '#EEF2FF' },
    { value: 'contacted', label: 'Contacted', color: '#0369A1', bg: '#E0F2FE' },
    { value: 'converted:Marked to EC', label: 'Booked (EC)', color: '#16A34A', bg: '#F0FDF4' },
    { value: 'converted:Marked to HT', label: 'Booked (HT)', color: '#15803D', bg: '#DCFCE7' },
    { value: 'converted:Marked to VC', label: 'Booked (VC)', color: '#166534', bg: '#BBF7D0' },
    { value: 'dropped', label: 'Dropped', color: '#9CA3AF', bg: '#F3F4F6' },
];
const leadStatusStyle = (val?: string) =>
    LEAD_STATUS_OPTIONS.find(o => o.value === val) ?? { color: '#9E9E9E', bg: '#F5F5F5', label: val ?? '—' };

// ── Table columns ──────────────────────────────────────────────────────────────
const COLS = [
    { key: 'actions', label: '', width: 155 },
    { key: 'aging', label: 'Aging', width: 80 },
    { key: 'status', label: 'Status', width: 130 },
    { key: 'name', label: 'Name', width: 150 },
    { key: 'phone', label: 'Phone', width: 135 },
    { key: 'city', label: 'City', width: 100 },
    { key: 'leadCategory', label: 'Category', width: 110 },
    { key: 'source', label: 'Source', width: 120 },
    { key: 'assignedTo', label: 'Assigned To', width: 140 },
    { key: 'callProgress', label: 'Call Progress', width: 210 },
    { key: 'nextActionDate', label: 'Next Action', width: 155 },
    { key: 'expCenter', label: 'Exp. Center', width: 155 },
    { key: 'appointmentBooked', label: 'Appt', width: 110 },
    { key: 'preferredProducts', label: 'Products', width: 180 },
    { key: 'consultationType', label: 'Consultation', width: 155 },
];
const TOTAL_WIDTH = COLS.reduce((s, c) => s + c.width, 0);

const LEAD_CATEGORY_STYLES: Record<string, { bg: string; color: string }> = {
    EC: { bg: '#DBEAFE', color: '#1D4ED8' },
    HT: { bg: '#D1FAE5', color: '#065F46' },
    WEBSITE: { bg: '#EDE9FE', color: '#5B21B6' },
    POPIN: { bg: '#FEF3C7', color: '#92400E' },
};
const leadCategoryStyle = (cat?: string) => cat ? (LEAD_CATEGORY_STYLES[cat] ?? { bg: '#F3F4F6', color: '#6B7280' }) : { bg: '#F3F4F6', color: '#6B7280' };

// ── qkonnect Click-to-Call API ────────────────────────────────────────────────
const QKONNECT_API_KEY = '7b7dc644-cc09-4c4b-9232-007039ccba7c';
//const QKONNECT_API_KEY = '6340a658-13d3-11f1-bec8-6045bdaaffcb';
// ── Add New Lead Modal ───────────────────────────────────────────────────────
function AddLeadModal({ visible, onClose, onDone }: { visible: boolean; onClose: () => void; onDone: () => void }) {
    const [form, setForm] = useState({ name: '', phone: '', city: '', source: '', notes: '', assignedToId: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [callers, setCallers] = useState<any[]>([]);

    useEffect(() => {
        if (visible) {
            api.get('/admin/lead-callers', { params: { activeOnly: true } })
                .then(res => setCallers(Array.isArray(res.data) ? res.data : []))
                .catch(err => console.log('Failed to load callers:', err));
        }
    }, [visible]);

    const handleSave = async () => {
        if (!form.phone.trim()) { setError('Phone number is required.'); return; }
        if (!/^[0-9]{10}$/.test(form.phone.replace(/\D/g, '').slice(-10))) {
            setError('Please enter a valid 10-digit mobile number.'); return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post('/leads', {
                name: form.name.trim() || undefined,
                phone: form.phone.trim(),
                city: form.city.trim() || undefined,
                source: form.source.trim() || 'Manual Entry',
                notes: form.notes.trim() || undefined,
                assignedToId: form.assignedToId || undefined,
            });
            setForm({ name: '', phone: '', city: '', source: '', notes: '', assignedToId: '' });
            onDone();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Failed to create lead.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setForm({ name: '', phone: '', city: '', source: '', notes: '', assignedToId: '' });
        setError('');
        setLoading(false);
        onClose();
    };

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={handleClose}
                contentContainerStyle={{
                    backgroundColor: '#fff', borderRadius: 16, padding: 28,
                    marginHorizontal: 40, alignSelf: 'center', maxWidth: 480, width: '100%',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 }}>➕ Add New Lead</Text>

                <TextInput label="Phone *" value={form.phone} onChangeText={v => setForm(f => ({ ...f, phone: v }))} mode="outlined" keyboardType="phone-pad" style={{ marginBottom: 12 }} />
                <TextInput label="Name" value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} mode="outlined" style={{ marginBottom: 12 }} />
                <TextInput label="City" value={form.city} onChangeText={v => setForm(f => ({ ...f, city: v }))} mode="outlined" style={{ marginBottom: 12 }} />
                <TextInput label="Source" value={form.source} onChangeText={v => setForm(f => ({ ...f, source: v }))} mode="outlined" placeholder="e.g. Walk-in, Referral" style={{ marginBottom: 12 }} />
                <TextInput label="Notes" value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} mode="outlined" multiline numberOfLines={3} style={{ marginBottom: 16 }} />

                <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6, marginLeft: 4 }}>Assign To (Optional)</Text>
                    <View style={{ borderWidth: 1, borderColor: '#79747E', borderRadius: 4, overflow: 'hidden' }}>
                        {/* @ts-ignore */}
                        <select
                            value={form.assignedToId}
                            onChange={(e: any) => setForm(f => ({ ...f, assignedToId: e.target.value }))}
                            style={{
                                width: '100%', padding: 12, borderWidth: 0,
                                backgroundColor: '#fff', fontSize: 16, color: '#1C1B1F',
                                outline: 'none'
                            }}
                        >
                            <option value="">Unassigned (Auto-assign)</option>
                            {callers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </View>
                </View>

                {!!error && <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</Text>}

                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                    <Button mode="outlined" onPress={handleClose} disabled={loading}>Cancel</Button>
                    <Button mode="contained" buttonColor="#4F46E5" textColor="#fff" onPress={handleSave} loading={loading} disabled={loading} style={{ borderRadius: 8 }}>
                        Create Lead
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

// ── ReassignLeadModal ─────────────────────────────────────────────────────────
function ReassignLeadModal({
    lead, visible, onClose, onDone,
}: { lead: any; visible: boolean; onClose: () => void; onDone: () => void }) {
    const [callers, setCallers]   = useState<any[]>([]);
    const [targetId, setTargetId] = useState('');
    const [saving, setSaving]     = useState(false);
    const [error, setError]       = useState('');

    useEffect(() => {
        if (visible) {
            setTargetId(lead?.assignedToId ?? '');
            setError('');
            api.get('/admin/lead-callers', { params: { activeOnly: true } })
                .then(res => setCallers(Array.isArray(res.data) ? res.data : []))
                .catch(() => {});
        }
    }, [visible, lead]);

    const handleSave = async () => {
        if (!targetId) { setError('Please select a caller.'); return; }
        setSaving(true);
        setError('');
        try {
            await api.patch(`/leads/${lead.id}`, { assignedToId: targetId });
            onDone();
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Failed to reassign.');
        } finally {
            setSaving(false);
        }
    };

    const currentCaller = callers.find(c => c.id === lead?.assignedToId);

    return (
        <Portal>
            <Modal
                visible={visible}
                onDismiss={onClose}
                contentContainerStyle={{
                    backgroundColor: '#fff', borderRadius: 16, padding: 24,
                    marginHorizontal: 40, alignSelf: 'center', maxWidth: 420, width: '100%',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
                }}
            >
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>🔁 Reassign Lead</Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
                    {lead?.customer?.name ?? 'Unknown'} · {lead?.customer?.phone ?? ''}
                </Text>

                {currentCaller && (
                    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 12, color: '#92400E' }}>Currently assigned to</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#92400E' }}>{currentCaller.name}</Text>
                    </View>
                )}

                <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>Assign to</Text>
                <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
                    {/* @ts-ignore */}
                    <select
                        value={targetId}
                        onChange={(e: any) => setTargetId(e.target.value)}
                        style={{
                            width: '100%', padding: 12, border: 'none',
                            backgroundColor: '#fff', fontSize: 14, color: '#1C1B1F',
                            outline: 'none',
                        }}
                    >
                        <option value="">— Select caller —</option>
                        {callers.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </View>

                {!!error && <Text style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{error}</Text>}

                <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }}>
                    <Button mode="outlined" onPress={onClose} disabled={saving}>Cancel</Button>
                    <Button
                        mode="contained" buttonColor="#6366F1" textColor="#fff"
                        onPress={handleSave} loading={saving} disabled={saving || !targetId}
                        style={{ borderRadius: 8 }} icon="account-arrow-right"
                    >
                        Reassign
                    </Button>
                </View>
            </Modal>
        </Portal>
    );
}

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
            const to10 = (phone: string) => phone.replace(/\D/g, '').slice(-10);
            const url = `https://qkonnect.io/api/ctc-makecall-global.php` +
                `?api_key=${QKONNECT_API_KEY}` +
                `&call_priority=2` +
                `&agent=${encodeURIComponent(to10(agentPhone))}` +
                `&caller=${encodeURIComponent(to10(customerPhone))}` +
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

// ── Accordion Episode: summary header + expandable detail rows ────────────────
function AccordionEpisode({ title, emoji, history, palette, status, defaultOpen = false }: {
    title: string; emoji: string; history: any[]; status?: string;
    palette: { color: string; bg: string }; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    const count = history.length;
    return (
        <View style={{
            borderRadius: 12, overflow: 'hidden',
            borderWidth: 1.5, borderColor: palette.color,
        }}>
            <Pressable
                onPress={() => setOpen(o => !o)}
                style={{
                    backgroundColor: palette.bg, paddingHorizontal: 14, paddingVertical: 12,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: palette.color }}>
                        {emoji} {title}
                    </Text>
                    <View style={{
                        backgroundColor: palette.color, borderRadius: 10,
                        minWidth: 22, height: 20, alignItems: 'center', justifyContent: 'center',
                        paddingHorizontal: 6,
                    }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>
                            {count}
                        </Text>
                    </View>
                    {status && (() => {
                        const s = LEAD_STATUS_OPTIONS.find(o => o.value === status) ?? { label: status, color: '#6B7280', bg: '#F3F4F6' };
                        return (
                            <View style={{
                                backgroundColor: s.bg, borderRadius: 8,
                                paddingHorizontal: 8, paddingVertical: 3,
                                borderWidth: 1, borderColor: s.color,
                            }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: s.color }}>{s.label}</Text>
                            </View>
                        );
                    })()}
                </View>
                <Text style={{ fontSize: 16, color: palette.color }}>
                    {open ? '▲' : '▼'}
                </Text>
            </Pressable>

            {/* Summary line always visible: latest change preview */}
            {!open && count > 0 && (
                <View style={{ paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#FAFBFF' }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }} numberOfLines={1}>
                        Latest: <Text style={{ fontWeight: '600', color: '#374151' }}>{history[0]?.fieldName}</Text>
                        {' '}→ {history[0]?.newValue || '(empty)'}
                        {count > 1 ? `  ·  +${count - 1} more` : ''}
                    </Text>
                </View>
            )}

            {open && (
                <View style={{ padding: 12 }}>
                    {count === 0 ? (
                        <Text style={{ fontSize: 13, color: Colors.textSecondary, paddingLeft: 4 }}>No edits recorded.</Text>
                    ) : (
                        <View style={{ gap: 8 }}>
                            {history.map((item: any) => (
                                <HistoryRow key={item.id} item={item} accentColor={palette.color} />
                            ))}
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

function HistoryAccordionView({ historyData }: { historyData: { currentLead: any; priorLeads: any[] } }) {
    return (
        <View style={{ gap: 16 }}>
            {/* Current lead — expanded by default */}
            <AccordionEpisode
                emoji="📌"
                title="This Lead"
                history={historyData.currentLead.history}
                palette={EPISODE_PALETTE[0]}
                status={historyData.currentLead.status}
                defaultOpen={false}
            />

            {/* Prior visits — collapsed by default */}
            {historyData.priorLeads.map((priorLead: any, idx: number) => {
                const palette = EPISODE_PALETTE[(idx + 1) % EPISODE_PALETTE.length];
                const dateStr = new Date(priorLead.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                return (
                    <AccordionEpisode
                        key={priorLead.id}
                        emoji="🔄"
                        title={`Previous Visit ${historyData.priorLeads.length - idx} — ${dateStr}`}
                        history={priorLead.history}
                        palette={palette}
                        status={priorLead.status}
                        defaultOpen={false}
                    />
                );
            })}
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
    const [experienceCenters, setExperienceCenters] = useState<any[]>([]);
    const [fieldAgents, setFieldAgents] = useState<any[]>([]);

    // ── Pagination & API counts ──────────────────────────────────────────
    const LIMIT = 20;
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [tabCounts, setTabCounts] = useState<Record<string, number>>({});

    // ── Per-column filters ────────────────────────────────────────────────
    const [colFilters, setColFilters] = useState<Record<string, string>>({});
    const [categoryFilter, setCategoryFilter] = useState('');
    const [priorityFilter, setPriorityFilter] = useState(false);
    const [unassignedFilter, setUnassignedFilter] = useState(false);
    const [agingSort, setAgingSort] = useState<'none' | 'asc' | 'desc'>('none');
    const [expandedRevisitGroups, setExpandedRevisitGroups] = useState<Set<string>>(new Set());
    const [exportFrom, setExportFrom] = useState('');
    const [exportTo, setExportTo] = useState('');

    const [editTarget, setEditTarget] = useState<any>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [editLoading, setEditLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [callLogs, setCallLogs] = useState<any[]>([]);
    const [callLogsLoading, setCallLogsLoading] = useState(false);

    // ── EC Booking hook (DINGG) ───────────────────────────────────────────────
    const booking = useEcBooking();

    // ── Priority filter ───────────────────────────────────────────────────────

    // ── Add Lead modal ────────────────────────────────────────────────────────
    const [addLeadVisible, setAddLeadVisible] = useState(false);

    // ── Reassign Lead ─────────────────────────────────────────────────────
    const [reassignLead, setReassignLead] = useState<any>(null);

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

    const loadLeads = useCallback(async (p = 1, q = search) => {
        setLoading(true);
        try {
            const res = await api.get('/leads', {
                params: {
                    search: q || undefined,
                    page: p,
                    limit: LIMIT,
                    tab: filter,
                    name: colFilters.name || undefined,
                    phone: colFilters.phone || undefined,
                    city: colFilters.city || undefined,
                    source: colFilters.source || undefined,
                    campaign: colFilters.campaign || undefined,
                    status: colFilters.status || undefined,
                    assignedTo: colFilters.assignedTo || undefined,
                    leadCategory: categoryFilter || undefined,
                    isHighPriority: priorityFilter ? 'true' : undefined,
                    isUnassigned: unassignedFilter ? 'true' : undefined,
                    agingSort: agingSort !== 'none' ? agingSort : undefined,
                    agingDays: colFilters.aging ? parseInt(colFilters.aging, 10) : undefined,
                    deduplicateByPhone: true,
                }
            });
            setLeads(res.data.leads ?? res.data ?? []);
            setTotal(res.data.total ?? 0);
            setPage(p);

            const countsRes = await api.get('/leads/counts');
            setTabCounts(countsRes.data ?? {});
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [search, filter, colFilters, categoryFilter, priorityFilter, unassignedFilter, agingSort]);

    // Apply filters instantly with a small debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            loadLeads(1);
        }, 300);
        return () => clearTimeout(timer);
    }, [colFilters, filter, search, categoryFilter, priorityFilter, unassignedFilter, agingSort]);

    useEffect(() => {
        api.get('/products', { params: { limit: 200 } })
            .then(res => {
                const list = res.data.products ?? res.data ?? [];
                setProducts(list.map((p: any) => ({ id: p.id, title: p.title, options: p.options ?? [] })));
            }).catch(() => { });

        api.get('/admin/experience-centers')
            .then(res => {
                setExperienceCenters(res.data.filter((ec: any) => ec.isActive));
            }).catch(() => { });

        api.get('/users/field-force')
            .then(res => {
                setFieldAgents(res.data);
            }).catch(() => { });
    }, []);

    const openEdit = (lead: any) => {
        setEditTarget(lead);
        // Fetch call logs for this lead
        setCallLogs([]);
        setCallLogsLoading(true);
        api.get('/call-logs/lead', { params: { leadId: lead.id } })
            .then(res => setCallLogs(res.data ?? []))
            .catch(() => {})
            .finally(() => setCallLogsLoading(false));
        // Convert leadProducts (two-layer) into local form shape
        const formProducts = (lead.leadProducts ?? []).map((lp: any) => ({
            productId: lp.productId ?? undefined,
            productTitle: lp.productTitle,
            quantity: lp.quantity ?? 1,
            options: (lp.options ?? []).map((o: any) => ({ name: o.optionName, value: o.optionValue })),
        }));
        setEditForm({
            // Customer-level fields (editable)
            name: lead.customer?.name ?? '',
            city: lead.customer?.city ?? '',
            address: lead.customer?.addressLine1 ?? '',
            pincode: lead.customer?.pincode ?? '',
            // Lead-record fields
            status: lead.status ?? '',
            isHighPriority: lead.isHighPriority ?? false,
            call1: lead.call1 ?? '',
            call2: lead.call2 ?? '',
            call3: lead.call3 ?? '',
            nextActionDate: lead.nextActionDate ?? '',
            appointmentBooked: lead.appointmentBooked ?? false,
            bookedDate: lead.bookedDate ?? '',
            bookedTimeSlot: lead.bookedTimeSlot ?? '',
            remarks: lead.remarks ?? '',
            preferredExperienceCenter: lead.preferredExperienceCenter ?? '',
            consultationType: lead.consultationType ?? '',
            products: formProducts,
            // HT-specific
            htCity: lead.htCity ?? '',
            htAgentId: lead.htAgentId ?? '',
            htScheduledTime: lead.htScheduledTime ?? '',
        });
    };

    const saveEdit = async () => {
        if (!editTarget) return;
        // Validate: nextActionDate required for certain call statuses
        const REQUIRES_NAD = ['Requested callback', 'Interested (NotSure)', 'Interested'];
        const activeCall = editForm.call3 || editForm.call2 || editForm.call1 || '';
        if (REQUIRES_NAD.includes(activeCall) && !editForm.nextActionDate) {
            alert(`Next Action Date is required when call status is "${activeCall}". Please set it before saving.`);
            return;
        }

        // Validate: converted statuses require consultationType and bookedDate
        const CONVERTED_STATUSES = ['converted:Marked to EC', 'converted:Marked to HT'];
        if (CONVERTED_STATUSES.includes(editForm.status)) {
            if (!editForm.consultationType) {
                alert('Consultation Type is required when marking as Converted. Please select one.');
                return;
            }
            if (!editForm.bookedDate) {
                alert('Appointment Date is required when marking as Converted. Please set it.');
                return;
            }
        }

        // Validate: HT requires city, agent, and time
        const isMarkedToHt = editForm.status === 'converted:Marked to HT';
        if (isMarkedToHt) {
            const validHTAgents = fieldAgents.filter((a: any) => a.channelierEmployeeId);
            if (validHTAgents.length > 0 && (!editForm.htCity || !editForm.htAgentId || !editForm.bookedDate || !editForm.bookedTimeSlot || !editForm.consultationType)) {
                alert('Please select City, Field Agent, and complete the Appointment Booked section (Date, Time, Consultation Type) to assign to Home Trial.');
                return;
            }
        }

        // ── EC-specific: require DINGG booking selection ────────────────────
        const isMarkedToEc = editForm.status === 'converted:Marked to EC';
        if (isMarkedToEc) {
            const dinggEcs = experienceCenters.filter((ec: any) => ec.dinggEnabled || ec.dinggVendorLocationUuid);
            if (dinggEcs.length > 0 && !booking.isValid) {
                alert('Please select an Experience Centre and available time slot to book a DINGG appointment.');
                return;
            }
        }

        setEditLoading(true);
        try {
            const raw: any = { ...editForm };
            const effectiveCall1 = raw.call1 || editTarget?.call1;
            const effectiveCall2 = raw.call2 || editTarget?.call2;
            if (!effectiveCall1) { raw.call2 = undefined; raw.call3 = undefined; }
            else if (!effectiveCall2) { raw.call3 = undefined; }

            const payload: any = {};
            for (const key of Object.keys(raw)) {
                if (key === 'products') continue;
                const v = raw[key];
                if (v === '' || v === null) continue;
                if (Array.isArray(v) && v.length === 0) continue;
                if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) continue;
                payload[key] = v;
            }

            // Always send products array (even if empty = clear products)
            payload.products = (raw.products ?? []).map((p: any) => ({
                productId: p.productId || undefined,
                productTitle: p.productTitle,
                quantity: p.quantity ?? 1,
                options: (p.options ?? []).filter((o: any) => o.name && o.value),
            }));

            const res = await api.patch(`/leads/${editTarget.id}`, payload);
            setLeads(prev => prev.map(l => l.id === editTarget.id ? { ...l, ...res.data } : l));

            // ── Fire DINGG booking after lead is saved ──────────────────────
            const isMarkedToEc = editForm.status === 'converted:Marked to EC';
            if (isMarkedToEc && booking.isValid) {
                const customerId = editTarget?.customer?.id ?? editTarget?.customerId;
                const bookResult = await booking.submitBooking(editTarget.id, customerId);
                if (!bookResult.success) {
                    alert(`Lead saved ✅\n\nDINGG booking warning: ${bookResult.message}\nPlease book manually in DINGG.`);
                } else {
                    alert(`Lead saved & appointment booked ✅\n${bookResult.message}`);
                }
                booking.reset();
            }

            setEditTarget(null);
        } catch (err: any) {
            console.error('Save failed:', err?.response?.data ?? err);
            alert('Failed to save lead. Please try again.');
        } finally {
            setEditLoading(false);
        }
    };

    const c = (lead: any) => lead?.customer ?? {};

    // ── Filter logic ─────────────────────────────────────────────────────────
    const FILTERS = [
        { key: 'all', label: 'All Leads', count: tabCounts.all || 0, color: '#6366F1', bg: '#EEF2FF' },
        { key: 'fresh', label: 'Fresh', count: tabCounts.fresh || 0, color: '#0369A1', bg: '#E0F2FE' },
        { key: 'reminder', label: '🔔 Reminder', count: tabCounts.reminder || 0, color: '#B45309', bg: '#FEF3C7' },
        { key: 'revisit', label: '🔄 Revisit', count: tabCounts.revisit || 0, color: '#7C3AED', bg: '#F5F3FF' },
        { key: 'converted', label: '✅ Converted', count: tabCounts.converted || 0, color: '#16A34A', bg: '#F0FDF4' },
        { key: 'dropped', label: '🚫 Dropped', count: tabCounts.dropped || 0, color: '#9CA3AF', bg: '#F3F4F6' },
    ] as const;

    // Table display leads. (All filtering moved to backend)
    // High-priority leads always float to the top
    const colFilteredLeads = [...leads].sort((a: any, b: any) => {
        if (b.isHighPriority && !a.isHighPriority) return 1;
        if (a.isHighPriority && !b.isHighPriority) return -1;
        return 0;
    });

    const hasActiveColFilters = Object.values(colFilters).some(v => !!v);

    // ── CSV Export ────────────────────────────────────────────────
    const downloadCSV = async () => {
        try {
            // Fetch leads from backend with date range (up to 10000)
            const params: any = { limit: 10000 };
            if (exportFrom) params.fromDate = exportFrom;
            if (exportTo) params.toDate = exportTo;
            const res = await api.get('/leads', { params });
            const exportLeads = res.data.leads ?? res.data ?? [];
            const cust = (l: any) => l?.customer ?? {};

            if (exportLeads.length === 0) {
                alert('No leads found for the selected date range.');
                return;
            }

            const rows = exportLeads.map((l: any) => ({
                'Lead ID': l.id ?? '',
                'Customer ID': cust(l).id ?? '',
                'Name': (cust(l).name ?? '').replace(/,/g, ' '),
                'Phone': cust(l).phone ?? '',
                'Email': cust(l).email ?? '',
                'City': cust(l).city ?? '',
                'Pincode': cust(l).pincode ?? '',
                'Customer Since': cust(l).createdAt ? new Date(cust(l).createdAt).toLocaleDateString('en-IN') : '',
                'Source': l.source ?? '',
                'Page Type': l.pageType ?? '',
                'Lead Category': l.leadCategory ?? '',
                'Campaign ID': l.campaignId ?? '',
                'Status': l.status ?? '',
                'High Priority': l.isHighPriority ? 'Yes' : 'No',
                'Revisit': l.isRevisit ? 'Yes' : 'No',
                'Converted At': l.convertedAt ? new Date(l.convertedAt).toLocaleDateString('en-IN') : '',
                'Assigned To ID': l.assignedToId ?? '',
                'Assigned To': l.assignedToName ?? '',
                'Call 1': l.call1 ?? '',
                'Call 2': l.call2 ?? '',
                'Call 3': l.call3 ?? '',
                'Appointment Booked': l.appointmentBooked ? 'Yes' : 'No',
                'Booked Date': l.bookedDate ?? '',
                'Booked Time Slot': l.bookedTimeSlot ?? '',
                'Remarks': (l.remarks ?? '').replace(/\n/g, ' ').replace(/,/g, ' '),
                'Exp. Center': l.preferredExperienceCenter ?? '',
                'Consultation Type': l.consultationType ?? '',
                'Next Action': l.nextActionDate ? new Date(l.nextActionDate).toLocaleDateString('en-IN') : '',
                'Products': (l.leadProducts ?? []).map((lp: any) => `${lp.productTitle} (Qty: ${lp.quantity})`).join(' | '),
                'Specific Details': l.specificDetails ? JSON.stringify(l.specificDetails).replace(/,/g, ';').replace(/"/g, '""') : '',
                'Aging': l.createdAt ? Math.floor((Date.now() - new Date(l.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + ' days' : '',
                'Created At': l.createdAt ? new Date(l.createdAt).toLocaleString('en-IN') : '',
                'Updated At': l.updatedAt ? new Date(l.updatedAt).toLocaleString('en-IN') : '',
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

    return (
        <AdminPageLayout>
            {/* ── Header ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>My Leads</Text>
                    <Text style={styles.headerSubtitle}>
                        {colFilteredLeads.length} lead{colFilteredLeads.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (${filter})` : ''}
                        {hasActiveColFilters ? ' (filtered)' : ''}
                    </Text>
                </View>
                <View style={styles.headerRight}>
                    <Searchbar
                        placeholder="Search name or phone…"
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={() => loadLeads(1, search)}
                        style={styles.searchBar}
                        inputStyle={{ minHeight: 0 }}
                    />
                    <Button mode="outlined" icon="refresh" onPress={() => loadLeads(1, search)} compact>
                        Refresh
                    </Button>
                </View>
            </View>

            {/* ── Action Row: Export + Bulk Assign ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 2, marginBottom: 8, flexWrap: 'wrap' }}>
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
                <View style={{ width: 1, height: 28, backgroundColor: '#E5E7EB', marginHorizontal: 4 }} />
                <Button
                    mode="contained"
                    icon="account-plus"
                    onPress={() => setAddLeadVisible(true)}
                    compact
                    style={{ borderRadius: 8 }}
                    buttonColor="#4F46E5"
                    textColor="#fff"
                >
                    Add New Lead
                </Button>
            </View>

            {/* ── Category filter chips ── */}
            {(() => {
                const CATS = [
                    { key: '', label: 'All', bg: '#F3F4F6', color: '#374151', activeBg: '#374151', activeColor: '#fff' },
                    { key: 'EC', label: '🔵 EC', bg: '#DBEAFE', color: '#1D4ED8', activeBg: '#1D4ED8', activeColor: '#fff' },
                    { key: 'HT', label: '🟢 HT', bg: '#D1FAE5', color: '#065F46', activeBg: '#065F46', activeColor: '#fff' },
                    { key: 'WEBSITE', label: '🟣 Website', bg: '#EDE9FE', color: '#5B21B6', activeBg: '#5B21B6', activeColor: '#fff' },
                    { key: 'POPIN', label: '🟡 Popin', bg: '#FEF3C7', color: '#92400E', activeBg: '#D97706', activeColor: '#fff' },
                ];
                return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 2, flexWrap: 'wrap', marginBottom: 4 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginRight: 4 }}>Category:</Text>
                        {CATS.map(c => {
                            const active = categoryFilter === c.key;
                            return (
                                <Chip
                                    key={c.key}
                                    mode={active ? 'flat' : 'outlined'}
                                    selected={active}
                                    onPress={() => setCategoryFilter(c.key)}
                                    style={{
                                        backgroundColor: active ? c.activeBg : c.bg,
                                        borderColor: active ? c.activeBg : 'transparent',
                                    }}
                                    textStyle={{ color: active ? c.activeColor : c.color, fontSize: 12, fontWeight: active ? '700' : '500' }}
                                >
                                    {c.label}
                                </Chip>
                            );
                        })}
                        {categoryFilter && (
                            <Text style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>{total} leads found</Text>
                        )}
                    </View>
                );
            })()}

            {/* ── Filter Tabs + Priority Toggle ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, paddingHorizontal: 2, marginBottom: 12 }}>
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

                {/* ── 🔴 High Priority filter chip ── */}
                <View style={{ width: 1, height: 28, backgroundColor: '#E5E7EB', marginHorizontal: 4 }} />
                <Pressable
                    onPress={() => setPriorityFilter(p => !p)}
                    style={{
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                        paddingHorizontal: 14, paddingVertical: 7,
                        borderRadius: 20, borderWidth: 2,
                        borderColor: priorityFilter ? '#DC2626' : '#E5E7EB',
                        backgroundColor: priorityFilter ? '#FEE2E2' : '#fff',
                    }}
                >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: priorityFilter ? '#DC2626' : '#6B7280' }}>
                        🔴 High Priority
                    </Text>
                    {priorityFilter && (
                        <View style={{ backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>ON</Text>
                        </View>
                    )}
                </Pressable>

                {/* ── 🕵️‍♂️ Unassigned filter chip (Admins only) ── */}
                {user?.role !== 'lead_caller' && (
                    <>
                        <View style={{ width: 1, height: 28, backgroundColor: '#E5E7EB', marginHorizontal: 4 }} />
                        <Pressable
                            onPress={() => setUnassignedFilter(u => !u)}
                            style={{
                                flexDirection: 'row', alignItems: 'center', gap: 6,
                                paddingHorizontal: 14, paddingVertical: 7,
                                borderRadius: 20, borderWidth: 2,
                                borderColor: unassignedFilter ? '#D97706' : '#E5E7EB',
                                backgroundColor: unassignedFilter ? '#FEF3C7' : '#fff',
                            }}
                        >
                            <Text style={{ fontSize: 13, fontWeight: '700', color: unassignedFilter ? '#D97706' : '#6B7280' }}>
                                🕵️‍♂️ Unassigned
                            </Text>
                            {unassignedFilter && (
                                <View style={{ backgroundColor: '#D97706', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>ON</Text>
                                </View>
                            )}
                        </Pressable>
                    </>
                )}
            </View>

            {/* ── Table ── */}
            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 60 }} />
                ) : colFilteredLeads.length === 0 ? (
                    <View style={{ padding: 48, alignItems: 'center' }}>
                        <Text style={{ color: Colors.textSecondary, fontSize: 15 }}>
                            {hasActiveColFilters ? '🔍 No leads match the column filters'
                                : filter === 'fresh' ? '🎉 No fresh leads'
                                    : filter === 'reminder' ? '✅ No pending reminders'
                                        : 'No leads assigned to you yet.'}
                        </Text>
                        {hasActiveColFilters && (
                            <Button mode="text" onPress={() => setColFilters({})} style={{ marginTop: 8 }}>
                                Clear all filters
                            </Button>
                        )}
                    </View>
                ) : (
                    <ScrollView horizontal={TOTAL_WIDTH > 1200} showsHorizontalScrollIndicator>
                        <View style={{ minWidth: TOTAL_WIDTH }}>

                            {/* Header row */}
                            <View style={tbl.headerRow}>
                                {COLS.map(col => (
                                    <Pressable key={col.key}
                                        disabled={col.key !== 'aging'}
                                        onPress={col.key === 'aging' ? () => setAgingSort(s => s === 'none' ? 'desc' : s === 'desc' ? 'asc' : 'none') : undefined}
                                        style={[tbl.headerCell, { width: col.width, flexDirection: 'row', alignItems: 'center', gap: 2 }, col.key === 'aging' && { cursor: 'pointer' as any }]}>
                                        <Text style={tbl.headerText}>{col.label}</Text>
                                        {col.key === 'aging' && agingSort !== 'none' && (
                                            <Text style={{ fontSize: 10, color: '#4F46E5' }}>{agingSort === 'asc' ? ' ▲' : ' ▼'}</Text>
                                        )}
                                    </Pressable>
                                ))}
                            </View>

                            {/* Filter row */}
                            <View style={[tbl.headerRow, { backgroundColor: '#FAFBFF', borderBottomColor: '#E5E7EB', paddingVertical: 4 }]}>
                                {COLS.map(col => {
                                    // Skip non-filterable columns
                                    if (['actions', 'callProgress', 'nextActionDate', 'appointmentBooked'].includes(col.key)) {
                                        return <View key={col.key} style={{ width: col.width, paddingHorizontal: 4 }} />;
                                    }
                                    return (
                                        <View key={col.key} style={{ width: col.width, paddingHorizontal: 4 }}>
                                            <RNTextInput
                                                placeholder={col.key === 'aging' ? "e.g. 5 (days)" : "Filter…"}
                                                placeholderTextColor="#9CA3AF"
                                                value={colFilters[col.key] ?? ''}
                                                onChangeText={(text) => setColFilters(prev => ({ ...prev, [col.key]: text }))}
                                                style={{
                                                    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6,
                                                    paddingHorizontal: 8, paddingVertical: 4, fontSize: 11,
                                                    color: '#374151', backgroundColor: '#fff',
                                                }}
                                                keyboardType={col.key === 'aging' ? 'number-pad' : 'default'}
                                            />
                                        </View>
                                    );
                                })}
                            </View>

                            {/* Data rows */}
                            {colFilteredLeads.map((lead, idx, arr) => {
                                const phone = lead?.customer?.phone ?? '';
                                const prevPhone = idx > 0 ? (arr[idx - 1]?.customer?.phone ?? '') : null;
                                const isNewGroup = filter === 'revisit' && prevPhone !== null && phone !== prevPhone;
                                const groupCount = filter === 'revisit' ? arr.filter(l => (l?.customer?.phone ?? '') === phone).length : 0;
                                const isFirstInGroup = filter === 'revisit' && (idx === 0 || phone !== prevPhone);
                                const isExpanded = filter !== 'revisit' || expandedRevisitGroups.has(phone);

                                const toggleGroup = () => {
                                    setExpandedRevisitGroups(prev => {
                                        const next = new Set(prev);
                                        if (next.has(phone)) next.delete(phone);
                                        else next.add(phone);
                                        return next;
                                    });
                                };

                                return (
                                    <React.Fragment key={lead.id}>
                                        {/* Group header for revisit view */}
                                        {filter === 'revisit' && isFirstInGroup && (
                                            <Pressable onPress={toggleGroup} style={{
                                                flexDirection: 'row', alignItems: 'center',
                                                backgroundColor: isExpanded ? '#EDE9FE' : '#F5F3FF',
                                                borderTopWidth: isNewGroup ? 2 : 1,
                                                borderTopColor: isNewGroup ? '#7C3AED' : '#E9E5F5',
                                                paddingVertical: 8, paddingHorizontal: 14,
                                                minWidth: TOTAL_WIDTH,
                                                cursor: 'pointer' as any,
                                            }}>
                                                <Text style={{ fontSize: 14, color: '#7C3AED', marginRight: 6 }}>
                                                    {isExpanded ? '▼' : '▶'}
                                                </Text>
                                                <Text style={{ fontSize: 12, fontWeight: '800', color: '#7C3AED' }}>
                                                    📞 {phone || 'No phone'}
                                                </Text>
                                                <View style={{
                                                    backgroundColor: '#7C3AED', borderRadius: 10, marginLeft: 8,
                                                    paddingHorizontal: 7, paddingVertical: 2,
                                                }}>
                                                    <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>
                                                        {groupCount} lead{groupCount !== 1 ? 's' : ''}
                                                    </Text>
                                                </View>
                                                <Text style={{ fontSize: 11, color: '#6B7280', marginLeft: 10, fontWeight: '500' }}>
                                                    {lead?.customer?.name || c(lead).name || ''}
                                                </Text>
                                            </Pressable>
                                        )}
                                        {/* Lead row — hidden in revisit unless group is expanded */}
                                        {isExpanded && (() => {
                                            const isDup = (lead.totalLeadCount ?? 1) > 1;
                                            return (
                                            <View style={[
                                                tbl.row, !isDup && idx % 2 === 1 && tbl.rowAlt,
                                                isDup && { backgroundColor: '#FFFBEB' },
                                                filter === 'revisit' && { borderLeftWidth: 3, borderLeftColor: '#C4B5FD' },
                                            ]}>
                                                {/* Edit + History + Call buttons */}
                                                <View style={[tbl.cell, { width: 155, alignItems: 'center', flexDirection: 'row', gap: 0 }]}>
                                                    <IconButton icon="pencil" size={18} onPress={() => openEdit(lead)}
                                                        style={{ margin: 0 }} iconColor={Colors.primary} />
                                                    <IconButton icon="history" size={18} onPress={() => openHistory(lead)}
                                                        style={{ margin: 0 }} iconColor="#6B7280" />
                                                    <IconButton icon="phone" size={18} onPress={() => setCallLead(lead)}
                                                        style={{ margin: 0 }} iconColor="#16A34A" />
                                                    <IconButton
                                                        icon="account-arrow-right" size={18}
                                                        onPress={() => setReassignLead(lead)}
                                                        style={{ margin: 0 }} iconColor="#7C3AED"
                                                    />
                                                </View>

                                                {/* Aging */}
                                                <View style={[tbl.cell, { width: 80, justifyContent: 'center' }]}>
                                                    {(() => {
                                                        const days = lead.createdAt
                                                            ? Math.floor((Date.now() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
                                                            : 0;
                                                        const bg = days <= 3 ? '#DCFCE7' : days <= 7 ? '#FEF3C7' : '#FEE2E2';
                                                        const color = days <= 3 ? '#166534' : days <= 7 ? '#92400E' : '#991B1B';
                                                        return (
                                                            <View style={{ backgroundColor: bg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                                                                <Text style={{ fontSize: 12, fontWeight: '700', color, textAlign: 'center' }}>{days}d</Text>
                                                            </View>
                                                        );
                                                    })()}
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

                                                <View style={[tbl.cell, { width: 150, flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' }]}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 }}>
                                                        {lead.isHighPriority && (
                                                            <View style={{
                                                                backgroundColor: '#FEE2E2', borderRadius: 6,
                                                                paddingHorizontal: 4, paddingVertical: 1,
                                                            }}>
                                                                <Text style={{ fontSize: 9, fontWeight: '800', color: '#DC2626' }}>🔴 HIGH</Text>
                                                            </View>
                                                        )}
                                                        <Text style={tbl.nameText} numberOfLines={2}>{c(lead).name || '—'}</Text>
                                                    </View>
                                                    {isDup && (
                                                        <View style={{ backgroundColor: '#F59E0B', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                                                            <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff' }}>⚠ {lead.totalLeadCount}×</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <View style={[tbl.cell, { width: 135 }]}>
                                                    <Text style={[tbl.cellText, isDup && { color: '#D97706', fontWeight: '700' }]}>{c(lead).phone || '—'}</Text>
                                                </View>
                                                <View style={[tbl.cell, { width: 100 }]}>
                                                    <Text style={tbl.cellText}>{c(lead).city || '—'}</Text>
                                                </View>

                                                {/* Lead Category */}
                                                <View style={[tbl.cell, { width: 110 }]}>
                                                    {lead.leadCategory ? (
                                                        <View style={[tbl.badge, { backgroundColor: leadCategoryStyle(lead.leadCategory).bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }]}>
                                                            <Text style={[tbl.badgeText, { color: leadCategoryStyle(lead.leadCategory).color, fontWeight: '700' }]} numberOfLines={1}>{lead.leadCategory}</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={tbl.cellText}>—</Text>
                                                    )}
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

                                                {/* Assigned To */}
                                                <View style={[tbl.cell, { width: 140 }]}>
                                                    {lead.assignedToName ? (
                                                        <View style={[tbl.badge, { backgroundColor: '#E0F2FE', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }]}>
                                                            <Text style={[tbl.badgeText, { color: '#0369A1', fontWeight: '600' }]} numberOfLines={1}>{lead.assignedToName}</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={{ fontSize: 12, color: '#D1D5DB' }}>Unassigned</Text>
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
                                                    {lead.leadProducts && lead.leadProducts.length > 0
                                                        ? lead.leadProducts.map((lp: any) => (
                                                            <View key={lp.id ?? lp.productTitle} style={{ marginBottom: 3 }}>
                                                                <View style={{ backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2, marginBottom: 2 }}>
                                                                    <Text style={{ fontSize: 11, color: '#4F46E5', fontWeight: '600' }} numberOfLines={1}>{lp.productTitle}</Text>
                                                                </View>
                                                                {/* Show selected options below the product chip */}
                                                                {(lp.options ?? []).map((opt: any) => (
                                                                    <View key={opt.optionName} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 4 }}>
                                                                        <Text style={{ fontSize: 9, color: '#9CA3AF' }}>{opt.optionName}:</Text>
                                                                        <View style={{ backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                                                                            <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>{opt.optionValue}</Text>
                                                                        </View>
                                                                    </View>
                                                                ))}
                                                            </View>
                                                        ))
                                                        : <Text style={tbl.cellText}>—</Text>
                                                    }
                                                </View>

                                                {/* Consultation Type */}
                                                <View style={[tbl.cell, { width: 155 }]}>
                                                    {lead.consultationType ? (
                                                        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
                                                            <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }} numberOfLines={2}>{lead.consultationType}</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={tbl.cellText}>—</Text>
                                                    )}
                                                </View>
                                            </View>
                                            );
                                        })()}
                                    </React.Fragment>
                                );
                            })}
                        </View>
                    </ScrollView>
                )}

                {/* Pagination */}
                {total > LIMIT && (
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                        <Button
                            mode="text"
                            disabled={page === 1}
                            onPress={() => loadLeads(page - 1)}
                            icon="chevron-left"
                        >
                            Prev
                        </Button>
                        <Text style={{ alignSelf: 'center', marginHorizontal: 16, color: '#6B7280', fontSize: 13 }}>
                            Page {page} of {Math.ceil(total / LIMIT)}
                        </Text>
                        <Button
                            mode="text"
                            disabled={page * LIMIT >= total}
                            onPress={() => loadLeads(page + 1)}
                            contentStyle={{ flexDirection: 'row-reverse' }}
                            icon="chevron-right"
                        >
                            Next
                        </Button>
                    </View>
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

                        {/* Cancel at the top */}
                        <View style={{ alignSelf: 'flex-end', marginBottom: 8 }}>
                            <Button onPress={() => setEditTarget(null)} icon="close">Close</Button>
                        </View>

                        {/* ── Call Log History ── */}
                        <View style={[md.section, { backgroundColor: '#F0FDF4', borderRadius: 12, borderWidth: 1, borderColor: '#86EFAC', padding: 14, marginBottom: 14 }]}>
                            <Text style={[md.sectionTitle, { marginBottom: 10 }]}>📞 Call History</Text>
                            {callLogsLoading ? (
                                <ActivityIndicator size="small" />
                            ) : callLogs.length === 0 ? (
                                <Text style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>No call logs recorded yet.</Text>
                            ) : (
                                <View style={{ gap: 10 }}>
                                    {callLogs.map((log: any, idx: number) => {
                                        const statusColors: Record<string, { bg: string; color: string }> = {
                                            COMPLETED: { bg: '#D1FAE5', color: '#065F46' },
                                            MISSED: { bg: '#FFEBEE', color: '#B71C1C' },
                                            PENDING: { bg: '#FEF3C7', color: '#92400E' },
                                        };
                                        const s = statusColors[log.status] ?? { bg: '#F3F4F6', color: '#6B7280' };
                                        const formatTime = (t?: string) => t ? new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';
                                        const formatDate = (t?: string) => t ? new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—';
                                        const durationSec = log.totalCallDuration;
                                        const durationStr = durationSec != null
                                            ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
                                            : null;
                                        return (
                                            <View key={log.id ?? idx} style={{ backgroundColor: 'white', borderRadius: 10, borderWidth: 1, borderColor: '#D1FAE5', padding: 12 }}>
                                                {/* Top row: status + date + duration */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                        <View style={{ backgroundColor: s.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
                                                            <Text style={{ fontSize: 11, fontWeight: '700', color: s.color }}>{log.status}</Text>
                                                        </View>
                                                        {log.callAction ? (
                                                            <Text style={{ fontSize: 11, color: '#6B7280' }}>{log.callAction}</Text>
                                                        ) : null}
                                                    </View>
                                                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>
                                                        {formatDate(log.callStartTime ?? log.createdAt)}
                                                    </Text>
                                                </View>
                                                {/* Info rows */}
                                                <View style={{ gap: 4 }}>
                                                    {[[
                                                        { label: 'Agent', value: log.agent?.name ?? log.agentNumber ?? '—' },
                                                        { label: 'Caller', value: log.callerNumber ?? '—' },
                                                    ], [
                                                        { label: 'Start', value: formatTime(log.callStartTime) },
                                                        { label: 'End', value: formatTime(log.callEndTime) },
                                                        { label: 'Duration', value: durationStr ?? '—' },
                                                    ]].map((row, ri) => (
                                                        <View key={ri} style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                                                            {row.map(({ label, value }) => (
                                                                <View key={label} style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                                                                    <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>{label}:</Text>
                                                                    <Text style={{ fontSize: 12, color: '#1F2937' }}>{value}</Text>
                                                                </View>
                                                            ))}
                                                        </View>
                                                    ))}
                                                    {log.callRecordingUrl ? (
                                                        <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 4 }}>
                                                            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600' }}>Recording:</Text>
                                                            <Text
                                                                style={{ fontSize: 12, color: '#2563EB', textDecorationLine: 'underline' }}
                                                                onPress={() => { if (typeof window !== 'undefined') window.open(log.callRecordingUrl, '_blank'); }}
                                                            >
                                                                🎙️ Play Recording
                                                            </Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>

                        {/* ── Campaign Info (read-only) ── */}
                        <View style={[md.section, { backgroundColor: '#F8FAFF', borderRadius: 12, borderWidth: 1, borderColor: '#C7D2FE', padding: 14, marginBottom: 14 }]}>
                            <Text style={[md.sectionTitle, { marginBottom: 10 }]}>🏷️ Campaign Info</Text>
                            <View style={{ gap: 8 }}>
                                {[
                                    { label: 'Source', value: editTarget?.source },
                                    { label: 'Page Type', value: editTarget?.pageType },
                                    { label: 'Campaign ID', value: editTarget?.campaignId },
                                    { label: 'Product Interest', value: editTarget?.customerProductInterest },
                                ].map(({ label, value }) => (
                                    <View key={label} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                                        <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', width: 90 }}>{label}</Text>
                                        <Text style={{ fontSize: 13, color: value ? '#111827' : '#D1D5DB', flex: 1, fontWeight: value ? '600' : '400' }}>
                                            {value || '—'}
                                        </Text>
                                    </View>
                                ))}
                                {editTarget?.specificDetails && Object.keys(editTarget.specificDetails).length > 0 && (() => {
                                    const sd = editTarget.specificDetails;
                                    const meta = sd.popin_meta && typeof sd.popin_meta === 'object' && !Array.isArray(sd.popin_meta) ? sd.popin_meta : {};
                                    // Known Popin keys to display in sections
                                    const knownKeys = new Set([
                                        'popin_event', 'popin_user_id', 'popin_timestamp', 'popin_url',
                                        'popin_customer_name', 'popin_customer_email', 'popin_customer_phone', 'popin_customer_country_code',
                                        'popin_call_duration', 'popin_product',
                                        'popin_agent_name', 'popin_agent_email',
                                        'popin_scheduled_date', 'popin_scheduled_time', 'popin_scheduled_date_local', 'popin_scheduled_time_local',
                                        'popin_remark', 'popin_rating', 'popin_rating_comments',
                                        'popin_guest_type', 'popin_guest_id', 'popin_guest_agent_name', 'popin_guest_agent_email',
                                        'popin_meta', 'popin_extra',
                                    ]);
                                    const otherEntries = Object.entries(sd).filter(([k]) => !knownKeys.has(k));
                                    const isPopin = !!sd.popin_event;
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

                                    if (!isPopin) {
                                        return (
                                            <View style={{ marginTop: 8 }}>
                                                <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 4 }}>Extra Details</Text>
                                                {Object.entries(sd).map(([k, v]) => (
                                                    <InfoRow key={k} label={k} value={v} />
                                                ))}
                                            </View>
                                        );
                                    }

                                    return (
                                        <View style={{ marginTop: 10, gap: 10 }}>
                                            {/* Event Info */}
                                            <View style={{ backgroundColor: '#EEF2FF', borderRadius: 8, padding: 10 }}>
                                                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4338CA', marginBottom: 6 }}>📡 Popin Event</Text>
                                                <InfoRow label="Event" value={sd.popin_event?.replace('popin_', '').replace(/_/g, ' ')} />
                                                <InfoRow label="Timestamp" value={sd.popin_timestamp ? new Date(sd.popin_timestamp).toLocaleString('en-IN') : null} />
                                                <InfoRow label="User ID" value={sd.popin_user_id} />
                                            </View>

                                            {/* UTM / Marketing */}
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

                                            {/* Page URL */}
                                            {sd.popin_url && (
                                                <View style={{ backgroundColor: '#FFF7ED', borderRadius: 8, padding: 10 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#9A3412', marginBottom: 6 }}>🌐 Page</Text>
                                                    <Text style={{ fontSize: 12, color: '#4338CA', textDecorationLine: 'underline' }}>{sd.popin_url}</Text>
                                                </View>
                                            )}

                                            {/* Agent Info */}
                                            {(sd.popin_agent_name || sd.popin_agent_email) && (
                                                <View style={{ backgroundColor: '#FDF4FF', borderRadius: 8, padding: 10 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E22CE', marginBottom: 6 }}>👤 Popin Agent</Text>
                                                    <InfoRow label="Name" value={sd.popin_agent_name} />
                                                    <InfoRow label="Email" value={sd.popin_agent_email} />
                                                </View>
                                            )}

                                            {/* Call Info */}
                                            {(sd.popin_call_duration || sd.popin_rating) && (
                                                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#991B1B', marginBottom: 6 }}>📞 Call Details</Text>
                                                    <InfoRow label="Duration" value={sd.popin_call_duration ? `${sd.popin_call_duration}s` : null} />
                                                    <InfoRow label="Rating" value={sd.popin_rating ? `⭐ ${sd.popin_rating}` : null} />
                                                    <InfoRow label="Comments" value={sd.popin_rating_comments} />
                                                    <InfoRow label="Remark" value={sd.popin_remark} />
                                                </View>
                                            )}

                                            {/* Schedule Info */}
                                            {(sd.popin_scheduled_date_local || sd.popin_scheduled_date) && (
                                                <View style={{ backgroundColor: '#ECFEFF', borderRadius: 8, padding: 10 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#155E75', marginBottom: 6 }}>📅 Scheduled</Text>
                                                    <InfoRow label="Date" value={sd.popin_scheduled_date_local || sd.popin_scheduled_date} />
                                                    <InfoRow label="Time" value={sd.popin_scheduled_time_local || sd.popin_scheduled_time} />
                                                </View>
                                            )}

                                            {/* Other fields */}
                                            {otherEntries.length > 0 && (
                                                <View style={{ backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 }}>
                                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 6 }}>📋 Other</Text>
                                                    {otherEntries.map(([k, v]) => (
                                                        <InfoRow key={k} label={k} value={v} />
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })()}
                            </View>
                        </View>

                        {/* ── Interested Products (read-only from lead form) ── */}
                        {editTarget?.leadProducts && editTarget.leadProducts.length > 0 && (
                            <View style={[md.section, { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FCD34D', borderRadius: 10, padding: 12 }]}>
                                <Text style={[md.sectionTitle, { color: '#92400E', marginBottom: 8 }]}>🛒 Interested Products (from lead form)</Text>
                                <View style={{ gap: 8 }}>
                                    {editTarget.leadProducts.map((lp: any) => (
                                        <View key={lp.id} style={{
                                            backgroundColor: '#FEF3C7', borderRadius: 8,
                                            paddingHorizontal: 12, paddingVertical: 8,
                                            flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
                                        }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#78350F' }}>
                                                {lp.productTitle}
                                            </Text>
                                            {lp.quantity > 1 && (
                                                <View style={{ backgroundColor: '#92400E', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                                                    <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>×{lp.quantity}</Text>
                                                </View>
                                            )}
                                            {(lp.options ?? []).map((opt: any) => (
                                                <View key={opt.id ?? opt.optionName} style={{
                                                    backgroundColor: '#FDE68A', borderRadius: 6,
                                                    paddingHorizontal: 8, paddingVertical: 2,
                                                }}>
                                                    <Text style={{ fontSize: 11, color: '#78350F' }}>
                                                        {opt.optionName}: <Text style={{ fontWeight: '700' }}>{opt.optionValue}</Text>
                                                    </Text>
                                                </View>
                                            ))}
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
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
                                stepNum={1} label="Call 1" value={editForm.call1} locked={!!editTarget?.call1}
                                onChange={v => {
                                    setEditForm((f: any) => {
                                        const upd: any = { ...f, call1: v };
                                        // Mirror backend: first disposition → status new→contacted
                                        if (v && f.status === 'new') {
                                            upd.status = 'contacted';
                                        }
                                        if (v === 'RNR/Disconnect/Busy') {
                                            const d = new Date(Date.now() + 60 * 60 * 1000);
                                            upd.nextActionDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                        }
                                        return upd;
                                    });
                                }}
                            />
                            <CallSelector
                                stepNum={2} label="Call 2" value={editForm.call2} locked={!!editTarget?.call2 || !editTarget?.call1}
                                onChange={v => {
                                    setEditForm((f: any) => {
                                        const upd: any = { ...f, call2: v };
                                        if (v === 'RNR/Disconnect/Busy') {
                                            const d = new Date(Date.now() + 60 * 60 * 1000);
                                            upd.nextActionDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                        }
                                        return upd;
                                    });
                                }}
                            />
                            <CallSelector
                                stepNum={3} label="Call 3" value={editForm.call3} locked={!!editTarget?.call3 || !editTarget?.call2}
                                onChange={v => {
                                    setEditForm((f: any) => {
                                        const upd: any = { ...f, call3: v };
                                        if (v === 'RNR/Disconnect/Busy') {
                                            const d = new Date(Date.now() + 60 * 60 * 1000);
                                            upd.nextActionDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                                        }
                                        return upd;
                                    });
                                }}
                            />
                        </View>

                        {/* ── Scheduling ── */}
                        {(() => {
                            const REQUIRES_NAD = ['Requested callback', 'Interested (NotSure)', 'Interested'];
                            const activeCall = editForm.call3 || editForm.call2 || editForm.call1 || '';
                            const nadRequired = REQUIRES_NAD.includes(activeCall);
                            const nadMissing = nadRequired && !editForm.nextActionDate;
                            return (
                                <View style={[md.section, nadRequired && { borderWidth: 1.5, borderColor: nadMissing ? '#DC2626' : '#F59E0B', borderRadius: 10, padding: 12 }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                        <Text style={md.sectionTitle}>📅 Next Action</Text>
                                        {nadRequired && (
                                            <View style={{ backgroundColor: nadMissing ? '#FEE2E2' : '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: nadMissing ? '#DC2626' : '#B45309' }}>
                                                    Required for "{activeCall}"
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <DateTimePickerInput label="Next Action Date & Time" value={editForm.nextActionDate}
                                        onChange={v => setEditForm((f: any) => ({ ...f, nextActionDate: v }))} />
                                    {nadMissing && (
                                        <Text style={{ fontSize: 12, color: '#DC2626', fontWeight: '600', marginTop: 4 }}>
                                            ⚠️ Please set a Next Action date before saving
                                        </Text>
                                    )}
                                </View>
                            );
                        })()}

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

                        {/* ── Priority ── */}
                        <View style={[md.section, {
                            borderWidth: 2,
                            borderColor: editForm.isHighPriority ? '#DC2626' : '#E5E7EB',
                            borderRadius: 12,
                            backgroundColor: editForm.isHighPriority ? '#FFF5F5' : '#FAFAFA',
                        }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={[md.sectionTitle, { color: editForm.isHighPriority ? '#DC2626' : '#374151' }]}>
                                        {editForm.isHighPriority ? '🔴 High Priority' : '⚪ No Priority'}
                                    </Text>
                                    {editForm.isHighPriority && (
                                        <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>Flagged</Text>
                                        </View>
                                    )}
                                </View>
                                <Pressable
                                    onPress={() => setEditForm((f: any) => ({ ...f, isHighPriority: !f.isHighPriority }))}
                                    style={{
                                        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
                                        backgroundColor: editForm.isHighPriority ? '#DC2626' : '#E5E7EB',
                                    }}>
                                    <Text style={{ color: editForm.isHighPriority ? '#fff' : '#374151', fontWeight: '700', fontSize: 13 }}>
                                        {editForm.isHighPriority ? '🔴 Marked High Priority' : 'Mark as High Priority'}
                                    </Text>
                                </Pressable>
                            </View>
                            {editForm.isHighPriority && (
                                <Text style={{ fontSize: 12, color: '#9B1C1C', marginTop: 8 }}>
                                    This lead will be flagged with 🔴 and sorted to the top in the dashboard.
                                </Text>
                            )}
                        </View>

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

                            <Text style={[md.label, { marginTop: 6 }]}>Consultation Type</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    {['Wig Consultation', 'DIY Consultation', 'Topper Consultation', 'Man Patch Consultation', 'PE Consultation'].map(ct => (
                                        <Pressable key={ct}
                                            onPress={() => setEditForm((f: any) => ({ ...f, consultationType: editForm.consultationType === ct ? '' : ct }))}
                                            style={[md.chip, editForm.consultationType === ct && { backgroundColor: '#FEF3C7', borderColor: '#D97706', borderWidth: 2 }]}>
                                            <Text style={{ color: editForm.consultationType === ct ? '#D97706' : Colors.text, fontSize: 12 }}>{ct}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </ScrollView>

                            {/* ── DINGG EC Booking (only when "Marked to EC") ── */}
                            {editForm.status === 'converted:Marked to EC' && (() => {
                                const dinggEcs = experienceCenters.filter((ec: any) => ec.dinggEnabled || ec.dinggVendorLocationUuid);
                                const needsEcWarning = !booking.ecId;
                                return (
                                    <View style={{
                                        marginTop: 8,
                                        borderWidth: 2,
                                        borderColor: booking.isValid ? '#059669' : '#7C3AED',
                                        borderRadius: 12,
                                        padding: 14,
                                        backgroundColor: booking.isValid ? '#F0FDF4' : '#FAF5FF',
                                    }}>
                                        {/* Header */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#7C3AED' }}>
                                                🏪 DINGG Appointment
                                            </Text>
                                            <View style={{
                                                backgroundColor: booking.isValid ? '#D1FAE5' : '#EDE9FE',
                                                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                                            }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: booking.isValid ? '#065F46' : '#6D28D9' }}>
                                                    {booking.isValid ? '✓ Ready to book' : 'Required'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* 1. EC selector (dingg-enabled only) */}
                                        <Text style={[md.label, { color: '#7C3AED' }]}>1. Select Experience Centre *</Text>
                                        {dinggEcs.length === 0 ? (
                                            <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 12 }}>
                                                ⚠️ No DINGG-connected ECs found. Configure DINGG credentials in Settings → Experience Centres.
                                            </Text>
                                        ) : (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    {dinggEcs.map((ec: any) => {
                                                        const selected = booking.ecId === ec.id;
                                                        return (
                                                            <Pressable key={ec.id}
                                                                onPress={() => {
                                                                    booking.setEcId(ec.id);
                                                                    setEditForm((f: any) => ({ ...f, preferredExperienceCenter: ec.name }));
                                                                }}
                                                                style={[md.chip, {
                                                                    paddingHorizontal: 14, paddingVertical: 8,
                                                                    borderWidth: selected ? 2 : 1,
                                                                    borderColor: selected ? '#7C3AED' : '#E5E7EB',
                                                                    backgroundColor: selected ? '#EDE9FE' : '#FFF',
                                                                }]}>
                                                                <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? '#6D28D9' : '#374151' }}>
                                                                    {ec.name}
                                                                </Text>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        )}

                                        {/* 2. Service selector (fetched from DINGG) */}
                                        {booking.ecId && (
                                            <>
                                                <Text style={[md.label, { color: '#7C3AED' }]}>2. Select Service</Text>
                                                {booking.loadingServices ? (
                                                    <ActivityIndicator size="small" color="#7C3AED" style={{ marginBottom: 14 }} />
                                                ) : booking.services.length === 0 ? (
                                                    <Text style={{ color: '#6B7280', fontSize: 12, marginBottom: 14 }}>
                                                        No services found. Slots will still be shown.
                                                    </Text>
                                                ) : (
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                                            {booking.services.map(svc => {
                                                                const selected = booking.serviceId === svc.id;
                                                                return (
                                                                    <Pressable key={svc.id}
                                                                        onPress={() => {
                                                                            booking.setServiceId(svc.id);
                                                                            booking.setServiceName(svc.name);
                                                                        }}
                                                                        style={[md.chip, {
                                                                            paddingHorizontal: 12, paddingVertical: 8,
                                                                            borderWidth: selected ? 2 : 1,
                                                                            borderColor: selected ? '#7C3AED' : '#E5E7EB',
                                                                            backgroundColor: selected ? '#EDE9FE' : '#FFF',
                                                                            maxWidth: 200,
                                                                        }]}>
                                                                        <Text style={{ fontSize: 12, fontWeight: selected ? '700' : '400', color: selected ? '#6D28D9' : '#374151' }}>
                                                                            {svc.name}
                                                                        </Text>
                                                                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                                                                            {svc.duration}min · ₹{svc.price}
                                                                        </Text>
                                                                    </Pressable>
                                                                );
                                                            })}
                                                        </View>
                                                    </ScrollView>
                                                )}

                                                {/* 3. Date picker */}
                                                <Text style={[md.label, { color: '#7C3AED' }]}>3. Booking Date</Text>
                                                <DatePickerInput
                                                    label="Appointment Date"
                                                    value={booking.bookingDate}
                                                    onChange={v => booking.setBookingDate(v)}
                                                />

                                                {/* 4. Available slots from DINGG */}
                                                <Text style={[md.label, { color: '#7C3AED', marginTop: 10 }]}>
                                                    4. Available Time Slots
                                                    {booking.slot && (
                                                        <Text style={{ color: '#059669', fontWeight: '700' }}>
                                                            {' '}— {booking.slot.label} selected ✓
                                                        </Text>
                                                    )}
                                                </Text>

                                                {booking.loadingSlots ? (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                                        <ActivityIndicator size="small" color="#7C3AED" />
                                                        <Text style={{ color: '#7C3AED', fontSize: 12 }}>Fetching available slots from DINGG…</Text>
                                                    </View>
                                                ) : booking.slots.length === 0 ? (
                                                    <View style={{ padding: 12, backgroundColor: '#FEF2F2', borderRadius: 8, marginBottom: 14 }}>
                                                        <Text style={{ color: '#B91C1C', fontSize: 12, textAlign: 'center' }}>
                                                            No available slots for {booking.bookingDate}.{'\n'}Try a different date or service.
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'nowrap' }}>
                                                            {booking.slots.map((s, idx) => {
                                                                const selected = booking.slot?.startTime === s.startTime && booking.slot?.date === s.date;
                                                                return (
                                                                    <Pressable key={`${s.date}-${s.startTime}-${idx}`}
                                                                        onPress={() => booking.setSlot(selected ? null : s)}
                                                                        style={{
                                                                            paddingHorizontal: 14, paddingVertical: 10,
                                                                            borderRadius: 10, borderWidth: 2,
                                                                            borderColor: selected ? '#059669' : '#7C3AED',
                                                                            backgroundColor: selected ? '#D1FAE5' : '#EDE9FE',
                                                                        }}>
                                                                        <Text style={{ fontSize: 13, fontWeight: '700', color: selected ? '#065F46' : '#5B21B6' }}>
                                                                            {s.label}
                                                                        </Text>
                                                                        {selected && <Text style={{ fontSize: 10, color: '#059669', textAlign: 'center' }}>✓</Text>}
                                                                    </Pressable>
                                                                );
                                                            })}
                                                        </View>
                                                    </ScrollView>
                                                )}
                                            </>
                                        )}

                                        {/* Validation summary */}
                                        {!booking.isValid && booking.ecId && (
                                            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                                                ⚠️ Select a time slot to proceed
                                            </Text>
                                        )}
                                        {!booking.ecId && dinggEcs.length > 0 && (
                                            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600' }}>
                                                ⚠️ Select an experience centre above
                                            </Text>
                                        )}
                                        {dinggEcs.length === 0 && (
                                            <Text style={{ color: '#059669', fontSize: 12, fontWeight: '600', marginTop: 12 }}>
                                                ✓ You can save this lead (DINGG Booking will be skipped).
                                            </Text>
                                        )}
                                    </View>
                                );
                            })()}

                            {/* ── Home Trial (HT) Assignment ── */}
                            {editForm.status === 'converted:Marked to HT' && (() => {
                                // Extract unique cities from fieldAgents that have a channelierEmployeeId
                                const validAgents = fieldAgents.filter(a => a.channelierEmployeeId);
                                const availableCities = Array.from(new Set(validAgents.flatMap(a => a.deployedCities || []))).sort();
                                
                                const selectedCity = editForm.htCity;
                                // Filter agents deployed in the selected city
                                const cityAgents = selectedCity ? validAgents.filter(a => (a.deployedCities || []).includes(selectedCity)) : [];
                                
                                const isValid = !!(editForm.htCity && editForm.htAgentId && editForm.bookedDate && editForm.bookedTimeSlot && editForm.consultationType);

                                return (
                                    <View style={{
                                        marginTop: 8,
                                        borderWidth: 2,
                                        borderColor: isValid ? '#059669' : '#EA580C',
                                        borderRadius: 12,
                                        padding: 14,
                                        backgroundColor: isValid ? '#F0FDF4' : '#FFF7ED',
                                    }}>
                                        {/* Header */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                                            <Text style={{ fontSize: 15, fontWeight: '700', color: '#EA580C' }}>
                                                🏠 Home Trial Assignment
                                            </Text>
                                            <View style={{
                                                backgroundColor: isValid ? '#D1FAE5' : '#FFEDD5',
                                                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2,
                                            }}>
                                                <Text style={{ fontSize: 11, fontWeight: '700', color: isValid ? '#065F46' : '#C2410C' }}>
                                                    {isValid ? '✓ Ready to sync' : 'Required'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* 1. City selector */}
                                        <Text style={[md.label, { color: '#EA580C' }]}>1. Select City</Text>
                                        {availableCities.length === 0 ? (
                                            <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 12 }}>
                                                ⚠️ No valid field agents with Channelier IDs found.
                                            </Text>
                                        ) : (
                                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    {availableCities.map(city => {
                                                        const selected = editForm.htCity === city;
                                                        return (
                                                            <Pressable key={city}
                                                                onPress={() => setEditForm((f: any) => ({ ...f, htCity: city, htAgentId: '' }))}
                                                                style={[md.chip, {
                                                                    paddingHorizontal: 14, paddingVertical: 8,
                                                                    borderWidth: selected ? 2 : 1,
                                                                    borderColor: selected ? '#EA580C' : '#E5E7EB',
                                                                    backgroundColor: selected ? '#FFEDD5' : '#FFF',
                                                                }]}>
                                                                <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '500', color: selected ? '#9A3412' : '#374151' }}>
                                                                    {city}
                                                                </Text>
                                                            </Pressable>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        )}

                                        {/* 2. Agent selector */}
                                        {editForm.htCity && (
                                            <>
                                                <Text style={[md.label, { color: '#EA580C' }]}>2. Select Field Agent</Text>
                                                {cityAgents.length === 0 ? (
                                                    <Text style={{ color: '#DC2626', fontSize: 12, marginBottom: 14 }}>
                                                        No agents found deployed in {selectedCity}.
                                                    </Text>
                                                ) : (
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                                            {cityAgents.map(ag => {
                                                                const selected = editForm.htAgentId === ag.id;
                                                                return (
                                                                    <Pressable key={ag.id}
                                                                        onPress={() => setEditForm((f: any) => ({ ...f, htAgentId: ag.id }))}
                                                                        style={[md.chip, {
                                                                            paddingHorizontal: 12, paddingVertical: 8,
                                                                            borderWidth: selected ? 2 : 1,
                                                                            borderColor: selected ? '#CA8A04' : '#E5E7EB',
                                                                            backgroundColor: selected ? '#FEF9C3' : '#FFF',
                                                                        }]}>
                                                                        <Text style={{ fontSize: 13, fontWeight: selected ? '700' : '400', color: selected ? '#854D0E' : '#374151' }}>
                                                                            {ag.name}
                                                                        </Text>
                                                                        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
                                                                            ID: {ag.channelierEmployeeId}
                                                                        </Text>
                                                                    </Pressable>
                                                                );
                                                            })}
                                                        </View>
                                                    </ScrollView>
                                                )}
                                            </>
                                        )}

                                        {/* Validation summary */}
                                        {!isValid && availableCities.length > 0 && (
                                            <Text style={{ color: '#DC2626', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                                                ⚠️ Please complete City, Agent, and the Appointment section above.
                                            </Text>
                                        )}
                                        {availableCities.length === 0 && (
                                            <Text style={{ color: '#059669', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                                                ✓ You can save this lead (Channelier CRM Sync will be skipped).
                                            </Text>
                                        )}
                                    </View>
                                );
                            })()}

                            {/* Non-EC: static time slot picker */}
                            {editForm.status !== 'converted:Marked to EC' && (
                                <>
                                    <Text style={[md.label, { marginTop: 6 }]}>Time Slot</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                            {['8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'].map(s => (
                                                <Pressable key={s}
                                                    onPress={() => setEditForm((f: any) => ({ ...f, bookedTimeSlot: editForm.bookedTimeSlot === s ? '' : s }))}
                                                    style={[md.chip, { paddingHorizontal: 10, paddingVertical: 6 },
                                                    editForm.bookedTimeSlot === s && { backgroundColor: '#EDE9FE', borderColor: '#7C3AED', borderWidth: 2 }]}>
                                                    <Text style={{ color: editForm.bookedTimeSlot === s ? '#7C3AED' : Colors.text, fontSize: 11, fontWeight: editForm.bookedTimeSlot === s ? '700' : '400' }}>{s}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </>
                            )}

                            {/* Non-HT: Preferred EC list */}
                            {editForm.status !== 'converted:Marked to HT' && (
                                <>
                                    <Text style={[md.label, { marginTop: 6 }]}>Preferred Experience Center</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                                        <View style={{ flexDirection: 'row', gap: 6 }}>
                                            {experienceCenters.map((ec: any) => (
                                                <Pressable key={ec.id}
                                                    onPress={() => setEditForm((f: any) => ({ ...f, preferredExperienceCenter: ec.name }))}
                                                    style={[md.chip, editForm.preferredExperienceCenter === ec.name && { backgroundColor: '#EEF2FF', borderColor: '#4338CA', borderWidth: 2 }]}>
                                                    <Text style={{ color: editForm.preferredExperienceCenter === ec.name ? '#4338CA' : Colors.text, fontSize: 12 }}>{ec.name}</Text>
                                                </Pressable>
                                            ))}
                                        </View>
                                    </ScrollView>
                                </>
                            )}
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
                                const already: string[] = (editForm.products ?? []).map((p: any) => p.productTitle);
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
                                                        products: [...(f.products ?? []), {
                                                            productId: p.id,
                                                            productTitle: p.title,
                                                            quantity: 1,
                                                            options: [],
                                                        }],
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
                            {(editForm.products ?? []).length > 0 && (
                                <View style={{ gap: 10, marginBottom: 6 }}>
                                    {(editForm.products ?? []).map((formProduct: any, prodIdx: number) => {
                                        const prod = products.find(p => p.title === formProduct.productTitle);
                                        return (
                                            <View key={formProduct.productTitle} style={{
                                                backgroundColor: '#F8F9FF', borderRadius: 10,
                                                borderWidth: 1.5, borderColor: '#C7D2FE',
                                                padding: 12,
                                            }}>
                                                {/* Product header row */}
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#3730A3', flex: 1, marginRight: 8 }} numberOfLines={2}>{formProduct.productTitle}</Text>
                                                    <Pressable
                                                        onPress={() => setEditForm((f: any) => ({
                                                            ...f,
                                                            products: (f.products ?? []).filter((_: any, i: number) => i !== prodIdx),
                                                        }))}
                                                        style={{ padding: 4 }}
                                                    >
                                                        <Text style={{ fontSize: 16, color: '#EF4444', lineHeight: 18 }}>✕</Text>
                                                    </Pressable>
                                                </View>

                                                {/* Option selectors */}
                                                {prod?.options?.map((opt: { name: string; values: string[] }) => {
                                                    const selected = (formProduct.options ?? []).find((o: any) => o.name === opt.name)?.value;
                                                    return (
                                                        <View key={opt.name} style={{ marginBottom: 8 }}>
                                                            <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600', marginBottom: 5 }}>{opt.name}</Text>
                                                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                                                    {opt.values.map((val: string) => {
                                                                        const isChosen = selected === val;
                                                                        return (
                                                                            <Pressable key={val}
                                                                                onPress={() => setEditForm((f: any) => {
                                                                                    const prods = [...(f.products ?? [])];
                                                                                    const target = { ...prods[prodIdx] };
                                                                                    const opts = [...(target.options ?? [])];
                                                                                    const existIdx = opts.findIndex((o: any) => o.name === opt.name);
                                                                                    if (existIdx >= 0) {
                                                                                        opts[existIdx] = { name: opt.name, value: val };
                                                                                    } else {
                                                                                        opts.push({ name: opt.name, value: val });
                                                                                    }
                                                                                    target.options = opts;
                                                                                    prods[prodIdx] = target;
                                                                                    return { ...f, products: prods };
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
                                                    );
                                                })}
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
                            <HistoryAccordionView historyData={historyData} />
                        )}

                        <View style={{ marginTop: 20, alignItems: 'flex-end' }}>
                            <Button onPress={() => setHistoryLead(null)}>Close</Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal >

            {/* ── Click-to-Call Confirmation Modal ── */}
            {
                callLead && (
                    <CallConfirmModal
                        lead={callLead}
                        agentPhone={user?.phone ?? ''}
                        onClose={() => setCallLead(null)}
                    />
                )
            }

            {/* ── Add New Lead Modal ── */}
            <AddLeadModal
                visible={addLeadVisible}
                onClose={() => setAddLeadVisible(false)}
                onDone={() => { loadLeads(1); }}
            />

            {/* ── Reassign Lead Modal ── */}
            {reassignLead && (
                <ReassignLeadModal
                    lead={reassignLead}
                    visible={!!reassignLead}
                    onClose={() => setReassignLead(null)}
                    onDone={() => loadLeads(page)}
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
        maxWidth: 860, alignSelf: 'center', width: '100%', maxHeight: '90%',
    },
});
