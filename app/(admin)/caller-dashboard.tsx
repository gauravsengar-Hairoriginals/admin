import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import {
    Text,
    Card,
    Button,
    ActivityIndicator,
    Chip,
    Divider,
    Portal,
    Dialog,
} from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';
import { useAuth } from '../../hooks/useAuth';

const CALL_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    'Interested': { bg: '#D1FAE5', color: '#065F46' },
    'Interested (NotSure)': { bg: '#E0F2FE', color: '#0369A1' },
    'Requested callback': { bg: '#FEF3C7', color: '#92400E' },
    'Not Interested': { bg: '#FFEBEE', color: '#B71C1C' },
    'RNR/Disconnect/Busy': { bg: '#F3E5F5', color: '#7B1FA2' },
    'Wrong Number': { bg: '#FFEBEE', color: '#B71C1C' },
};

const LEAD_CAT_COLORS: Record<string, { bg: string; color: string }> = {
    EC: { bg: '#DBEAFE', color: '#1D4ED8' },
    HT: { bg: '#D1FAE5', color: '#065F46' },
    WEBSITE: { bg: '#EDE9FE', color: '#5B21B6' },
    POPIN: { bg: '#FEF3C7', color: '#92400E' },
};

export default function CallerDashboardScreen() {
    const { user } = useAuth();

    const [profile, setProfile] = useState<any>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const [leads, setLeads] = useState<any[]>([]);
    const [leadsLoading, setLeadsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const [shiftLoading, setShiftLoading] = useState(false);
    const [isOnShift, setIsOnShift] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<'start' | 'end' | null>(null);

    const loadProfile = useCallback(async () => {
        try {
            const res = await api.get('/admin/lead-callers', { params: { search: user?.phone } });
            const me = res.data.find((c: any) => c.id === user?.id) ?? res.data[0] ?? null;
            setProfile(me);
            if (me) setIsOnShift(me.isOnShift ?? false);
        } catch (e) {
            console.error('Failed to load caller profile', e);
        } finally {
            setProfileLoading(false);
        }
    }, [user?.id, user?.phone]);

    const loadLeads = useCallback(async () => {
        try {
            const res = await api.get('/leads', {
                params: {
                    assignedToId: user?.id,
                    limit: 50,
                    tab: 'fresh',
                },
            });
            setLeads(res.data.leads ?? res.data ?? []);
        } catch (e) {
            console.error('Failed to load leads', e);
        } finally {
            setLeadsLoading(false);
            setRefreshing(false);
        }
    }, [user?.id]);

    useEffect(() => {
        loadProfile();
        loadLeads();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadProfile();
        loadLeads();
    };

    const handleShift = async (action: 'start' | 'end') => {
        if (!user?.id) return;
        setShiftLoading(true);
        setConfirmDialog(null);
        try {
            await api.post(`/admin/lead-callers/${user.id}/shift/${action}`);
            const nowOn = action === 'start';
            setIsOnShift(nowOn);
            setProfile((prev: any) => prev ? { ...prev, isOnShift: nowOn, shiftStartedAt: nowOn ? new Date().toISOString() : null } : prev);
        } catch (e) {
            console.error('Shift toggle failed', e);
        } finally {
            setShiftLoading(false);
        }
    };

    return (
        <AdminPageLayout>
            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* ── Header ── */}
                <View style={styles.pageHeader}>
                    <View>
                        <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>
                            My Dashboard
                        </Text>
                        <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                            Welcome back, {user?.name ?? 'Caller'}
                        </Text>
                    </View>
                </View>

                {/* ── Shift Card ── */}
                <Card mode="elevated" elevation={2} style={[styles.shiftCard, { borderColor: isOnShift ? '#16A34A' : '#E5E7EB', borderWidth: 2 }]}>
                    <Card.Content>
                        <View style={styles.shiftRow}>
                            <View style={{ flex: 1 }}>
                                <Text variant="titleLarge" style={{ fontWeight: 'bold', color: Colors.text }}>
                                    Shift Status
                                </Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                                    <View style={[styles.shiftDot, { backgroundColor: isOnShift ? '#16A34A' : '#9CA3AF' }]} />
                                    <Text style={[styles.shiftStatusText, { color: isOnShift ? '#16A34A' : '#6B7280' }]}>
                                        {isOnShift ? 'On Shift — You are receiving leads' : 'Off Shift — Leads will not be assigned to you'}
                                    </Text>
                                </View>
                                {profile?.shiftStartedAt && isOnShift && (
                                    <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 4 }}>
                                        Shift started at {new Date(profile.shiftStartedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                )}
                                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 6 }}>
                                    Auto-logout happens at 6:00 PM IST every day
                                </Text>
                            </View>

                            <View style={{ alignItems: 'center', gap: 12 }}>
                                {isOnShift ? (
                                    <Button
                                        mode="contained"
                                        icon="clock-out"
                                        onPress={() => setConfirmDialog('end')}
                                        loading={shiftLoading}
                                        style={{ backgroundColor: '#DC2626', borderRadius: 10, minWidth: 140 }}
                                        labelStyle={{ fontWeight: '700', fontSize: 14 }}
                                    >
                                        End Shift
                                    </Button>
                                ) : (
                                    <Button
                                        mode="contained"
                                        icon="clock-in"
                                        onPress={() => setConfirmDialog('start')}
                                        loading={shiftLoading}
                                        style={{ backgroundColor: '#16A34A', borderRadius: 10, minWidth: 140 }}
                                        labelStyle={{ fontWeight: '700', fontSize: 14 }}
                                    >
                                        Start Shift
                                    </Button>
                                )}
                            </View>
                        </View>

                        {profileLoading && (
                            <ActivityIndicator size="small" style={{ marginTop: 8 }} />
                        )}

                        {/* Caller Info Chips */}
                        {profile && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                                {profile.callerCategory && (
                                    <Chip icon="account-badge" mode="flat" style={{ backgroundColor: '#EEF2FF' }} textStyle={{ color: '#4338CA', fontSize: 12 }}>
                                        {profile.callerCategory.replace(/_/g, ' ')}
                                    </Chip>
                                )}
                                {Array.isArray(profile.callerRegions) && profile.callerRegions.length > 0
                                    ? profile.callerRegions.map((r: string) => (
                                        <Chip key={r} icon="map-marker" mode="flat" style={{ backgroundColor: '#F0FDF4' }} textStyle={{ color: '#16A34A', fontSize: 12 }}>
                                            {r.replace(/_/g, ' ')}
                                        </Chip>
                                    ))
                                    : null
                                }
                            </View>
                        )}
                    </Card.Content>
                </Card>

                {/* ── Stats Row ── */}
                <View style={styles.statsRow}>
                    <StatCard label="Assigned Today" value={leads.length} color="#6366F1" icon="📋" />
                    <StatCard
                        label="Interested"
                        value={leads.filter(l => l.call1 === 'Interested' || l.call2 === 'Interested' || l.call3 === 'Interested').length}
                        color="#16A34A"
                        icon="✅"
                    />
                    <StatCard
                        label="Callbacks"
                        value={leads.filter(l => l.call1 === 'Requested callback' || l.call2 === 'Requested callback' || l.call3 === 'Requested callback').length}
                        color="#F59E0B"
                        icon="📞"
                    />
                    <StatCard
                        label="Not Interested"
                        value={leads.filter(l => l.call1 === 'Not Interested' || l.call2 === 'Not Interested' || l.call3 === 'Not Interested').length}
                        color="#EF4444"
                        icon="❌"
                    />
                </View>

                {/* ── My Leads ── */}
                <Text variant="titleMedium" style={styles.sectionTitle}>My Assigned Leads</Text>

                {leadsLoading ? (
                    <ActivityIndicator size="large" style={{ margin: 32 }} />
                ) : leads.length === 0 ? (
                    <Card mode="outlined" style={styles.emptyCard}>
                        <Card.Content style={{ alignItems: 'center', paddingVertical: 32 }}>
                            <Text style={{ fontSize: 40 }}>📭</Text>
                            <Text variant="titleMedium" style={{ marginTop: 12, color: Colors.textSecondary }}>No leads assigned yet</Text>
                            {!isOnShift && (
                                <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 6, textAlign: 'center' }}>
                                    Start your shift to begin receiving leads
                                </Text>
                            )}
                        </Card.Content>
                    </Card>
                ) : (
                    <Card mode="elevated" elevation={1} style={{ borderRadius: 14, backgroundColor: Colors.surface, overflow: 'hidden' }}>
                        {leads.map((lead, index) => {
                            const latestCall = lead.call3 || lead.call2 || lead.call1;
                            const callStyle = latestCall
                                ? (CALL_STATUS_COLORS[latestCall] ?? { bg: '#F3F4F6', color: '#6B7280' })
                                : { bg: '#E5E7EB', color: '#9CA3AF' };
                            const catStyle = lead.leadCategory
                                ? (LEAD_CAT_COLORS[lead.leadCategory] ?? { bg: '#F3F4F6', color: '#6B7280' })
                                : null;
                            const aging = lead.agingDays ?? 0;
                            const isUrgent = aging > 3;
                            const isLast = index === leads.length - 1;

                            return (
                                <View key={lead.id} style={[
                                    styles.leadRow,
                                    { borderLeftColor: callStyle.color, borderLeftWidth: 4 },
                                    !isLast && styles.leadRowBorder,
                                ]}>
                                    {/* Left: Name + Phone + City */}
                                    <View style={{ flex: 1, minWidth: 0 }}>
                                        <Text style={styles.leadName} numberOfLines={1}>
                                            {lead.customer?.name ?? '—'}
                                        </Text>
                                        <Text style={styles.leadPhone} numberOfLines={1}>
                                            📱 {lead.customer?.phone ?? '—'}
                                            {lead.customer?.city ? `  ·  📍 ${lead.customer.city}` : ''}
                                        </Text>
                                    </View>

                                    {/* Middle: Call status + Category */}
                                    <View style={styles.leadMid}>
                                        {latestCall ? (
                                            <View style={[styles.miniPill, { backgroundColor: callStyle.bg }]}>
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: callStyle.color }} numberOfLines={1}>
                                                    {latestCall.length > 18 ? latestCall.slice(0, 18) + '…' : latestCall}
                                                </Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.miniPill, { backgroundColor: '#F3F4F6' }]}>
                                                <Text style={{ fontSize: 10, color: '#9CA3AF' }}>Not called</Text>
                                            </View>
                                        )}
                                        {catStyle && (
                                            <View style={[styles.miniPill, { backgroundColor: catStyle.bg, marginTop: 3 }]}>
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: catStyle.color }}>
                                                    {lead.leadCategory}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Right: Aging + next action */}
                                    <View style={styles.leadRight}>
                                        <Text style={{ fontSize: 12, fontWeight: '700', color: isUrgent ? '#EF4444' : '#9CA3AF' }}>
                                            {aging}d
                                        </Text>
                                        {lead.nextActionDate && (
                                            <Text style={{ fontSize: 10, color: '#F59E0B', marginTop: 2 }} numberOfLines={1}>
                                                📅 {new Date(lead.nextActionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </Card>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Confirm Start Shift Dialog */}
            <Portal>
                <Dialog visible={confirmDialog === 'start'} onDismiss={() => setConfirmDialog(null)} style={{ backgroundColor: 'white', borderRadius: 16 }}>
                    <Dialog.Title>Start Shift?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                            You will start receiving lead assignments. Your shift will auto-end at 6:00 PM IST.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmDialog(null)}>Cancel</Button>
                        <Button mode="contained" onPress={() => handleShift('start')} style={{ backgroundColor: '#16A34A' }}>
                            Start Shift 🟢
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            {/* Confirm End Shift Dialog */}
            <Portal>
                <Dialog visible={confirmDialog === 'end'} onDismiss={() => setConfirmDialog(null)} style={{ backgroundColor: 'white', borderRadius: 16 }}>
                    <Dialog.Title>End Shift?</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>
                            You will stop receiving new lead assignments until you start your shift again.
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setConfirmDialog(null)}>Cancel</Button>
                        <Button mode="contained" onPress={() => handleShift('end')} style={{ backgroundColor: '#DC2626' }}>
                            End Shift 🔴
                        </Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>
        </AdminPageLayout>
    );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
    return (
        <Card mode="elevated" elevation={1} style={[styles.statCard, { borderTopColor: color, borderTopWidth: 3 }]}>
            <Card.Content style={{ alignItems: 'center', paddingVertical: 14 }}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={{ fontSize: 28, fontWeight: '800', color, marginTop: 4 }}>{value}</Text>
                <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' }}>{label}</Text>
            </Card.Content>
        </Card>
    );
}

const styles = StyleSheet.create({
    pageHeader: {
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    shiftCard: {
        marginBottom: 20,
        borderRadius: 14,
        backgroundColor: Colors.surface,
    },
    shiftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
    },
    shiftDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    shiftStatusText: {
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
        flexWrap: 'wrap',
    },
    statCard: {
        flex: 1,
        minWidth: 130,
        backgroundColor: Colors.surface,
        borderRadius: 12,
    },
    sectionTitle: {
        fontWeight: 'bold',
        color: Colors.text,
        marginBottom: 12,
    },
    // ── Compact lead row ──────────────────
    leadRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
        backgroundColor: Colors.surface,
    },
    leadRowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    leadName: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    leadPhone: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    leadMid: {
        alignItems: 'flex-end',
        width: 110,
    },
    leadRight: {
        alignItems: 'flex-end',
        width: 52,
    },
    miniPill: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 5,
    },
    // ── legacy ──────────────────────────
    leadCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
    },
    emptyCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
});

