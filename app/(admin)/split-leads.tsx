import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View, StyleSheet, ScrollView, RefreshControl,
    Animated, Pressable, Alert, TextInput,
} from 'react-native';
import {
    Text, Card, ActivityIndicator, Button, Divider,
    Menu, IconButton, Chip, Portal, Modal,
} from 'react-native-paper';
import AdminPageLayout from '../../components/AdminPageLayout';
import api from '../../services/api';
import { Colors } from '../../constants/Colors';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CallerRef { id: string; name: string; }

interface LeadItem {
    id: string;
    source: string;
    status: string;
    leadCategory: string;
    createdAt: string;
    assignedToId: string | null;
    assignedToName: string | null;
}

interface SplitItem {
    customerId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    distinctCallerCount: number;
    callers: CallerRef[];
    leads: LeadItem[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
    new:           { color: '#1D4ED8', bg: '#DBEAFE' },
    contacted:     { color: '#065F46', bg: '#D1FAE5' },
    reminder_set:  { color: '#92400E', bg: '#FEF3C7' },
    dropped:       { color: '#7F1D1D', bg: '#FEE2E2' },
};
const statusStyle = (s: string) =>
    STATUS_COLORS[s?.toLowerCase()] ?? { color: '#374151', bg: '#F3F4F6' };

const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const CALLER_PALETTE = [
    '#6366F1', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#06B6D4', '#F97316', '#EC4899',
];
const callerColor = (idx: number) => CALLER_PALETTE[idx % CALLER_PALETTE.length];

// ── Accordion Row ─────────────────────────────────────────────────────────────

function AccordionRow({
    item, callerList, onConsolidated,
}: {
    item: SplitItem;
    callerList: CallerRef[];
    onConsolidated: (customerId: string) => void;
}) {
    const [open, setOpen]           = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [selectedCallerId, setSelectedCallerId] = useState<string | null>(null);
    const [selectedCallerName, setSelectedCallerName] = useState<string>('');
    const [saving, setSaving]       = useState(false);

    const animHeight = useRef(new Animated.Value(0)).current;
    const animOpacity = useRef(new Animated.Value(0)).current;

    const toggle = () => {
        if (open) {
            Animated.parallel([
                Animated.timing(animHeight,  { toValue: 0, duration: 200, useNativeDriver: false }),
                Animated.timing(animOpacity, { toValue: 0, duration: 150, useNativeDriver: false }),
            ]).start(() => setOpen(false));
        } else {
            setOpen(true);
            Animated.parallel([
                Animated.timing(animHeight,  { toValue: 1, duration: 250, useNativeDriver: false }),
                Animated.timing(animOpacity, { toValue: 1, duration: 250, useNativeDriver: false }),
            ]).start();
        }
    };

    const handleConsolidate = async () => {
        if (!selectedCallerId) return;
        setSaving(true);
        try {
            const res = await api.post('/admin/split-leads/consolidate', {
                customerId: item.customerId,
                assignedToId: selectedCallerId,
            });
            Alert.alert(
                '✅ Done',
                `${res.data?.updated ?? 0} leads reassigned to ${selectedCallerName}.`,
                [{ text: 'OK', onPress: () => onConsolidated(item.customerId) }],
            );
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message ?? 'Consolidation failed.');
        } finally {
            setSaving(false);
        }
    };

