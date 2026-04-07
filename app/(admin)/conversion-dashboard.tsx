import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
    Text, Card, ActivityIndicator, Button, Surface, Chip,
} from 'react-native-paper';
import AdminPageLayout from '../../components/AdminPageLayout';
import api from '../../services/api';
import { Colors } from '../../constants/Colors';

// ── Types ─────────────────────────────────────────────────────────────────────

type Filter = 'today' | '7d' | 'month' | 'year';

interface MonthEntry {
    month: number;
    leadsAssigned: number;
    ordersConverted: number;
    gmv: number;
}

interface CallerRow {
    callerId: string;
    callerName: string;
    callerCategory?: string;
    callerRegion?: string | string[];
    leadsAssigned: number;
    ordersConverted: number;
    conversionRate: number;
    gmv: number;
    monthlyBreakdown?: MonthEntry[];
}

interface Totals {
    leadsAssigned: number;
    ordersConverted: number;
    conversionRate: number;
    gmv: number;
}

interface DashboardData {
    filter: Filter;
    fromDate: string;
    toDate: string;
    callers: CallerRow[];
    totals: Totals;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: '7d',    label: 'Last 7 Days' },
    { value: 'month', label: 'This Month' },
    { value: 'year',  label: 'This Year' },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_META: Record<string, { label: string; color: string; bg: string }> = {
    EC_CALLER:            { label: 'EC',          color: '#1D4ED8', bg: '#DBEAFE' },
    HT_CALLER:            { label: 'HT',          color: '#065F46', bg: '#D1FAE5' },
    WEBSITE_CALLER:       { label: 'Website',     color: '#5B21B6', bg: '#EDE9FE' },
    POPIN_CALLER:         { label: 'Popin',        color: '#92400E', bg: '#FEF3C7' },
    INTERNATIONAL_CALLER: { label: 'Intl',        color: '#374151', bg: '#F3F4F6' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const pct = (n: number) => `${n.toFixed(1)}%`;

/** Conversion rate → traffic-light colour */
const convColor = (rate: number): { color: string; bg: string } => {
    if (rate >= 20) return { color: '#065F46', bg: '#D1FAE5' };
    if (rate >= 10) return { color: '#92400E', bg: '#FEF3C7' };
    return { color: '#9CA3AF', bg: '#F3F4F6' };
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
    return (
        <Surface style={[styles.statCard, accent ? { borderTopColor: accent, borderTopWidth: 3 } : {}]} elevation={1}>
            <Text style={styles.statLabel}>{label}</Text>
            <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
            {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
        </Surface>
    );
}

function ConvChip({ rate }: { rate: number }) {
    const c = convColor(rate);
    return (
        <View style={[styles.convChip, { backgroundColor: c.bg }]}>
            <Text style={[styles.convChipText, { color: c.color }]}>{pct(rate)}</Text>
        </View>
    );
}

/** Horizontal mini bar chart for year view — one bar per month */
function MonthlyChart({ data, maxGmv }: { data: MonthEntry[]; maxGmv: number }) {
    if (!data || data.length === 0) return null;
    return (
        <View style={styles.chartWrap}>
            {data.map(m => {
                const barW = maxGmv > 0 ? Math.max(4, (m.gmv / maxGmv) * 200) : 4;
                const c = convColor(m.leadsAssigned > 0 ? (m.ordersConverted / m.leadsAssigned) * 100 : 0);
                return (
                    <View key={m.month} style={styles.chartRow}>
                        <Text style={styles.chartMonth}>{MONTH_NAMES[m.month - 1]}</Text>
                        <View style={[styles.chartBar, { width: barW, backgroundColor: c.color }]} />
                        <Text style={styles.chartGmv}>{m.gmv > 0 ? fmt(m.gmv) : '—'}</Text>
                        <Text style={styles.chartOrders}>
                            {m.ordersConverted > 0 ? `${m.ordersConverted} orders` : ''}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ConversionDashboardScreen() {
    const [filter, setFilter]       = useState<Filter>('month');
    const [data, setData]           = useState<DashboardData | null>(null);
    const [loading, setLoading]     = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded]   = useState<string | null>(null); // callerId whose monthly chart is open

    const fetchData = useCallback(async (f: Filter = filter) => {
        try {
            const res = await api.get('/admin/conversion-dashboard', { params: { filter: f } });
            setData(res.data);
        } catch (err) {
            console.error('Conversion dashboard fetch failed:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filter]);

    useEffect(() => { fetchData(filter); }, [filter]);

    const onRefresh = () => { setRefreshing(true); fetchData(filter); };

    const handleFilter = (f: Filter) => {
        setFilter(f);
        setExpanded(null);
        setLoading(true);
        fetchData(f);
    };

    const totals = data?.totals;
    const callers = data?.callers ?? [];

    // Max GMV across ALL callers' monthly data (for scaling bars)
    const maxMonthGmv = callers.reduce((max, c) => {
        const mmax = (c.monthlyBreakdown ?? []).reduce((m, mb) => Math.max(m, mb.gmv), 0);
        return Math.max(max, mmax);
    }, 0);

    return (
        <AdminPageLayout>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                contentContainerStyle={{ paddingBottom: 40 }}
            >
                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.pageTitle}>📈 Conversion Dashboard</Text>
                        <Text style={styles.pageSubtitle}>
                            Leads → Orders mapped per caller
                            {data?.fromDate ? `  ·  from ${new Date(data.fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}
                        </Text>
                    </View>
                    <Button mode="outlined" icon="refresh" onPress={onRefresh} loading={refreshing} compact>
                        Refresh
                    </Button>
                </View>

                {/* ── Filter Pills ────────────────────────────────────────── */}
                <View style={styles.filterRow}>
                    {FILTERS.map(f => (
                        <Chip
                            key={f.value}
                            selected={filter === f.value}
                            onPress={() => handleFilter(f.value)}
                            mode="flat"
                            style={[
                                styles.filterChip,
                                filter === f.value && styles.filterChipActive,
                            ]}
                            textStyle={[
                                styles.filterChipText,
                                filter === f.value && styles.filterChipTextActive,
                            ]}
                        >
                            {f.label}
                        </Chip>
                    ))}
                </View>

                {loading ? (
                    <ActivityIndicator size="large" style={{ marginTop: 60 }} />
                ) : (
                    <>
                        {/* ── Summary Stat Cards ──────────────────────────────── */}
                        {totals && (
                            <View style={styles.statRow}>
                                <StatCard
                                    label="Total Leads Assigned"
                                    value={totals.leadsAssigned.toLocaleString()}
                                    sub="in period"
                                    accent="#6366F1"
                                />
                                <StatCard
                                    label="Orders Converted"
                                    value={totals.ordersConverted.toLocaleString()}
                                    sub="paid / partial"
                                    accent="#10B981"
                                />
                                <StatCard
                                    label="Overall Conv. Rate"
                                    value={pct(totals.conversionRate)}
                                    sub={totals.conversionRate >= 20 ? '🟢 Excellent' : totals.conversionRate >= 10 ? '🟡 Average' : '🔴 Low'}
                                    accent="#F59E0B"
                                />
                                <StatCard
                                    label="Total GMV"
                                    value={fmt(totals.gmv)}
                                    sub="paid orders only"
                                    accent="#EF4444"
                                />
                            </View>
                        )}

                        {/* ── Per-Caller Table ────────────────────────────────── */}
                        <Card mode="elevated" elevation={1} style={styles.tableCard}>
                            {/* Legend */}
                            <View style={styles.convLegend}>
                                <Text style={styles.legendTitle}>Conv. Rate: </Text>
                                {[{ label: '≥ 20% Excellent', color: '#065F46', bg: '#D1FAE5' },
                                  { label: '10–19% Average',  color: '#92400E', bg: '#FEF3C7' },
                                  { label: '< 10% Low',       color: '#9CA3AF', bg: '#F3F4F6' }].map(l => (
                                    <View key={l.label} style={[styles.legendChip, { backgroundColor: l.bg }]}>
                                        <Text style={[styles.legendChipText, { color: l.color }]}>{l.label}</Text>
                                    </View>
                                ))}
                            </View>

                            {/* Table Header */}
                            <View style={[styles.tableRow, styles.tableHeader]}>
                                <Text style={[styles.colHead, { flex: 2 }]}>Caller</Text>
                                <Text style={[styles.colHead, { flex: 1.2 }]}>Category</Text>
                                <Text style={[styles.colHead, { flex: 0.8 }, styles.numCol]}>Leads</Text>
                                <Text style={[styles.colHead, { flex: 0.8 }, styles.numCol]}>Orders</Text>
                                <Text style={[styles.colHead, { flex: 0.9 }, styles.numCol]}>Conv.%</Text>
                                <Text style={[styles.colHead, { flex: 1.2 }, styles.numCol]}>GMV</Text>
                                {filter === 'year' && <Text style={[styles.colHead, { flex: 0.5 }]}>{''}</Text>}
                            </View>

                            {callers.length === 0 ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Text style={{ color: Colors.textSecondary }}>No callers found for this period.</Text>
                                </View>
                            ) : (
                                callers.map((caller, idx) => {
                                    const catMeta = CATEGORY_META[caller.callerCategory ?? ''];
                                    const isExpanded = expanded === caller.callerId;
                                    const rowBg = idx % 2 === 0 ? '#fff' : '#FAFAFA';
                                    return (
                                        <View key={caller.callerId}>
                                            <View style={[styles.tableRow, { backgroundColor: rowBg }]}>
                                                {/* Caller name + region */}
                                                <View style={{ flex: 2 }}>
                                                    <Text style={styles.callerName}>{caller.callerName}</Text>
                                                    {caller.callerRegion ? (
                                                        <Text style={styles.callerRegion}>
                                                            {Array.isArray(caller.callerRegion)
                                                                ? caller.callerRegion.join(', ').replace(/_/g, ' ')
                                                                : String(caller.callerRegion).replace(/_/g, ' ')}
                                                        </Text>
                                                    ) : null}
                                                </View>

                                                {/* Category chip */}
                                                <View style={{ flex: 1.2 }}>
                                                    {catMeta ? (
                                                        <View style={[styles.catChip, { backgroundColor: catMeta.bg }]}>
                                                            <Text style={[styles.catChipText, { color: catMeta.color }]}>{catMeta.label}</Text>
                                                        </View>
                                                    ) : (
                                                        <Text style={styles.callerRegion}>—</Text>
                                                    )}
                                                </View>

                                                {/* Leads */}
                                                <Text style={[styles.cell, { flex: 0.8 }]}>{caller.leadsAssigned}</Text>

                                                {/* Orders */}
                                                <Text style={[styles.cell, { flex: 0.8, color: caller.ordersConverted > 0 ? '#059669' : Colors.textSecondary, fontWeight: caller.ordersConverted > 0 ? '700' : '400' }]}>
                                                    {caller.ordersConverted}
                                                </Text>

                                                {/* Conv % chip */}
                                                <View style={{ flex: 0.9, alignItems: 'flex-end', paddingRight: 8 }}>
                                                    <ConvChip rate={caller.conversionRate} />
                                                </View>

                                                {/* GMV */}
                                                <Text style={[styles.cell, { flex: 1.2, fontWeight: '700', color: caller.gmv > 0 ? '#111827' : Colors.textSecondary }]}>
                                                    {caller.gmv > 0 ? fmt(caller.gmv) : '—'}
                                                </Text>

                                                {/* Expand button (year only) */}
                                                {filter === 'year' && (
                                                    <Text
                                                        style={[styles.cell, { flex: 0.5, color: Colors.primary }]}
                                                        onPress={() => setExpanded(isExpanded ? null : caller.callerId)}
                                                    >
                                                        {isExpanded ? '▲' : '▼'}
                                                    </Text>
                                                )}
                                            </View>

                                            {/* Monthly chart (year mode, expanded) */}
                                            {filter === 'year' && isExpanded && caller.monthlyBreakdown && (
                                                <View style={[styles.monthlyWrap, { backgroundColor: rowBg }]}>
                                                    <Text style={styles.monthlyTitle}>Monthly Breakdown — {caller.callerName}</Text>
                                                    <MonthlyChart data={caller.monthlyBreakdown} maxGmv={maxMonthGmv} />
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}

                            {/* Footer totals */}
                            {callers.length > 0 && totals && (
                                <View style={[styles.tableRow, styles.tableFooter]}>
                                    <Text style={[styles.footerLabel, { flex: 2 }]}>TOTAL</Text>
                                    <View style={{ flex: 1.2 }} />
                                    <Text style={[styles.footerNum, { flex: 0.8 }]}>{totals.leadsAssigned}</Text>
                                    <Text style={[styles.footerNum, { flex: 0.8, color: '#059669' }]}>{totals.ordersConverted}</Text>
                                    <View style={{ flex: 0.9, alignItems: 'flex-end', paddingRight: 8 }}>
                                        <ConvChip rate={totals.conversionRate} />
                                    </View>
                                    <Text style={[styles.footerNum, { flex: 1.2 }]}>{fmt(totals.gmv)}</Text>
                                    {filter === 'year' && <View style={{ flex: 0.5 }} />}
                                </View>
                            )}
                        </Card>
                    </>
                )}
            </ScrollView>
        </AdminPageLayout>
    );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    pageTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
    pageSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },

    // Filter chips
    filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
    filterChip: { backgroundColor: '#F3F4F6', borderRadius: 20 },
    filterChipActive: { backgroundColor: '#6366F1' },
    filterChipText: { fontSize: 13, color: '#374151', fontWeight: '600' },
    filterChipTextActive: { color: '#fff' },

    // Stat cards
    statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    statCard: {
        flex: 1, minWidth: 160, borderRadius: 14,
        padding: 16, backgroundColor: '#fff',
    },
    statLabel: { fontSize: 12, color: '#6B7280', fontWeight: '600', marginBottom: 6 },
    statValue: { fontSize: 26, fontWeight: '900', color: '#111827', lineHeight: 30 },
    statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },

    // Table
    tableCard: { borderRadius: 14, overflow: 'hidden', backgroundColor: '#fff' },
    convLegend: {
        flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
        gap: 8, padding: 12, backgroundColor: '#F9FAFB',
        borderBottomWidth: 1, borderBottomColor: '#E5E7EB',
    },
    legendTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
    legendChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    legendChipText: { fontSize: 11, fontWeight: '700' },

    tableHeader: { backgroundColor: '#F5F5F5', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    tableFooter: { backgroundColor: '#F0F0FF', borderTopWidth: 2, borderTopColor: '#C7D2FE' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, minHeight: 52 },
    colHead: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.4 },
    numCol: { textAlign: 'right', paddingRight: 8 },

    callerName: { fontSize: 13, fontWeight: '700', color: '#111827' },
    callerRegion: { fontSize: 11, color: '#9CA3AF', marginTop: 2, textTransform: 'capitalize' },

    catChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start' },
    catChipText: { fontSize: 11, fontWeight: '700' },

    convChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    convChipText: { fontSize: 12, fontWeight: '800' },

    cell: { fontSize: 13, color: Colors.text, textAlign: 'right', paddingRight: 8 },
    footerLabel: { fontSize: 13, fontWeight: '800', color: '#111827' },
    footerNum: { fontSize: 13, fontWeight: '800', color: '#111827', textAlign: 'right', paddingRight: 8 },

    // Monthly chart
    monthlyWrap: { paddingHorizontal: 20, paddingBottom: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    monthlyTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', marginVertical: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    chartWrap: { gap: 5 },
    chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chartMonth: { width: 28, fontSize: 11, fontWeight: '600', color: '#374151' },
    chartBar: { height: 10, borderRadius: 5, minWidth: 4 },
    chartGmv: { fontSize: 12, fontWeight: '700', color: '#111827', minWidth: 80 },
    chartOrders: { fontSize: 11, color: '#6B7280' },
});
