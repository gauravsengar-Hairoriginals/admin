import React, { useState, useEffect, useCallback } from 'react';
import {
    View, ScrollView, StyleSheet, RefreshControl, Pressable, Modal, FlatList,
} from 'react-native';
import {
    Text, Card, ActivityIndicator, Button, SegmentedButtons,
} from 'react-native-paper';
import AdminPageLayout from '../../components/AdminPageLayout';
import api from '../../services/api';
import { Colors } from '../../constants/Colors';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatusRow {
    status: string;
    label: string;
    dayCounts: number[];
    rowTotal: number;
}

interface CategoryReport {
    category: string;
    statusRows: StatusRow[];
    dayTotals: number[];
    grandTotal: number;
}

interface CallerReport {
    callerId: string;
    callerName: string;
    statusRows: StatusRow[];
    dayTotals: number[];
    grandTotal: number;
}

interface DailyAgingData {
    days: string[];
    today: string;
    categories: CategoryReport[];
    overdueCounts: Record<string, number>;
}

interface DailyCallerData {
    days: string[];
    today: string;
    callers: CallerReport[];
    overdueCounts: Record<string, number>;
}

// Drill-down context: what cell was tapped
interface DrillContext {
    title: string;
    /** null date = overdue (no date filter, use tab=reminder) */
    date: string | null;
    status: string | null;
    leadCategory?: string;
    assignedToId?: string;
    callerName?: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string; emoji: string }> = {
    HT:      { label: 'HT',      emoji: '🟢', color: '#065F46', bg: '#F0FDF4', border: '#6EE7B7' },
    EC:      { label: 'EC',      emoji: '🔵', color: '#1E40AF', bg: '#EFF6FF', border: '#93C5FD' },
    POPIN:   { label: 'Popin',   emoji: '🟡', color: '#92400E', bg: '#FFFBEB', border: '#FCD34D' },
    WEBSITE: { label: 'Website', emoji: '🟣', color: '#5B21B6', bg: '#FAF5FF', border: '#C4B5FD' },
    OTHER:   { label: 'Other',   emoji: '⚪', color: '#374151', bg: '#F9FAFB', border: '#D1D5DB' },
};

const CALLER_PALETTE = [
    { color: '#1E40AF', bg: '#EFF6FF', border: '#93C5FD' },
    { color: '#065F46', bg: '#F0FDF4', border: '#6EE7B7' },
    { color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
    { color: '#92400E', bg: '#FFFBEB', border: '#FCD34D' },
    { color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
    { color: '#BE123C', bg: '#FFF1F2', border: '#FECDD3' },
    { color: '#1D4ED8', bg: '#DBEAFE', border: '#93C5FD' },
    { color: '#6D28D9', bg: '#EDE9FE', border: '#C4B5FD' },
    { color: '#9A3412', bg: '#FFF7ED', border: '#FED7AA' },
    { color: '#155E75', bg: '#ECFEFF', border: '#A5F3FC' },
];

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
    'new':                     { color: '#0369A1', bg: '#E0F2FE' },
    'contacted':               { color: '#7C3AED', bg: '#EDE9FE' },
    'converted:Marked to HT':  { color: '#065F46', bg: '#D1FAE5' },
    'converted:Marked to EC':  { color: '#1E40AF', bg: '#DBEAFE' },
    'converted:Marked to VC':  { color: '#92400E', bg: '#FEF3C7' },
    'dropped':                 { color: '#991B1B', bg: '#FEE2E2' },
};

const DAY_NAMES   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatDay = (dateStr: string): { weekday: string; date: string } => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return { weekday: DAY_NAMES[dt.getDay()], date: `${d} ${MONTH_NAMES[m - 1]}` };
};

const fmtStatus = (status: string): string => {
    const map: Record<string, string> = {
        'new': 'Fresh', 'contacted': 'Contacted', 'dropped': 'Dropped',
        'converted:Marked to HT': 'Booked HT',
        'converted:Marked to EC': 'Booked EC',
        'converted:Marked to VC': 'Booked VC',
    };
    return map[status] ?? status;
};

const DAY_COL_W = 70;
const LABEL_W   = 152;

// ── Drill-Down Modal ──────────────────────────────────────────────────────────

