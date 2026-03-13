import React, { useState, useEffect, useCallback } from 'react';
import {
    View, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import {
    Text, Card, ActivityIndicator, Button, Surface, SegmentedButtons,
} from 'react-native-paper';
import { AdminPageLayout } from '../../components/AdminPageLayout';
import { api } from '../../utils/api';
import { Colors } from '../../constants/Colors';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StageRow {
    stage: string;
    total: number;
    bucketCounts: number[];
}

interface CategoryData {
    category: string;
    total: number;
    avgAgingDays: number;
    buckets: string[];
    stages: StageRow[];
}

interface CallerData {
    callerId: string;
    callerName: string;
    total: number;
    avgAgingDays: number;
    buckets: string[];
    stages: StageRow[];
}

// ── Config ────────────────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
    EC:      { label: '🔵 EC',      color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    HT:      { label: '🟢 HT',      color: '#065F46', bg: '#F0FDF4', border: '#BBF7D0' },
    WEBSITE: { label: '🟣 Website',  color: '#5B21B6', bg: '#FAF5FF', border: '#DDD6FE' },
    POPIN:   { label: '🟡 Popin',   color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    OTHER:   { label: '⚪ Other',    color: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
};

const CALLER_COLORS = [
    { color: '#1D4ED8', bg: '#EFF6FF', border: '#BFDBFE' },
    { color: '#065F46', bg: '#F0FDF4', border: '#BBF7D0' },
    { color: '#5B21B6', bg: '#FAF5FF', border: '#DDD6FE' },
    { color: '#92400E', bg: '#FFFBEB', border: '#FDE68A' },
    { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
    { color: '#0F766E', bg: '#F0FDFA', border: '#99F6E4' },
    { color: '#B45309', bg: '#FFFBEB', border: '#FDE68A' },
    { color: '#BE123C', bg: '#FFF1F2', border: '#FECDD3' },
];

const STAGE_LABELS: Record<string, string> = {
    fresh:     '🆕 Fresh',
    contacted: '📞 Contacted',
    reminder:  '⏰ Reminder',
    revisit:   '🔄 Revisit',
};

const BUCKET_COLORS = ['#22C55E', '#84CC16', '#FBBF24', '#F97316', '#EF4444'];
const BUCKET_BG     = ['#F0FDF4', '#F7FEE7', '#FFFBEB', '#FFF7ED', '#FEF2F2'];
const CELL_W = 72;

// ── Helpers ───────────────────────────────────────────────────────────────────

const agingColor = (days: number) => {
    if (days <= 3)  return '#22C55E';
    if (days <= 7)  return '#84CC16';
    if (days <= 14) return '#FBBF24';
    if (days <= 30) return '#F97316';
    return '#EF4444';
};

// ── Shared Grid Component ─────────────────────────────────────────────────────

const AgingGrid = ({
    label, color, border, total, avgAgingDays, buckets, stages,
}: {
    label: string; color: string; border: string; bg: string;
    total: number; avgAgingDays: number;
    buckets: string[]; stages: StageRow[];
}) => (
    <Card mode="elevated" elevation={1} style={styles.gridCard}>
        <View style={[styles.gridHeader, { borderBottomColor: border, borderLeftColor: color, borderLeftWidth: 4 }]}>
            <View style={{ flex: 1 }}>
                <Text style={[styles.gridTitle, { color }]}>{label}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.avgAging, { color: agingColor(avgAgingDays) }]}>{avgAgingDays}d avg</Text>
                <Text style={styles.totalBadge}>{total} leads</Text>
            </View>
        </View>

        <ScrollView horizontal>
            <View>
                {/* Column headers */}
                <View style={[styles.gridRow, { backgroundColor: '#F9FAFB' }]}>
                    <View style={[styles.stageCell, styles.headerBorderBottom]}>
                        <Text style={styles.headerText}>Stage</Text>
                    </View>
                    {buckets.map((b, i) => (
                        <View key={b} style={[styles.bucketHeaderCell, { width: CELL_W, backgroundColor: BUCKET_BG[i], borderBottomColor: BUCKET_COLORS[i] }]}>
                            <Text style={[styles.bucketHeaderText, { color: BUCKET_COLORS[i] }]}>{b}</Text>
                        </View>
                    ))}
                    <View style={[styles.totalHeaderCell, { width: CELL_W }]}>
                        <Text style={styles.headerText}>Total</Text>
                    </View>
                </View>

                {/* Stage rows */}
                {stages.map((stage, ri) => (
                    <View key={stage.stage} style={[styles.gridRow, { backgroundColor: ri % 2 === 0 ? '#fff' : '#FAFAFA' }]}>
                        <View style={styles.stageCell}>
                            <Text style={styles.stageLabel}>{STAGE_LABELS[stage.stage] ?? stage.stage}</Text>
                        </View>
                        {stage.bucketCounts.map((count, i) => (
                            <View key={i} style={[styles.countCell, { width: CELL_W }]}>
                                <Text style={[styles.countText, count > 0 && { color: BUCKET_COLORS[i], fontWeight: '700' }]}>
                                    {count > 0 ? count : '—'}
                                </Text>
                            </View>
                        ))}
                        <View style={[styles.countCell, { width: CELL_W, backgroundColor: '#F5F3FF' }]}>
                            <Text style={[styles.countText, { color, fontWeight: '800' }]}>{stage.total}</Text>
                        </View>
                    </View>
                ))}

                {/* Footer totals */}
                <View style={[styles.gridRow, { backgroundColor: '#F3F4F6', borderTopWidth: 2, borderTopColor: '#E5E7EB' }]}>
                    <View style={styles.stageCell}>
                        <Text style={[styles.stageLabel, { fontWeight: '800', color: '#111827' }]}>TOTAL</Text>
                    </View>
                    {buckets.map((_, i) => {
                        const colTotal = stages.reduce((s, st) => s + (st.bucketCounts[i] ?? 0), 0);
                        return (
                            <View key={i} style={[styles.countCell, { width: CELL_W, backgroundColor: BUCKET_BG[i] }]}>
                                <Text style={[styles.countText, { color: BUCKET_COLORS[i], fontWeight: '800' }]}>
                                    {colTotal > 0 ? colTotal : '—'}
                                </Text>
                            </View>
                        );
                    })}
                    <View style={[styles.countCell, { width: CELL_W, backgroundColor: '#EDE9FE' }]}>
                        <Text style={[styles.countText, { color, fontWeight: '800' }]}>{total}</Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    </Card>
);

// ── Summary Card ──────────────────────────────────────────────────────────────

const SummaryCard = ({
    label, color, bg, border, total, avgAgingDays, stages,
}: {
    label: string; color: string; bg: string; border: string;
    total: number; avgAgingDays: number; stages: StageRow[];
}) => {
    const fresh     = stages.find(s => s.stage === 'fresh')?.total     ?? 0;
    const contacted = stages.find(s => s.stage === 'contacted')?.total ?? 0;
    const reminder  = stages.find(s => s.stage === 'reminder')?.total  ?? 0;
    const revisit   = stages.find(s => s.stage === 'revisit')?.total   ?? 0;

    return (
        <Surface style={[styles.summaryCard, { borderColor: border, backgroundColor: bg }]} elevation={1}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.catLabel, { color }]} numberOfLines={1}>{label}</Text>
                    <Text style={styles.totalCount}>{total.toLocaleString()}</Text>
                    <Text style={styles.totalSub}>active leads</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.avgAgingLarge, { color: agingColor(avgAgingDays) }]}>{avgAgingDays}d</Text>
                    <Text style={styles.totalSub}>avg aging</Text>
                </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>
                {[
                    { label: '🆕', count: fresh },
                    { label: '📞', count: contacted },
                    { label: '⏰', count: reminder },
                    { label: '🔄', count: revisit },
                ].map((p, i) => (
                    <View key={i} style={styles.stagePill}>
                        <Text style={styles.stagePillText}>{p.label} <Text style={{ fontWeight: '700' }}>{p.count}</Text></Text>
                    </View>
                ))}
            </View>
        </Surface>
    );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AgingDashboardScreen() {
    const [tab, setTab] = useState<'category' | 'caller'>('category');
    const [catData,    setCatData]    = useState<CategoryData[]>([]);
    const [callerData, setCallerData] = useState<CallerData[]>([]);
    const [loading,    setLoading]    = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [catRes, callerRes] = await Promise.all([
                api.get('/leads/aging-dashboard'),
                api.get('/leads/caller-aging-dashboard'),
            ]);
            setCatData(catRes.data.categories ?? []);
            setCallerData(callerRes.data.callers ?? []);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Aging dashboard fetch failed:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const onRefresh = () => { setRefreshing(true); fetchAll(); };

    const catGrandTotal    = catData.reduce((s, c) => s + c.total, 0);
    const callerGrandTotal = callerData.reduce((s, c) => s + c.total, 0);
    const grandTotal = tab === 'category' ? catGrandTotal : callerGrandTotal;
    const breadcrumb = tab === 'category'
        ? `${catData.length} categories`
        : `${callerData.length} callers`;

    return (
        <AdminPageLayout>
            {/* Page Header */}
            <View style={styles.pageHeader}>
                <View>
                    <Text style={styles.pageTitle}>📊 Aging Report</Text>
                    <Text style={styles.pageSubtitle}>
                        {grandTotal.toLocaleString()} active leads · {breadcrumb}
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
                    { value: 'category', label: '🏷️  By Category', icon: 'tag-multiple' },
                    { value: 'caller',   label: '📞  By Caller',   icon: 'phone-in-talk' },
                ]}
                style={{ marginBottom: 16, alignSelf: 'flex-start', minWidth: 340 }}
            />

            {/* Bucket legend */}
            <View style={styles.legend}>
                <Text style={styles.legendTitle}>Aging:</Text>
                {['0-3d', '4-7d', '8-14d', '15-30d', '30d+'].map((b, i) => (
                    <View key={b} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: BUCKET_COLORS[i] }]} />
                        <Text style={styles.legendText}>{b}</Text>
                    </View>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 60 }} />
            ) : (
                <ScrollView
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ gap: 20, paddingBottom: 40 }}
                >
                    {tab === 'category' ? (
                        <>
                            {/* Category summary cards */}
                            <View style={styles.summaryRow}>
                                {catData.map(cat => {
                                    const meta = CATEGORY_META[cat.category] ?? CATEGORY_META.OTHER;
                                    return (
                                        <SummaryCard
                                            key={cat.category}
                                            label={meta.label}
                                            color={meta.color}
                                            bg={meta.bg}
                                            border={meta.border}
                                            total={cat.total}
                                            avgAgingDays={cat.avgAgingDays}
                                            stages={cat.stages}
                                        />
                                    );
                                })}
                            </View>
                            {/* Category grids */}
                            {catData.map(cat => {
                                const meta = CATEGORY_META[cat.category] ?? CATEGORY_META.OTHER;
                                return (
                                    <AgingGrid key={cat.category}
                                        label={meta.label} color={meta.color}
                                        bg={meta.bg} border={meta.border}
                                        total={cat.total} avgAgingDays={cat.avgAgingDays}
                                        buckets={cat.buckets} stages={cat.stages}
                                    />
                                );
                            })}
                        </>
                    ) : (
                        <>
                            {/* Caller summary cards */}
                            <View style={styles.summaryRow}>
                                {callerData.map((caller, idx) => {
                                    const meta = caller.callerId === '__unassigned__'
                                        ? { color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' }
                                        : CALLER_COLORS[idx % CALLER_COLORS.length];
                                    const icon = caller.callerId === '__unassigned__' ? '⚠️ Unassigned' : `👤 ${caller.callerName}`;
                                    return (
                                        <SummaryCard
                                            key={caller.callerId}
                                            label={icon}
                                            color={meta.color}
                                            bg={meta.bg}
                                            border={meta.border}
                                            total={caller.total}
                                            avgAgingDays={caller.avgAgingDays}
                                            stages={caller.stages}
                                        />
                                    );
                                })}
                            </View>
                            {/* Caller grids */}
                            {callerData.map((caller, idx) => {
                                const meta = caller.callerId === '__unassigned__'
                                    ? { color: '#9CA3AF', bg: '#F9FAFB', border: '#E5E7EB' }
                                    : CALLER_COLORS[idx % CALLER_COLORS.length];
                                const icon = caller.callerId === '__unassigned__' ? '⚠️ Unassigned' : `👤 ${caller.callerName}`;
                                return (
                                    <AgingGrid key={caller.callerId}
                                        label={icon} color={meta.color}
                                        bg={meta.bg} border={meta.border}
                                        total={caller.total} avgAgingDays={caller.avgAgingDays}
                                        buckets={caller.buckets} stages={caller.stages}
                                    />
                                );
                            })}
                        </>
                    )}
                </ScrollView>
            )}
        </AdminPageLayout>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    pageHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 14,
    },
    pageTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
    pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

    legend: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
    legendTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, color: '#374151', fontWeight: '600' },

    // Summary cards
    summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    summaryCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, minWidth: 175, flex: 1 },
    catLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
    totalCount: { fontSize: 30, fontWeight: '900', color: '#111827', lineHeight: 38 },
    totalSub: { fontSize: 11, color: '#9CA3AF' },
    avgAgingLarge: { fontSize: 26, fontWeight: '900', lineHeight: 32 },
    stagePill: {
        backgroundColor: '#fff', borderRadius: 20,
        paddingHorizontal: 9, paddingVertical: 2,
        borderWidth: 1, borderColor: '#E5E7EB',
    },
    stagePillText: { fontSize: 11, color: '#374151' },

    // Grid
    gridCard: { borderRadius: 12, overflow: 'hidden' },
    gridHeader: {
        flexDirection: 'row', alignItems: 'center',
        padding: 14, borderBottomWidth: 2,
    },
    gridTitle: { fontSize: 15, fontWeight: '800' },
    avgAging: { fontSize: 16, fontWeight: '800' },
    totalBadge: { fontSize: 11, color: '#6B7280', marginTop: 2 },

    gridRow: { flexDirection: 'row', alignItems: 'center' },
    stageCell: { width: 145, paddingVertical: 10, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
    headerBorderBottom: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    stageLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
    bucketHeaderCell: { paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', borderBottomWidth: 3, borderRightWidth: 1, borderRightColor: '#E5E7EB' },
    bucketHeaderText: { fontSize: 12, fontWeight: '800' },
    totalHeaderCell: { paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center', backgroundColor: '#F5F3FF' },
    headerText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
    countCell: { paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F3F4F6' },
    countText: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
});