    // build the animated max-height from 0..1
    const maxH = animHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 800] });

    return (
        <View style={styles.accordionItem}>
            {/* ── Header ── */}
            <Pressable onPress={toggle} style={({ pressed }) => [styles.accordionHeader, pressed && { opacity: 0.9 }]}>
                <View style={{ flex: 1 }}>
                    {/* Customer info */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <Text style={styles.customerName}>{item.customerName || 'Unknown'}</Text>
                        <View style={styles.splitBadge}>
                            <Text style={styles.splitBadgeText}>
                                {item.distinctCallerCount} callers
                            </Text>
                        </View>
                        <Text style={styles.leadCountText}>{item.leads.length} lead{item.leads.length !== 1 ? 's' : ''}</Text>
                    </View>

                    {/* Phone + email */}
                    <Text style={styles.customerMeta}>
                        {[item.customerPhone, item.customerEmail].filter(Boolean).join('  ·  ')}
                    </Text>

                    {/* Caller chips */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                        {item.callers.map((c, i) => (
                            <View key={c.id} style={[styles.callerPill, { backgroundColor: `${callerColor(i)}18`, borderColor: callerColor(i) }]}>
                                <Text style={[styles.callerPillText, { color: callerColor(i) }]}>
                                    👤 {c.name}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
                <Text style={[styles.chevron, open && styles.chevronOpen]}>{open ? '▲' : '▼'}</Text>
            </Pressable>

            {/* ── Expanded body ── */}
            {open && (
                <Animated.View style={[styles.accordionBody, { maxHeight: maxH, opacity: animOpacity }]}>
                    <Divider style={{ marginBottom: 12 }} />

                    {/* Lead rows */}
                    <Text style={styles.sectionLabel}>Leads</Text>
                    {item.leads.map((lead, li) => {
                        const callerIdx = item.callers.findIndex(c => c.id === lead.assignedToId);
                        const cc = callerColor(callerIdx >= 0 ? callerIdx : 0);
                        const ss = statusStyle(lead.status);
                        return (
                            <View key={lead.id} style={[styles.leadRow, { borderLeftColor: cc }]}>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                                        {/* Status chip */}
                                        <View style={[styles.chip, { backgroundColor: ss.bg }]}>
                                            <Text style={[styles.chipText, { color: ss.color }]}>
                                                {lead.status?.replace(/_/g, ' ')}
                                            </Text>
                                        </View>
                                        {/* Category chip */}
                                        <View style={[styles.chip, { backgroundColor: '#F5F3FF' }]}>
                                            <Text style={[styles.chipText, { color: '#5B21B6' }]}>{lead.leadCategory}</Text>
                                        </View>
                                        {/* Source */}
                                        <Text style={styles.leadMeta}>{lead.source}</Text>
                                    </View>
                                    <Text style={styles.leadMeta}>Created: {fmtDate(lead.createdAt)}</Text>
                                </View>
                                {/* Caller indicator */}
                                <View style={[styles.callerTag, { backgroundColor: `${cc}18`, borderColor: cc }]}>
                                    <Text style={[styles.callerTagText, { color: cc }]}>
                                        {lead.assignedToName ?? 'Unassigned'}
                                    </Text>
                                </View>
                            </View>
                        );
                    })}

                    {/* Consolidate section */}
                    <View style={styles.consolidateBox}>
                        <Text style={styles.sectionLabel}>Consolidate to one caller</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <Menu
                                visible={menuVisible}
                                onDismiss={() => setMenuVisible(false)}
                                anchor={
                                    <Pressable
                                        onPress={() => setMenuVisible(true)}
                                        style={styles.callerDropdown}
                                    >
                                        <Text style={styles.callerDropdownText}>
                                            {selectedCallerName || 'Select caller…'}
                                        </Text>
                                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>▼</Text>
                                    </Pressable>
                                }
                                contentStyle={{ backgroundColor: '#fff', borderRadius: 8 }}
                            >
                                {callerList.map(c => (
                                    <Menu.Item
                                        key={c.id}
                                        title={c.name}
                                        onPress={() => {
                                            setSelectedCallerId(c.id);
                                            setSelectedCallerName(c.name);
                                            setMenuVisible(false);
                                        }}
                                        leadingIcon={selectedCallerId === c.id ? 'check' : 'account'}
                                    />
                                ))}
                            </Menu>

                            <Button
                                mode="contained"
                                onPress={handleConsolidate}
                                loading={saving}
                                disabled={!selectedCallerId || saving}
                                style={styles.consolidateBtn}
                                labelStyle={{ fontSize: 13 }}
                                icon="account-convert"
                                buttonColor="#6366F1"
                            >
                                Reassign All
                            </Button>
                        </View>
                    </View>
                </Animated.View>
            )}
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 30;

export default function SplitLeadsScreen() {
    const [items, setItems]           = useState<SplitItem[]>([]);
    const [callerList, setCallerList] = useState<CallerRef[]>([]);
    const [total, setTotal]           = useState(0);
    const [page, setPage]             = useState(1);
    const [loading, setLoading]       = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [callerSearch, setCallerSearch] = useState('');
    const [phoneSearch,  setPhoneSearch]  = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const fetchData = useCallback(async (p = 1, caller = callerSearch, phone = phoneSearch) => {
        try {
            const [splitRes, callerRes] = await Promise.all([
                api.get('/admin/split-leads', { params: {
                    page: p, limit: PAGE_SIZE,
                    ...(caller?.trim()  ? { callerName: caller.trim() } : {}),
                    ...(phone?.trim()   ? { phone:      phone.trim()  } : {}),
                } }),
                api.get('/admin/lead-callers'),
            ]);
            setItems(splitRes.data?.items ?? []);
            setTotal(splitRes.data?.total ?? 0);
            setPage(p);
            // normalise caller list
            const callers: CallerRef[] = (callerRes.data ?? []).map((c: any) => ({
                id: c.id,
                name: c.name,
            }));
            setCallerList(callers);
        } catch (err) {
            console.error('Split leads fetch failed:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(1, '', ''); }, []);

    const onRefresh = () => { setRefreshing(true); fetchData(1, callerSearch, phoneSearch); };

    // Debounced search: fires 500ms after the user stops typing
    const handleSearchChange = (field: 'caller' | 'phone', value: string) => {
        if (field === 'caller') setCallerSearch(value);
        else setPhoneSearch(value);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setLoading(true);
            setPage(1);
            const caller = field === 'caller' ? value : callerSearch;
            const phone  = field === 'phone'  ? value : phoneSearch;
            fetchData(1, caller, phone);
        }, 500);
    };

    const clearSearch = () => {
        setCallerSearch('');
        setPhoneSearch('');
        setLoading(true);
        fetchData(1, '', '');
    };

    const hasSearch = callerSearch.trim() !== '' || phoneSearch.trim() !== '';

    const handleConsolidated = (customerId: string) => {
        // Remove the item from the list after consolidation
        setItems(prev => prev.filter(i => i.customerId !== customerId));
        setTotal(t => Math.max(0, t - 1));
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <AdminPageLayout>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* ── Header ─────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.pageTitle}>🔀 Split Leads</Text>
                        <Text style={styles.pageSubtitle}>
                            {total} customer{total !== 1 ? 's' : ''} with leads assigned to multiple callers
                        </Text>
                    </View>
                    <Button mode="outlined" icon="refresh" onPress={onRefresh} loading={refreshing} compact>
                        Refresh
                    </Button>
                </View>

                {/* ── Search Bar ─────────────────────────────────────── */}
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by caller name…"
                            placeholderTextColor="#9CA3AF"
                            value={callerSearch}
                            onChangeText={v => handleSearchChange('caller', v)}
                        />
                    </View>
                    <View style={styles.searchBox}>
                        <Text style={styles.searchIcon}>📱</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by phone number…"
                            placeholderTextColor="#9CA3AF"
                            value={phoneSearch}
                            onChangeText={v => handleSearchChange('phone', v)}
                            keyboardType="phone-pad"
                        />
                    </View>
                    {hasSearch && (
                        <Pressable onPress={clearSearch} style={styles.clearBtn}>
                            <Text style={styles.clearBtnText}>✕ Clear</Text>
                        </Pressable>
                    )}
                </View>

                {/* ── Info banner ─────────────────────────────────────── */}
                <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>
                        💡 These customers have leads tracked across more than one caller.
                        Expand each row to view the leads, select a single caller, and tap
                        "Reassign All" to consolidate.
                    </Text>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 60 }} />
                ) : items.length === 0 ? (
                    <Card mode="elevated" elevation={1} style={styles.emptyCard}>
                        <View style={{ padding: 48, alignItems: 'center' }}>
                            <Text style={{ fontSize: 40 }}>✅</Text>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 12 }}>
                                No split leads found
                            </Text>
                            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginTop: 6, textAlign: 'center' }}>
                                Every customer's leads are currently assigned to the same caller.
                            </Text>
                        </View>
                    </Card>
                ) : (
                    <>
                        <Card mode="elevated" elevation={1} style={styles.listCard}>
                            {items.map((item, idx) => (
                                <View key={item.customerId}>
                                    {idx > 0 && <Divider />}
                                    <AccordionRow
                                        item={item}
                                        callerList={callerList}
                                        onConsolidated={handleConsolidated}
                                    />
                                </View>
                            ))}
                        </Card>

                        {/* ── Pagination ─────────────────────────────────── */}
                        {totalPages > 1 && (
                            <View style={styles.pagination}>
                                <Button
                                    mode="outlined"
                                    onPress={() => fetchData(page - 1)}
                                    disabled={page <= 1}
                                    compact
                                    icon="chevron-left"
                                >
                                    Prev
                                </Button>
                                <Text style={styles.paginationLabel}>
                                    Page {page} of {totalPages}
                                </Text>
                                <Button
                                    mode="outlined"
                                    onPress={() => fetchData(page + 1)}
                                    disabled={page >= totalPages}
                                    compact
                                    icon="chevron-right"
                                    contentStyle={{ flexDirection: 'row-reverse' }}
                                >
                                    Next
                                </Button>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
        </AdminPageLayout>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14,
    },
    pageTitle:    { fontSize: 22, fontWeight: '800', color: Colors.text },
    pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

    // Search bar
    searchRow: {
        flexDirection: 'row', alignItems: 'center',
        gap: 8, marginBottom: 12, flexWrap: 'wrap',
    },
    searchBox: {
        flex: 1, minWidth: 180,
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E7EB',
        paddingHorizontal: 10, paddingVertical: 6,
        gap: 6,
    },
    searchIcon: { fontSize: 14 },
    searchInput: {
        flex: 1, fontSize: 13, color: '#111827',
        outline: 'none',
    } as any,
    clearBtn: {
        backgroundColor: '#FEE2E2', borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 7,
    },
    clearBtnText: { fontSize: 12, fontWeight: '700', color: '#B91C1C' },

    infoBanner: {
        backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12,
        marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#6366F1',
    },
    infoBannerText: { fontSize: 13, color: '#1E40AF', lineHeight: 19 },

    listCard:  { borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 16 },
    emptyCard: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },

    // Accordion
    accordionItem: { overflow: 'hidden' },
    accordionHeader: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: 18, paddingVertical: 14, gap: 10,
    },
    chevron: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
    chevronOpen: { color: '#6366F1' },

    customerName:   { fontSize: 15, fontWeight: '800', color: '#111827' },
    customerMeta:   { fontSize: 12, color: '#9CA3AF', marginTop: 3 },
    leadCountText:  { fontSize: 12, color: '#6B7280', fontWeight: '600' },

    splitBadge: {
        backgroundColor: '#FEF3C7', borderRadius: 10,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    splitBadgeText: { fontSize: 11, fontWeight: '800', color: '#92400E' },

    callerPill: {
        borderRadius: 12, borderWidth: 1,
        paddingHorizontal: 8, paddingVertical: 3,
    },
    callerPillText: { fontSize: 11, fontWeight: '700' },

    // Expanded body
    accordionBody: {
        overflow: 'hidden', paddingHorizontal: 18, paddingBottom: 16,
    },
    sectionLabel: {
        fontSize: 11, fontWeight: '700', color: '#6B7280',
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
    },

    // Lead rows
    leadRow: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#FAFAFA', borderRadius: 8,
        padding: 10, marginBottom: 6,
        borderLeftWidth: 3,
    },
    leadMeta: { fontSize: 12, color: '#6B7280' },

    chip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
    chipText: { fontSize: 11, fontWeight: '700' },

    callerTag: {
        borderRadius: 8, borderWidth: 1,
        paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8,
    },
    callerTagText: { fontSize: 11, fontWeight: '700' },

    // Consolidate box
    consolidateBox: {
        backgroundColor: '#F5F3FF', borderRadius: 10,
        padding: 12, marginTop: 12,
        borderWidth: 1, borderColor: '#DDD6FE',
    },
    callerDropdown: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#fff', borderRadius: 8, borderWidth: 1,
        borderColor: '#C4B5FD', paddingHorizontal: 12, paddingVertical: 8,
        minWidth: 200,
    },
    callerDropdownText: { flex: 1, fontSize: 13, color: '#374151', fontWeight: '600' },
    consolidateBtn: { borderRadius: 8 },

    // Pagination
    pagination: {
        flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', gap: 16, paddingTop: 8,
    },
    paginationLabel: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
});