function DrillDownModal({
    ctx, onClose,
}: { ctx: DrillContext | null; onClose: () => void }) {
    const [leads, setLeads]     = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal]     = useState(0);
    const [page, setPage]       = useState(1);
    const PAGE = 20;

    const fetchLeads = useCallback(async (p = 1) => {
        if (!ctx) return;
        setLoading(true);
        try {
            const params: Record<string, any> = { page: p, limit: PAGE };
            if (ctx.leadCategory) params.leadCategory = ctx.leadCategory;
            if (ctx.assignedToId) params.assignedToId = ctx.assignedToId;

            if (ctx.date === null) {
                // Overdue cell — use reminder tab
                params.tab = 'reminder';
            } else {
                if (ctx.status) params.status = ctx.status;
                params.fromDate = ctx.date;
                params.toDate   = ctx.date;
            }

            const res = await api.get('/leads', { params });
            if (p === 1) {
                setLeads(res.data.leads ?? []);
            } else {
                setLeads(prev => [...prev, ...(res.data.leads ?? [])]);
            }
            setTotal(res.data.total ?? 0);
            setPage(p);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [ctx]);

    useEffect(() => {
        if (ctx) {
            setLeads([]);
            setTotal(0);
            setPage(1);
            fetchLeads(1);
        }
    }, [ctx]);

    const renderLead = ({ item }: { item: any }) => {
        const sStyle = STATUS_STYLE[item.status] ?? { color: '#374151', bg: '#F3F4F6' };
        const createdAt = new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
        });
        return (
            <View style={dd.leadRow}>
                <View style={{ flex: 1 }}>
                    <Text style={dd.leadName} numberOfLines={1}>
                        {item.customer?.name ?? '—'}
                    </Text>
                    <Text style={dd.leadPhone}>{item.customer?.phone ?? '—'}</Text>
                    {item.customer?.city ? (
                        <Text style={dd.leadCity}>📍 {item.customer.city}</Text>
                    ) : null}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[dd.statusBadge, { backgroundColor: sStyle.bg }]}>
                        <Text style={[dd.statusText, { color: sStyle.color }]}>
                            {fmtStatus(item.status)}
                        </Text>
                    </View>
                    <Text style={dd.callerText}>
                        {item.assignedToName ? `👤 ${item.assignedToName}` : '⚠️ Unassigned'}
                    </Text>
                    <Text style={dd.dateText}>{createdAt}</Text>
                </View>
            </View>
        );
    };

    return (
        <Modal visible={!!ctx} onRequestClose={onClose} animationType="slide" transparent>
            <View style={dd.overlay}>
                <View style={dd.sheet}>
                    {/* Header */}
                    <View style={dd.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={dd.headerTitle} numberOfLines={2}>{ctx?.title}</Text>
                            {!loading && (
                                <Text style={dd.headerSub}>{total} lead{total !== 1 ? 's' : ''}</Text>
                            )}
                        </View>
                        <Pressable onPress={onClose} style={dd.closeBtn}>
                            <Text style={dd.closeText}>✕</Text>
                        </Pressable>
                    </View>

                    {loading && leads.length === 0 ? (
                        <View style={dd.loadingView}>
                            <ActivityIndicator size="large" color={Colors.primary} />
                            <Text style={{ color: Colors.textSecondary, marginTop: 12 }}>Loading leads…</Text>
                        </View>
                    ) : leads.length === 0 ? (
                        <View style={dd.loadingView}>
                            <Text style={{ fontSize: 32 }}>📭</Text>
                            <Text style={{ color: Colors.textSecondary, marginTop: 8 }}>No leads found</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={leads}
                            keyExtractor={item => item.id}
                            renderItem={renderLead}
                            contentContainerStyle={{ paddingBottom: 24 }}
                            ItemSeparatorComponent={() => <View style={dd.separator} />}
                            onEndReached={() => {
                                if (!loading && leads.length < total) fetchLeads(page + 1);
                            }}
                            onEndReachedThreshold={0.3}
                            ListFooterComponent={
                                loading && leads.length > 0
                                    ? <ActivityIndicator style={{ marginVertical: 16 }} color={Colors.primary} />
                                    : leads.length >= total && total > 0
                                        ? <Text style={dd.allLoaded}>All {total} leads loaded</Text>
                                        : null
                            }
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

// ── Shared Grid Card ──────────────────────────────────────────────────────────

const DayGrid = ({
    title, subtitle, grandTotal,
    color, bg, border, emoji,
    statusRows, dayTotals, days, today,
    overdueCount,
    onCellPress,
}: {
    title: string; subtitle: string; grandTotal: number;
    color: string; bg: string; border: string; emoji?: string;
    statusRows: StatusRow[]; dayTotals: number[];
    days: string[]; today: string;
    overdueCount?: number;
    onCellPress: (ctx: DrillContext) => void;
}) => (
    <Card mode="elevated" elevation={2} style={[styles.catCard, { borderLeftColor: color, borderLeftWidth: 5 }]}>
        {/* Card header */}
        <View style={[styles.catHeader, { backgroundColor: bg, borderBottomColor: border }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.catTitle, { color }]}>{emoji ? `${emoji}  ` : ''}{title}</Text>
                <Text style={styles.catSubtitle}>{subtitle}</Text>
            </View>
            <View style={[styles.grandBadge, { backgroundColor: color }]}>
                <Text style={styles.grandBadgeText}>{grandTotal}</Text>
            </View>
        </View>

        {/* Scrollable grid */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
                {/* Column headers */}
                <View style={[styles.gridRow, { backgroundColor: '#F8FAFC' }]}>
                    <View style={[styles.labelCell, styles.headerCell]}>
                        <Text style={styles.headerText}>Status</Text>
                    </View>
                    {days.map(day => {
                        const isToday = day === today;
                        const { weekday, date } = formatDay(day);
                        return (
                            <View
                                key={day}
                                style={[
                                    styles.dayHeaderCell,
                                    isToday && { backgroundColor: bg, borderBottomColor: color, borderBottomWidth: 3 },
                                ]}
                            >
                                <Text style={[styles.dayWeekday, isToday && { color, fontWeight: '800' }]}>{weekday}</Text>
                                <Text style={[styles.dayDate,    isToday && { color, fontWeight: '800' }]}>{date}</Text>
                                {isToday && <View style={[styles.todayPip, { backgroundColor: color }]} />}
                            </View>
                        );
                    })}
                    <View style={styles.totalHeaderCell}>
                        <Text style={styles.headerText}>Total</Text>
                    </View>
                </View>

                {/* ── Overdue row (amber, snapshot of now) */}
                {overdueCount !== undefined && overdueCount > 0 && (
                    <Pressable
                        onPress={() => onCellPress({
                            title: `⏰ Overdue — ${title}`,
                            date: null,
                            status: null,
                        })}
                        style={[styles.gridRow, styles.overdueRow]}
                    >
                        <View style={[styles.labelCell, { borderRightColor: '#D97706' }]}>
                            <View style={styles.overduePill}>
                                <Text style={styles.overdueLabel}>⏰ Overdue</Text>
                            </View>
                        </View>
                        {/* Span all day columns with a single count */}
                        <View style={[{ width: DAY_COL_W * days.length }, styles.overdueSpanCell]}>
                            <Text style={styles.overdueHint}>past next-action-date</Text>
                        </View>
                        <View style={[styles.dataCell, styles.overdueCountCell]}>
                            <Text style={styles.overdueCount}>{overdueCount}</Text>
                        </View>
                    </Pressable>
                )}

                {/* ── New Leads row (daily intake = sum of all statuses) */}
                <View style={[styles.gridRow, styles.newLeadsRow]}>
                    <View style={[styles.labelCell, { borderRightColor: '#6366F1' }]}>
                        <View style={styles.newLeadsPill}>
                            <Text style={styles.newLeadsLabel}>📥 New Leads</Text>
                        </View>
                    </View>
                    {dayTotals.map((total, di) => {
                        const isToday = days[di] === today;
                        return (
                            <View key={di} style={[styles.dataCell, styles.newLeadsCell, isToday && styles.newLeasdCellToday]}>
                                {total > 0
                                    ? <Text style={styles.newLeadsCount}>{total}</Text>
                                    : <Text style={styles.dataCellZero}>—</Text>
                                }
                            </View>
                        );
                    })}
                    {/* Row total */}
                    <View style={[styles.dataCell, styles.newLeadsCell, { backgroundColor: '#4F46E5' }]}>
                        <Text style={[styles.newLeadsCount, { color: '#FFFFFF' }]}>{grandTotal}</Text>
                    </View>
                </View>

                {/* ── Divider between New Leads row and status rows */}
                <View style={styles.newLeadsDivider} />

                {/* Status rows */}
                {statusRows.map((row, ri) => {
                    const sStyle = STATUS_STYLE[row.status] ?? { color: '#374151', bg: '#F9FAFB' };
                    return (
                        <View key={row.status} style={[styles.gridRow, { backgroundColor: ri % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }]}>
                            <View style={styles.labelCell}>
                                <View style={[styles.statusPill, { backgroundColor: sStyle.bg }]}>
                                    <Text style={[styles.statusLabel, { color: sStyle.color }]}>{row.label}</Text>
                                </View>
                            </View>
                            {row.dayCounts.map((count, di) => {
                                const isToday = days[di] === today;
                                const tappable = count > 0;
                                return (
                                    <Pressable
                                        key={di}
                                        disabled={!tappable}
                                        onPress={() => onCellPress({
                                            title: `${row.label} · ${formatDay(days[di]).date}${title ? ` · ${title}` : ''}`,
                                            date: days[di],
                                            status: row.status,
                                        })}
                                        style={({ pressed }) => [
                                            styles.dataCell,
                                            isToday && { backgroundColor: `${bg}CC` },
                                            tappable && pressed && { backgroundColor: `${bg}EE`, transform: [{ scale: 0.95 }] },
                                        ]}
                                    >
                                        {count > 0
                                            ? <Text style={[styles.dataCellCount, { color: sStyle.color }, tappable && styles.tappableCount]}>{count}</Text>
                                            : <Text style={styles.dataCellZero}>—</Text>
                                        }
                                    </Pressable>
                                );
                            })}
                            <Pressable
                                disabled={row.rowTotal === 0}
                                onPress={() => onCellPress({
                                    title: `${row.label} · All Days · ${title}`,
                                    date: null,
                                    status: row.status,
                                })}
                                style={({ pressed }) => [
                                    styles.dataCell, styles.rowTotalCell,
                                    row.rowTotal > 0 && pressed && { opacity: 0.7 },
                                ]}
                            >
                                <Text style={[styles.dataCellCount, { color, fontWeight: '800' }]}>
                                    {row.rowTotal > 0 ? row.rowTotal : '—'}
                                </Text>
                            </Pressable>
                        </View>
                    );
                })}

                {/* Footer totals */}
                <View style={[styles.gridRow, styles.footerRow]}>
                    <View style={[styles.labelCell, styles.footerLabelCell]}>
                        <Text style={[styles.footerLabel, { color }]}>TOTAL</Text>
                    </View>
                    {dayTotals.map((total, di) => {
                        const isToday = days[di] === today;
                        return (
                            <View key={di} style={[styles.dataCell, styles.footerCell, isToday && { backgroundColor: bg }]}>
                                <Text style={[styles.footerCount, { color }]}>{total > 0 ? total : '—'}</Text>
                            </View>
                        );
                    })}
                    <View style={[styles.dataCell, styles.footerCell, styles.grandTotalCell, { backgroundColor: bg }]}>
                        <Text style={[styles.footerCount, { color, fontSize: 16 }]}>{grandTotal}</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    </Card>
);

// ── Category Summary Strip ────────────────────────────────────────────────────

const CategorySummaryStrip = ({
    categories, overdueCounts, onOverdueTap,
}: {
    categories: CategoryReport[];
    overdueCounts: Record<string, number>;
    onOverdueTap: (cat: string) => void;
}) => (
    <View style={styles.summaryStrip}>
        {categories.map(cat => {
            const meta    = CATEGORY_META[cat.category] ?? CATEGORY_META.OTHER;
            const fresh   = cat.statusRows.find(r => r.status === 'new')?.rowTotal ?? 0;
            const contact = cat.statusRows.find(r => r.status === 'contacted')?.rowTotal ?? 0;
            const booked  = cat.statusRows.find(r => r.status.startsWith('converted:'))?.rowTotal ?? 0;
            const dropped = cat.statusRows.find(r => r.status === 'dropped')?.rowTotal ?? 0;
            const overdue = overdueCounts[cat.category] ?? 0;
            return (
                <View key={cat.category} style={[styles.summaryCard, { borderColor: meta.border, backgroundColor: meta.bg }]}>
                    <Text style={[styles.summaryTitle, { color: meta.color }]}>{meta.emoji} {meta.label}</Text>
                    <Text style={styles.summaryGrand}>{cat.grandTotal}</Text>
                    <View style={styles.summaryPills}>
                        {[
                            { label: '🆕', val: fresh,   color: '#0369A1' },
                            { label: '📞', val: contact, color: '#7C3AED' },
                            { label: '✅', val: booked,  color: meta.color },
                            { label: '🚫', val: dropped, color: '#991B1B' },
                        ].map((p, i) => (
                            <View key={i} style={styles.summaryPill}>
                                <Text style={[styles.summaryPillText, { color: p.color }]}>{p.label} {p.val}</Text>
                            </View>
                        ))}
                    </View>
                    {overdue > 0 && (
                        <Pressable onPress={() => onOverdueTap(cat.category)} style={styles.overdueChip}>
                            <Text style={styles.overdueChipText}>⏰ {overdue} overdue</Text>
                        </Pressable>
                    )}
                </View>
            );
        })}
    </View>
);

// ── Caller Summary Strip ──────────────────────────────────────────────────────

const CallerSummaryStrip = ({
    callers, overdueCounts, onOverdueTap,
}: {
    callers: CallerReport[];
    overdueCounts: Record<string, number>;
    onOverdueTap: (callerId: string, callerName: string) => void;
}) => (
    <View style={styles.summaryStrip}>
        {callers.map((caller, idx) => {
            const isUnassigned = caller.callerId === '__unassigned__';
            const palette = isUnassigned
                ? { color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB' }
                : CALLER_PALETTE[idx % CALLER_PALETTE.length];
            const fresh   = caller.statusRows.find(r => r.status === 'new')?.rowTotal ?? 0;
            const contact = caller.statusRows.find(r => r.status === 'contacted')?.rowTotal ?? 0;
            const booked  = caller.statusRows.filter(r => r.status.startsWith('converted:')).reduce((s, r) => s + r.rowTotal, 0);
            const dropped = caller.statusRows.find(r => r.status === 'dropped')?.rowTotal ?? 0;
            const overdue = overdueCounts[caller.callerId] ?? 0;
            return (
                <View key={caller.callerId} style={[styles.summaryCard, { borderColor: palette.border, backgroundColor: palette.bg }]}>
                    <Text style={[styles.summaryTitle, { color: palette.color }]} numberOfLines={1}>
                        {isUnassigned ? '⚠️ Unassigned' : `👤 ${caller.callerName}`}
                    </Text>
                    <Text style={styles.summaryGrand}>{caller.grandTotal}</Text>
                    <View style={styles.summaryPills}>
                        {[
                            { label: '🆕', val: fresh,   color: '#0369A1' },
                            { label: '📞', val: contact, color: '#7C3AED' },
                            { label: '✅', val: booked,  color: palette.color },
                            { label: '🚫', val: dropped, color: '#991B1B' },
                        ].map((p, i) => (
                            <View key={i} style={styles.summaryPill}>
                                <Text style={[styles.summaryPillText, { color: p.color }]}>{p.label} {p.val}</Text>
                            </View>
                        ))}
                    </View>
                    {overdue > 0 && (
                        <Pressable
                            onPress={() => onOverdueTap(caller.callerId, caller.callerName)}
                            style={styles.overdueChip}
                        >
                            <Text style={styles.overdueChipText}>⏰ {overdue} overdue</Text>
                        </Pressable>
                    )}
                </View>
            );
        })}
    </View>
);

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function AgingDashboardScreen() {
    const [tab, setTab] = useState<'category' | 'caller'>('category');

    const [catData,    setCatData]    = useState<DailyAgingData | null>(null);
    const [callerData, setCallerData] = useState<DailyCallerData | null>(null);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const [drillCtx, setDrillCtx] = useState<DrillContext | null>(null);

    const fetchData = useCallback(async () => {
        try {
            const [catRes, callerRes] = await Promise.all([
                api.get('/leads/daily-aging-report'),
                api.get('/leads/daily-caller-report'),
            ]);
            setCatData(catRes.data);
            setCallerData(callerRes.data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Daily report fetch failed:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);
    const onRefresh = () => { setRefreshing(true); fetchData(); };

    const activeData = tab === 'category' ? catData : callerData;
    const grandTotal = tab === 'category'
        ? (catData?.categories ?? []).reduce((s, c) => s + c.grandTotal, 0)
        : (callerData?.callers ?? []).reduce((s, c) => s + c.grandTotal, 0);

    const subtitle = tab === 'category'
        ? `${catData?.categories.length ?? 0} categories`
        : `${callerData?.callers.length ?? 0} callers`;

    // ── Cell press handlers ──────────────────────────────────────────────
    const handleCategoryCell = useCallback((cat: CategoryReport, ctx: DrillContext) => {
        setDrillCtx({ ...ctx, leadCategory: cat.category });
    }, []);

    const handleCallerCell = useCallback((caller: CallerReport, ctx: DrillContext) => {
        setDrillCtx({ ...ctx, assignedToId: caller.callerId === '__unassigned__' ? undefined : caller.callerId });
    }, []);

    const handleCategoryOverdue = useCallback((cat: string) => {
        const meta = CATEGORY_META[cat] ?? CATEGORY_META.OTHER;
        setDrillCtx({
            title: `⏰ Overdue — ${meta.label}`,
            date: null,
            status: null,
            leadCategory: cat,
        });
    }, []);

    const handleCallerOverdue = useCallback((callerId: string, callerName: string) => {
        setDrillCtx({
            title: `⏰ Overdue — ${callerName}`,
            date: null,
            status: null,
            assignedToId: callerId === '__unassigned__' ? undefined : callerId,
        });
    }, []);

    return (
        <AdminPageLayout>
            {/* Page Header */}
            <View style={styles.pageHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.pageTitle}>📅 Daily Lead Report</Text>
                    <Text style={styles.pageSubtitle}>
                        Last 7 days · {grandTotal.toLocaleString()} leads · {subtitle}
                        {lastUpdated && (
                            <Text style={{ color: '#9CA3AF' }}> · {lastUpdated.toLocaleTimeString()}</Text>
                        )}
                    </Text>
                </View>
                <Button mode="outlined" icon="refresh" onPress={onRefresh} loading={refreshing} disabled={refreshing} compact>
                    Refresh
                </Button>
            </View>

            {/* Tab Switcher */}
            <SegmentedButtons
                value={tab}
                onValueChange={v => setTab(v as any)}
                buttons={[
                    { value: 'category', label: '🏷️  By Category', icon: 'tag-multiple'  },
                    { value: 'caller',   label: '👤  By Caller',   icon: 'phone-in-talk' },
                ]}
                style={{ marginBottom: 16, alignSelf: 'flex-start', minWidth: 380 }}
            />

            {/* Legend */}
            <View style={styles.legend}>
                <Text style={styles.legendTitle}>Status:</Text>
                {[
                    { label: '🆕 Fresh',     color: '#0369A1' },
                    { label: '📞 Contacted', color: '#7C3AED' },
                    { label: '✅ Booked',    color: '#065F46' },
                    { label: '🚫 Dropped',   color: '#991B1B' },
                    { label: '⏰ Overdue',   color: '#B45309' },
                ].map(l => (
                    <View key={l.label} style={[styles.legendItem, { borderColor: l.color + '40' }]}>
                        <Text style={[styles.legendText, { color: l.color }]}>{l.label}</Text>
                    </View>
                ))}
                <Text style={[styles.legendTitle, { color: '#6366F1', marginLeft: 8 }]}>
                    💡 Tap any count to see leads
                </Text>
            </View>

            {loading ? (
                <View style={{ alignItems: 'center', marginTop: 80 }}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={{ color: Colors.textSecondary, marginTop: 16 }}>Loading report…</Text>
                </View>
            ) : !activeData ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>📭 No data available</Text>
                </View>
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 20, paddingBottom: 40 }}
                >
                    {tab === 'category' && catData ? (
                        <>
                            <CategorySummaryStrip
                                categories={catData.categories}
                                overdueCounts={catData.overdueCounts ?? {}}
                                onOverdueTap={handleCategoryOverdue}
                            />
                            {catData.categories.length === 0 ? (
                                <View style={styles.empty}>
                                    <Text style={styles.emptyText}>📭 No leads in the last 7 days</Text>
                                </View>
                            ) : catData.categories.map(cat => {
                                const meta = CATEGORY_META[cat.category] ?? CATEGORY_META.OTHER;
                                return (
                                    <DayGrid
                                        key={cat.category}
                                        title={meta.label}
                                        emoji={meta.emoji}
                                        subtitle={`${cat.grandTotal} leads in last 7 days`}
                                        grandTotal={cat.grandTotal}
                                        color={meta.color} bg={meta.bg} border={meta.border}
                                        statusRows={cat.statusRows}
                                        dayTotals={cat.dayTotals}
                                        days={catData.days}
                                        today={catData.today}
                                        overdueCount={catData.overdueCounts?.[cat.category] ?? 0}
                                        onCellPress={ctx => handleCategoryCell(cat, ctx)}
                                    />
                                );
                            })}
                        </>
                    ) : callerData ? (
                        <>
                            <CallerSummaryStrip
                                callers={callerData.callers}
                                overdueCounts={callerData.overdueCounts ?? {}}
                                onOverdueTap={handleCallerOverdue}
                            />
                            {callerData.callers.length === 0 ? (
                                <View style={styles.empty}>
                                    <Text style={styles.emptyText}>📭 No leads assigned in the last 7 days</Text>
                                </View>
                            ) : callerData.callers.map((caller, idx) => {
                                const isUnassigned = caller.callerId === '__unassigned__';
                                const palette = isUnassigned
                                    ? { color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB' }
                                    : CALLER_PALETTE[idx % CALLER_PALETTE.length];
                                const title = isUnassigned ? 'Unassigned' : caller.callerName;
                                const emoji = isUnassigned ? '⚠️' : '👤';
                                return (
                                    <DayGrid
                                        key={caller.callerId}
                                        title={title}
                                        emoji={emoji}
                                        subtitle={`${caller.grandTotal} leads in last 7 days`}
                                        grandTotal={caller.grandTotal}
                                        color={palette.color} bg={palette.bg} border={palette.border}
                                        statusRows={caller.statusRows}
                                        dayTotals={caller.dayTotals}
                                        days={callerData.days}
                                        today={callerData.today}
                                        overdueCount={callerData.overdueCounts?.[caller.callerId] ?? 0}
                                        onCellPress={ctx => handleCallerCell(caller, ctx)}
                                    />
                                );
                            })}
                        </>
                    ) : null}
                </ScrollView>
            )}

            {/* Drill-down modal */}
            <DrillDownModal ctx={drillCtx} onClose={() => setDrillCtx(null)} />
        </AdminPageLayout>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    pageHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14,
    },
    pageTitle:    { fontSize: 22, fontWeight: '800', color: Colors.text },
    pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

    legend: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
    legendTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
    legendItem: {
        borderRadius: 20, borderWidth: 1,
        paddingHorizontal: 10, paddingVertical: 3,
    },
    legendText: { fontSize: 12, fontWeight: '600' },

    summaryStrip: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    summaryCard: {
        flex: 1, minWidth: 150, borderRadius: 14,
        borderWidth: 1.5, padding: 14,
    },
    summaryTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
    summaryGrand: { fontSize: 34, fontWeight: '900', color: '#111827', lineHeight: 42 },
    summaryPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 },
    summaryPill: {
        backgroundColor: '#FFFFFF', borderRadius: 20,
        paddingHorizontal: 8, paddingVertical: 2,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    summaryPillText: { fontSize: 11, fontWeight: '700' },

    overdueChip: {
        marginTop: 8, alignSelf: 'flex-start',
        backgroundColor: '#FEF3C7', borderRadius: 20,
        paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: '#F59E0B',
    },
    overdueChipText: { fontSize: 12, fontWeight: '800', color: '#B45309' },

    catCard: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#FFFFFF' },
    catHeader: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1.5,
    },
    catTitle:    { fontSize: 17, fontWeight: '900' },
    catSubtitle: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    grandBadge: {
        borderRadius: 24, paddingHorizontal: 14, paddingVertical: 6,
        minWidth: 52, alignItems: 'center',
    },
    grandBadgeText: { color: '#FFFFFF', fontWeight: '900', fontSize: 18 },

    gridRow: { flexDirection: 'row', alignItems: 'center' },
    labelCell: {
        width: LABEL_W,
        paddingVertical: 10, paddingHorizontal: 12,
        borderRightWidth: 1, borderRightColor: '#E5E7EB',
        justifyContent: 'center',
    },
    headerCell: { backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    headerText: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

    dayHeaderCell: {
        width: DAY_COL_W,
        paddingVertical: 8, paddingHorizontal: 4,
        alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: '#E5E7EB',
        borderRightWidth: 1, borderRightColor: '#E5E7EB',
        backgroundColor: '#F8FAFC',
    },
    dayWeekday: { fontSize: 11, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase' },
    dayDate:    { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 1 },
    todayPip:   { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
    totalHeaderCell: {
        width: DAY_COL_W, paddingVertical: 8, alignItems: 'center',
        backgroundColor: '#F5F3FF',
        borderBottomWidth: 2, borderBottomColor: '#C4B5FD',
    },

    statusPill: {
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start',
    },
    statusLabel: { fontSize: 12, fontWeight: '700' },

    dataCell: {
        width: DAY_COL_W, paddingVertical: 10,
        alignItems: 'center',
        borderRightWidth: 1, borderRightColor: '#F3F4F6',
    },
    dataCellCount: { fontSize: 16, fontWeight: '800' },
    tappableCount: { textDecorationLine: 'underline' },
    dataCellZero:  { fontSize: 14, color: '#D1D5DB', fontWeight: '500' },
    rowTotalCell:  { backgroundColor: '#F5F3FF' },

    footerRow:       { borderTopWidth: 2, borderTopColor: '#E5E7EB' },
    footerLabelCell: { backgroundColor: '#F3F4F6' },
    footerLabel:     { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    footerCell:      { backgroundColor: '#F3F4F6' },
    footerCount:     { fontSize: 14, fontWeight: '800' },
    grandTotalCell:  { borderLeftWidth: 2, borderLeftColor: '#DDD6FE' },

    empty: { alignItems: 'center', marginTop: 80 },
    emptyText: { fontSize: 16, color: Colors.textSecondary },

    // ── New Leads row
    newLeadsRow: {
        backgroundColor: '#EEF2FF',
        borderTopWidth: 1, borderTopColor: '#C7D2FE',
        borderBottomWidth: 0,
    },
    newLeadsPill: {
        backgroundColor: '#4F46E5',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    newLeadsLabel: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
    newLeadsCell:  { backgroundColor: '#EEF2FF' },
    newLeasdCellToday: { backgroundColor: '#C7D2FE' },
    newLeadsCount: { fontSize: 16, fontWeight: '900', color: '#4338CA' },
    newLeadsDivider: {
        height: 3, backgroundColor: '#C7D2FE',
        marginBottom: 2,
    },

    // ── Overdue row
    overdueRow: {
        backgroundColor: '#FFFBEB',
        borderTopWidth: 1, borderTopColor: '#FCD34D',
    },
    overduePill: {
        backgroundColor: '#F59E0B',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
        alignSelf: 'flex-start',
    },
    overdueLabel: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
    overdueSpanCell: {
        justifyContent: 'center', alignItems: 'center',
        borderRightWidth: 1, borderRightColor: '#FCD34D',
        paddingVertical: 10,
    },
    overdueHint: { fontSize: 11, color: '#B45309', fontStyle: 'italic' },
    overdueCountCell: { backgroundColor: '#F59E0B' },
    overdueCount: { fontSize: 16, fontWeight: '900', color: '#FFFFFF' },
});

// ── Drill-down modal styles ───────────────────────────────────────────────────

const dd = StyleSheet.create({
    overlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        maxHeight: '80%',
        shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
    },
    header: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14,
        borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    },
    headerTitle: { fontSize: 16, fontWeight: '800', color: '#111827', flex: 1 },
    headerSub:   { fontSize: 13, color: '#6B7280', marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    },
    closeText: { fontSize: 14, fontWeight: '700', color: '#374151' },
    loadingView: { alignItems: 'center', paddingVertical: 60 },
    leadRow: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 12,
        paddingHorizontal: 20, paddingVertical: 14,
    },
    leadName:  { fontSize: 14, fontWeight: '700', color: '#111827' },
    leadPhone: { fontSize: 13, color: '#6B7280', marginTop: 2 },
    leadCity:  { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    statusBadge: {
        borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
    },
    statusText:  { fontSize: 12, fontWeight: '700' },
    callerText:  { fontSize: 12, color: '#6B7280' },
    dateText:    { fontSize: 11, color: '#9CA3AF' },
    separator:   { height: 1, backgroundColor: '#F3F4F6', marginHorizontal: 20 },
    allLoaded:   { textAlign: 'center', color: '#9CA3AF', fontSize: 12, paddingVertical: 12 },
});
