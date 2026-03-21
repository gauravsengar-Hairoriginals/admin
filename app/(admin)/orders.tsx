import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import {
    Text, DataTable, Card, Chip, ActivityIndicator, IconButton,
    Portal, Modal, Divider, Button,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

const LIMIT = 20;

// ── Status badge helpers ─────────────────────────────────────────────────────

function FinancialBadge({ status }: { status?: string }) {
    const map: Record<string, { label: string; color: string; bg: string }> = {
        paid:              { label: 'Paid',           color: '#065F46', bg: '#D1FAE5' },
        pending:           { label: 'Pending',        color: '#92400E', bg: '#FEF3C7' },
        authorized:        { label: 'Authorized',     color: '#1D4ED8', bg: '#DBEAFE' },
        partially_paid:    { label: 'Partial',        color: '#6D28D9', bg: '#EDE9FE' },
        refunded:          { label: 'Refunded',       color: '#7F1D1D', bg: '#FEE2E2' },
        partially_refunded:{ label: 'Part. Refund',  color: '#9A3412', bg: '#FFEDD5' },
        voided:            { label: 'Voided',         color: '#6B7280', bg: '#F3F4F6' },
    };
    const s = map[status ?? 'pending'] ?? map.pending;
    return (
        <View style={{ backgroundColor: s.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start' }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: s.color }}>{s.label}</Text>
        </View>
    );
}

function FulfillmentBadge({ status }: { status?: string }) {
    const map: Record<string, { label: string; color: string; bg: string }> = {
        unfulfilled: { label: 'Unfulfilled', color: '#92400E', bg: '#FEF3C7' },
        partial:     { label: 'Partial',     color: '#1D4ED8', bg: '#DBEAFE' },
        fulfilled:   { label: 'Fulfilled',   color: '#065F46', bg: '#D1FAE5' },
    };
    const s = map[status ?? 'unfulfilled'] ?? map.unfulfilled;
    return (
        <View style={{ backgroundColor: s.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start', marginTop: 3 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: s.color }}>{s.label}</Text>
        </View>
    );
}

function SyncBadge({ status }: { status?: string }) {
    const map: Record<string, { label: string; color: string }> = {
        synced:       { label: '✅ Synced',   color: '#065F46' },
        pending_sync: { label: '⏳ Pending',  color: '#92400E' },
        failed:       { label: '❌ Failed',   color: '#DC2626' },
        cancelled:    { label: '🚫 Cancelled', color: '#6B7280' },
    };
    const s = map[status ?? 'pending_sync'] ?? map.pending_sync;
    return <Text style={{ fontSize: 11, color: s.color, fontWeight: '600' }}>{s.label}</Text>;
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function OrdersScreen() {
    const [orders, setOrders] = useState<any[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Detail modal
    const [selected, setSelected] = useState<any>(null);

    const fetchOrders = useCallback(async (p = 1) => {
        try {
            const res = await api.get('/orders', { params: { page: p, limit: LIMIT } });
            setOrders(res.data?.orders ?? []);
            setTotal(res.data?.total ?? 0);
            setPage(p);
        } catch (e) {
            console.error('Failed to load orders:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => { fetchOrders(); }, []);

    const onRefresh = () => { setRefreshing(true); fetchOrders(page); };

    const fmt = (n?: number | string) =>
        n != null ? `₹${parseFloat(String(n)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

    const fmtDate = (d?: string) =>
        d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <AdminPageLayout>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>Orders</Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                        {total} order{total !== 1 ? 's' : ''} total
                    </Text>
                </View>
                <IconButton icon="refresh" onPress={onRefresh} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" style={{ marginTop: 48 }} />
            ) : (
                <Card mode="outlined" style={styles.tableCard}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    >
                        <DataTable style={{ minWidth: 900 }}>
                            <DataTable.Header style={styles.tableHeader}>
                                <DataTable.Title style={{ flex: 1.2 }}>Order #</DataTable.Title>
                                <DataTable.Title style={{ flex: 2 }}>Customer</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.5 }}>Financial</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.5 }}>Fulfillment</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.2 }}>Sync</DataTable.Title>
                                <DataTable.Title style={{ flex: 1 }} numeric>Total</DataTable.Title>
                                <DataTable.Title style={{ flex: 1 }}>Items</DataTable.Title>
                                <DataTable.Title style={{ flex: 1.5 }}>Date</DataTable.Title>
                                <DataTable.Title style={{ flex: 0.8 }}>{''}</DataTable.Title>
                            </DataTable.Header>

                            {orders.length === 0 ? (
                                <View style={{ padding: 32, alignItems: 'center' }}>
                                    <Text style={{ color: Colors.textSecondary }}>No orders found.</Text>
                                </View>
                            ) : (
                                orders.map(order => (
                                    <DataTable.Row key={order.id} style={styles.row}>
                                        <DataTable.Cell style={{ flex: 1.2 }}>
                                            <Text style={{ fontWeight: '700', fontSize: 13 }}>
                                                {order.orderNumber || `#${order.shopifyId?.slice(-6) ?? '—'}`}
                                            </Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 2 }}>
                                            <View>
                                                <Text style={{ fontWeight: '600', fontSize: 12 }}>
                                                    {order.customer?.name || order.customerPhone || '—'}
                                                </Text>
                                                {order.customerPhone && order.customer?.name && (
                                                    <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                                                        {order.customerPhone}
                                                    </Text>
                                                )}
                                            </View>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.5 }}>
                                            <FinancialBadge status={order.financialStatus} />
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.5 }}>
                                            <FulfillmentBadge status={order.fulfillmentStatus} />
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.2 }}>
                                            <SyncBadge status={order.syncStatus} />
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1 }} numeric>
                                            <Text style={{ fontWeight: '700', fontSize: 12 }}>{fmt(order.total)}</Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                                                {order.lineItems?.length ?? 0} item{(order.lineItems?.length ?? 0) !== 1 ? 's' : ''}
                                            </Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 1.5 }}>
                                            <Text style={{ fontSize: 12 }}>{fmtDate(order.createdAt)}</Text>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 0.8 }}>
                                            <IconButton
                                                icon="eye-outline"
                                                size={18}
                                                iconColor={Colors.primary}
                                                onPress={() => setSelected(order)}
                                                style={{ margin: 0 }}
                                            />
                                        </DataTable.Cell>
                                    </DataTable.Row>
                                ))
                            )}
                        </DataTable>
                    </ScrollView>

                    {total > LIMIT && (
                        <DataTable.Pagination
                            page={page - 1}
                            numberOfPages={Math.ceil(total / LIMIT)}
                            onPageChange={p => fetchOrders(p + 1)}
                            label={`Page ${page} of ${Math.ceil(total / LIMIT)}`}
                            numberOfItemsPerPage={LIMIT}
                        />
                    )}
                </Card>
            )}

            {/* ── Order Detail Modal ─────────────────────────────────────────── */}
            <Portal>
                <Modal
                    visible={!!selected}
                    onDismiss={() => setSelected(null)}
                    contentContainerStyle={styles.modal}
                >
                    {selected && (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <Text style={styles.modalTitle}>
                                    Order {selected.orderNumber || `#${selected.shopifyId?.slice(-6)}`}
                                </Text>
                                <IconButton icon="close" size={20} onPress={() => setSelected(null)} style={{ margin: 0 }} />
                            </View>

                            {/* Status row */}
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                                <FinancialBadge status={selected.financialStatus} />
                                <FulfillmentBadge status={selected.fulfillmentStatus} />
                                <SyncBadge status={selected.syncStatus} />
                            </View>

                            <Divider style={{ marginBottom: 12 }} />

                            {/* Customer */}
                            <Text style={styles.sectionLabel}>Customer</Text>
                            <View style={styles.infoGrid}>
                                <InfoRow label="Name" value={selected.customer?.name || selected.customerPhone} />
                                <InfoRow label="Phone" value={selected.customerPhone} />
                                <InfoRow label="Shopify Customer ID" value={selected.customerShopifyId} />
                            </View>

                            <Divider style={{ marginVertical: 12 }} />

                            {/* Pricing */}
                            <Text style={styles.sectionLabel}>Pricing</Text>
                            <View style={styles.infoGrid}>
                                <InfoRow label="Subtotal" value={fmt(selected.subtotal)} />
                                <InfoRow label="Discount" value={fmt(selected.discountTotal)} />
                                <InfoRow label="Tax" value={fmt(selected.taxTotal)} />
                                <InfoRow label="Shipping" value={fmt(selected.shippingTotal)} />
                                <InfoRow label="Total" value={fmt(selected.total)} bold />
                                <InfoRow label="Currency" value={selected.currency} />
                            </View>

                            <Divider style={{ marginVertical: 12 }} />

                            {/* Line items */}
                            <Text style={styles.sectionLabel}>Line Items ({selected.lineItems?.length ?? 0})</Text>
                            {(selected.lineItems ?? []).map((li: any) => (
                                <View key={li.id} style={styles.lineItem}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ fontWeight: '600', fontSize: 13 }}>{li.title}</Text>
                                        {li.variantTitle && (
                                            <Text style={{ fontSize: 11, color: Colors.textSecondary }}>{li.variantTitle}</Text>
                                        )}
                                        {li.sku && (
                                            <Text style={{ fontSize: 11, color: Colors.textSecondary }}>SKU: {li.sku}</Text>
                                        )}
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ fontWeight: '700', fontSize: 13 }}>{fmt(li.total)}</Text>
                                        <Text style={{ fontSize: 11, color: Colors.textSecondary }}>
                                            {li.quantity} × {fmt(li.price)}
                                        </Text>
                                    </View>
                                </View>
                            ))}

                            {/* Discount codes */}
                            {selected.discountCodes?.length > 0 && (
                                <>
                                    <Divider style={{ marginVertical: 12 }} />
                                    <Text style={styles.sectionLabel}>Discount Codes</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {selected.discountCodes.map((dc: any) => (
                                            <Chip key={dc.code} icon="tag" mode="flat"
                                                style={{ backgroundColor: '#FEF3C7' }}
                                                textStyle={{ fontSize: 12, color: '#92400E' }}
                                            >
                                                {dc.code} (−{dc.type === 'percentage' ? `${dc.amount}%` : fmt(dc.amount)})
                                            </Chip>
                                        ))}
                                    </View>
                                </>
                            )}

                            {/* Shipping */}
                            {selected.shippingAddress && (
                                <>
                                    <Divider style={{ marginVertical: 12 }} />
                                    <Text style={styles.sectionLabel}>Shipping Address</Text>
                                    <Text style={{ fontSize: 13, color: Colors.text, lineHeight: 20 }}>
                                        {[
                                            selected.shippingAddress.firstName,
                                            selected.shippingAddress.lastName,
                                        ].filter(Boolean).join(' ')}
                                        {'\n'}{selected.shippingAddress.address1}
                                        {selected.shippingAddress.address2 ? `\n${selected.shippingAddress.address2}` : ''}
                                        {'\n'}{[selected.shippingAddress.city, selected.shippingAddress.state, selected.shippingAddress.pincode].filter(Boolean).join(', ')}
                                        {'\n'}{selected.shippingAddress.country}
                                    </Text>
                                </>
                            )}

                            <Divider style={{ marginVertical: 12 }} />
                            <Text style={styles.sectionLabel}>Meta</Text>
                            <View style={styles.infoGrid}>
                                <InfoRow label="Source" value={selected.source} />
                                <InfoRow label="Shopify Order ID" value={selected.shopifyId} />
                                <InfoRow label="Created" value={fmtDate(selected.createdAt)} />
                                <InfoRow label="Note" value={selected.note} />
                            </View>

                            <View style={{ height: 20 }} />
                        </ScrollView>
                    )}
                </Modal>
            </Portal>
        </AdminPageLayout>
    );
}

function InfoRow({ label, value, bold }: { label: string; value?: string | null; bold?: boolean }) {
    if (!value) return null;
    return (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: Colors.textSecondary, width: 130 }}>{label}</Text>
            <Text style={{ fontSize: 12, color: Colors.text, flex: 1, fontWeight: bold ? '700' : '400' }}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    tableCard: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    row: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        minHeight: 52,
    },
    modal: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginHorizontal: 40,
        alignSelf: 'center',
        maxWidth: 600,
        width: '100%',
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.text,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6B7280',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
    },
    infoGrid: {
        gap: 2,
    },
    lineItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 10,
        marginBottom: 6,
    },
});
