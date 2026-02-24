import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, DataTable, Button, SegmentedButtons, Checkbox, ActivityIndicator, Portal, Modal, TextInput, IconButton, Card, useTheme, Chip } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

export default function ReferralsScreen() {
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('redeemed');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [payoutLoading, setPayoutLoading] = useState(false);
    const [commissionInputs, setCommissionInputs] = useState<Record<string, string>>({}); // Stylist comm
    const [salonCommissionInputs, setSalonCommissionInputs] = useState<Record<string, string>>({}); // Salon comm

    // Filter State
    const [stylistFilter, setStylistFilter] = useState('');
    const [salonFilter, setSalonFilter] = useState('');
    const [codeFilter, setCodeFilter] = useState('');

    const theme = useTheme();

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchReferrals();
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [statusFilter, stylistFilter, salonFilter, codeFilter]);

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const params: any = { status: statusFilter };
            if (stylistFilter) params.stylistPhone = stylistFilter;
            if (salonFilter) params.salonPhone = salonFilter;
            if (codeFilter) params.code = codeFilter;

            const response = await api.get('/admin/referrals', { params });
            const data = response.data.referrals || [];
            setReferrals(data);

            // Initialize inputs
            const initialInputs: Record<string, string> = {};
            const initialSalonInputs: Record<string, string> = {};
            data.forEach((r: any) => {
                initialInputs[r.id] = (r.commissionAmount ?? r.suggestedCommission ?? 0).toString();
                initialSalonInputs[r.id] = (r.actualSalonCommission ?? r.suggestedSalonCommission ?? 0).toString();
            });
            setCommissionInputs(initialInputs);
            setSalonCommissionInputs(initialSalonInputs);

            setSelectedItems([]);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCommissionChange = (id: string, value: string) => {
        setCommissionInputs(prev => ({ ...prev, [id]: value }));
    };

    const handleSalonCommissionChange = (id: string, value: string) => {
        setSalonCommissionInputs(prev => ({ ...prev, [id]: value }));
    };

    const [paymentRefs, setPaymentRefs] = useState<Record<string, { stylist: string, salon: string }>>({});

    const handlePaymentRefChange = (id: string, type: 'stylist' | 'salon', value: string) => {
        setPaymentRefs(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [type]: value
            }
        }));
    };

    const handleMoveToPayable = async (referral: any) => {
        const finalAmount = parseFloat(commissionInputs[referral.id]);
        const finalSalonAmount = parseFloat(salonCommissionInputs[referral.id]);

        if (isNaN(finalAmount) || finalAmount < 0) {
            Alert.alert('Error', 'Please enter a valid stylist commission amount');
            return;
        }
        if (isNaN(finalSalonAmount) || finalSalonAmount < 0) {
            Alert.alert('Error', 'Please enter a valid salon commission amount');
            return;
        }

        Alert.alert(
            'Approve for Payment',
            `Move to Payable?\nStylist: ₹${finalAmount}\nSalon: ₹${finalSalonAmount}`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setPayoutLoading(true);
                        try {
                            await api.post(`/admin/referrals/${referral.id}/commission`, {
                                amount: finalAmount,
                                salonAmount: finalSalonAmount,
                                status: 'payable'
                            });
                            fetchReferrals();
                            Alert.alert('Success', 'Moved to Payable');
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to update status');
                        } finally {
                            setPayoutLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleMarkCredited = async (referral: any) => {
        const refs = paymentRefs[referral.id] || { stylist: '', salon: '' };

        Alert.alert(
            'Confirm Payment',
            'Mark as Credited?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setPayoutLoading(true);
                        try {
                            await api.post('/admin/referrals/credit-bulk', {
                                referralIds: [referral.id],
                                stylistRef: refs.stylist,
                                salonRef: refs.salon
                            });
                            fetchReferrals();
                            Alert.alert('Success', 'Marked as Credited');
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to mark as credited');
                        } finally {
                            setPayoutLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const toggleDiscountStatus = async (item: any) => {
        const newStatus = item.discountCode?.status === 'active' ? 'disabled' : 'active';
        try {
            // Update UI optimistically
            const updatedReferrals = referrals.map(r =>
                r.id === item.id ? { ...r, discountCode: { ...r.discountCode, status: newStatus } } : r
            );
            setReferrals(updatedReferrals);

            await api.post(`/admin/discounts/${item.discountCode.id}/status`, {
                status: newStatus
            });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update status');
            fetchReferrals(); // Revert on error
        }
    };

    return (
        <AdminPageLayout>
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={styles.headline}>Referral Payouts</Text>
                    <Text variant="bodyMedium" style={styles.subhead}>Manage referrals, commissions, and payouts</Text>
                </View>
            </View>

            <View style={styles.controlsContainer}>
                <SegmentedButtons
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                    buttons={[
                        { value: 'pending', label: 'Pending' },
                        { value: 'redeemed', label: 'Redeemed' },
                        { value: 'payable', label: 'Payable' },
                        { value: 'credited', label: 'Credited' },
                    ]}
                    style={styles.filters}
                />

                <View style={styles.filterRow}>
                    <TextInput
                        label="Filter by Stylist Phone"
                        value={stylistFilter}
                        onChangeText={setStylistFilter}
                        mode="outlined"
                        style={styles.filterInput}
                        dense
                        left={<TextInput.Icon icon="phone" />}
                    />
                    <TextInput
                        label="Filter by Salon Owner Phone"
                        value={salonFilter}
                        onChangeText={setSalonFilter}
                        mode="outlined"
                        style={styles.filterInput}
                        dense
                        left={<TextInput.Icon icon="store" />}
                    />
                    <TextInput
                        label="Filter by Coupon Code"
                        value={codeFilter}
                        onChangeText={setCodeFilter}
                        mode="outlined"
                        style={styles.filterInput}
                        dense
                        left={<TextInput.Icon icon="ticket-percent-outline" />}
                    />
                </View>
            </View>

            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <DataTable>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Date</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Stylist</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Salon</DataTable.Title>
                            <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Coupon</DataTable.Title>

                            {statusFilter === 'pending' ? (
                                <>
                                    <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Customer</DataTable.Title>
                                    <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Status</DataTable.Title>
                                </>
                            ) : (
                                <>
                                    <DataTable.Title style={{ flex: 1 }} textStyle={styles.tableTitle}>Order</DataTable.Title>
                                    {statusFilter === 'payable' ? (
                                        <>
                                            <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Sty Ref</DataTable.Title>
                                            <DataTable.Title style={{ flex: 0.7 }} textStyle={styles.tableTitle}>Sty Amt</DataTable.Title>
                                            <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Sal Ref</DataTable.Title>
                                            <DataTable.Title style={{ flex: 0.7 }} textStyle={styles.tableTitle}>Sal Amt</DataTable.Title>
                                            <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Action</DataTable.Title>
                                        </>
                                    ) : (
                                        <>
                                            {statusFilter === 'redeemed' && (
                                                <>
                                                    <DataTable.Title style={{ flex: 0.6 }} textStyle={styles.tableTitle}>Sty Sug.</DataTable.Title>
                                                    <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Sty Final</DataTable.Title>
                                                    <DataTable.Title style={{ flex: 0.6 }} textStyle={styles.tableTitle}>Sal Sug.</DataTable.Title>
                                                    <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Sal Final</DataTable.Title>
                                                    <DataTable.Title style={{ flex: 0.7 }} textStyle={styles.tableTitle}>Action</DataTable.Title>
                                                </>
                                            )}
                                            {statusFilter === 'credited' && (
                                                <>
                                                    <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Sty Paid</DataTable.Title>
                                                    <DataTable.Title style={{ flex: 0.8 }} textStyle={styles.tableTitle}>Salon Paid</DataTable.Title>
                                                </>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </DataTable.Header>

                        {referrals.map((item) => (
                            <DataTable.Row key={item.id} style={styles.tableRow}>
                                <DataTable.Cell style={{ flex: 0.8 }}>{new Date(item.createdAt).toLocaleDateString()}</DataTable.Cell>
                                <DataTable.Cell style={{ flex: 1.2 }}>
                                    <View>
                                        <Text variant="bodySmall" style={{ fontWeight: 'bold' }} numberOfLines={1}>{item.referrer?.name}</Text>
                                        <Text variant="bodySmall" style={{ fontSize: 10, color: Colors.textSecondary }}>{item.referrer?.phone}</Text>
                                    </View>
                                </DataTable.Cell>
                                <DataTable.Cell style={{ flex: 1.2 }}>
                                    <View>
                                        <Text variant="bodySmall" style={{ fontWeight: 'bold' }} numberOfLines={1}>
                                            {item.referrer?.salon?.name || 'N/A'}
                                        </Text>
                                        <Text variant="bodySmall" style={{ fontSize: 10, color: Colors.textSecondary }}>
                                            {item.referrer?.salon?.ownerPhone || 'N/A'}
                                        </Text>
                                    </View>
                                </DataTable.Cell>
                                <DataTable.Cell style={{ flex: 0.8 }}>
                                    <Chip icon="ticket-outline" style={{ backgroundColor: '#F3E5F5', height: 24 }} textStyle={{ fontSize: 10, lineHeight: 14 }}>{item.discountCode?.code}</Chip>
                                </DataTable.Cell>

                                {statusFilter === 'pending' ? (
                                    <>
                                        <DataTable.Cell style={{ flex: 1.2 }}>
                                            <View>
                                                <Text variant="bodySmall">{item.customer?.firstName} {item.customer?.lastName}</Text>
                                                <Text variant="bodySmall" style={{ fontSize: 10, color: Colors.textSecondary }}>{item.customer?.phone}</Text>
                                            </View>
                                        </DataTable.Cell>
                                        <DataTable.Cell style={{ flex: 0.8 }}>
                                            <Button
                                                mode={item.discountCode?.status === 'active' ? 'contained' : 'outlined'}
                                                compact
                                                labelStyle={{ fontSize: 8 }}
                                                onPress={() => toggleDiscountStatus(item)}
                                                contentStyle={{ height: 24 }}
                                                style={{ minWidth: 60 }}
                                                buttonColor={item.discountCode?.status === 'active' ? Colors.success : undefined}
                                                textColor={item.discountCode?.status === 'active' ? 'white' : Colors.textSecondary}
                                            >
                                                {item.discountCode?.status === 'active' ? 'ACTIVE' : 'OFF'}
                                            </Button>
                                        </DataTable.Cell>
                                    </>
                                ) : (
                                    <>
                                        <DataTable.Cell style={{ flex: 1 }}>
                                            <View>
                                                <Text variant="bodySmall">#{item.order?.orderNumber || 'N/A'}</Text>
                                                <Text variant="bodySmall" style={{ fontSize: 10, color: Colors.textSecondary }}>
                                                    ₹{item.order?.total || item.orderAmount || 0}
                                                </Text>
                                            </View>
                                        </DataTable.Cell>

                                        {statusFilter === 'payable' ? (
                                            <>
                                                <DataTable.Cell style={{ flex: 0.8 }}>
                                                    <TextInput
                                                        value={paymentRefs[item.id]?.stylist || ''}
                                                        onChangeText={(text) => handlePaymentRefChange(item.id, 'stylist', text)}
                                                        mode="outlined"
                                                        dense
                                                        placeholder="Ref"
                                                        style={{ height: 26, backgroundColor: 'white', fontSize: 10 }}
                                                        contentStyle={{ paddingVertical: 0, paddingHorizontal: 2 }}
                                                    />
                                                </DataTable.Cell>
                                                <DataTable.Cell style={{ flex: 0.7 }}>
                                                    <Text style={{ fontWeight: 'bold', color: Colors.primary, fontSize: 11 }}>₹{item.commissionAmount}</Text>
                                                </DataTable.Cell>
                                                <DataTable.Cell style={{ flex: 0.8 }}>
                                                    <TextInput
                                                        value={paymentRefs[item.id]?.salon || ''}
                                                        onChangeText={(text) => handlePaymentRefChange(item.id, 'salon', text)}
                                                        mode="outlined"
                                                        dense
                                                        placeholder="Ref"
                                                        style={{ height: 26, backgroundColor: 'white', fontSize: 10 }}
                                                        contentStyle={{ paddingVertical: 0, paddingHorizontal: 2 }}
                                                    />
                                                </DataTable.Cell>
                                                <DataTable.Cell style={{ flex: 0.7 }}>
                                                    <Text style={{ fontWeight: 'bold', color: Colors.secondary, fontSize: 11 }}>₹{item.actualSalonCommission || 0}</Text>
                                                </DataTable.Cell>
                                                <DataTable.Cell style={{ flex: 0.8 }}>
                                                    <Button
                                                        mode="contained"
                                                        compact
                                                        onPress={() => handleMarkCredited(item)}
                                                        labelStyle={{ fontSize: 8 }}
                                                        style={{ borderRadius: 4, minWidth: 50 }}
                                                        contentStyle={{ paddingHorizontal: 0, height: 26 }}
                                                    >
                                                        Pay
                                                    </Button>
                                                </DataTable.Cell>
                                            </>
                                        ) : (
                                            <>
                                                {statusFilter === 'redeemed' && (
                                                    <>
                                                        <DataTable.Cell style={{ flex: 0.6 }}>
                                                            <Text variant="bodySmall" style={{ fontSize: 11 }}>₹{item.suggestedCommission || 0}</Text>
                                                        </DataTable.Cell>
                                                        <DataTable.Cell style={{ flex: 0.8 }}>
                                                            <TextInput
                                                                value={commissionInputs[item.id]}
                                                                onChangeText={(text) => handleCommissionChange(item.id, text)}
                                                                keyboardType="numeric"
                                                                mode="outlined"
                                                                dense
                                                                style={{ height: 26, width: 50, backgroundColor: 'white', fontSize: 11 }}
                                                                contentStyle={{ paddingVertical: 0, paddingHorizontal: 2 }}
                                                            />
                                                        </DataTable.Cell>
                                                        <DataTable.Cell style={{ flex: 0.6 }}>
                                                            <Text variant="bodySmall" style={{ fontSize: 11 }}>₹{item.suggestedSalonCommission || 0}</Text>
                                                        </DataTable.Cell>
                                                        <DataTable.Cell style={{ flex: 0.8 }}>
                                                            <TextInput
                                                                value={salonCommissionInputs[item.id]}
                                                                onChangeText={(text) => handleSalonCommissionChange(item.id, text)}
                                                                keyboardType="numeric"
                                                                mode="outlined"
                                                                dense
                                                                style={{ height: 26, width: 50, backgroundColor: 'white', fontSize: 11 }}
                                                                contentStyle={{ paddingVertical: 0, paddingHorizontal: 2 }}
                                                            />
                                                        </DataTable.Cell>
                                                        <DataTable.Cell style={{ flex: 0.7 }}>
                                                            <Button
                                                                mode="contained"
                                                                compact
                                                                onPress={() => handleMoveToPayable(item)}
                                                                labelStyle={{ fontSize: 8 }}
                                                                style={{ borderRadius: 4, minWidth: 45 }}
                                                                contentStyle={{ paddingHorizontal: 0, height: 26 }}
                                                            >
                                                                Approve
                                                            </Button>
                                                        </DataTable.Cell>
                                                    </>
                                                )}

                                                {statusFilter === 'credited' && (
                                                    <>
                                                        <DataTable.Cell style={{ flex: 0.8 }}>
                                                            <Text style={{ fontWeight: 'bold', color: Colors.primary, fontSize: 11 }}>₹{item.commissionAmount}</Text>
                                                        </DataTable.Cell>
                                                        <DataTable.Cell style={{ flex: 0.8 }}>
                                                            <Text style={{ fontWeight: 'bold', color: Colors.secondary, fontSize: 11 }}>₹{item.actualSalonCommission || 0}</Text>
                                                        </DataTable.Cell>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </DataTable.Row>
                        ))}
                    </DataTable>
                )}
                {!loading && referrals.length === 0 && (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                        <Text style={{ color: Colors.textSecondary }}>No referrals found matching current filters.</Text>
                    </View>
                )}
            </Card>
        </AdminPageLayout>
    );
}

const styles = StyleSheet.create({
    header: {
        marginBottom: 24,
    },
    headline: {
        fontWeight: 'bold',
        color: Colors.text
    },
    subhead: {
        color: Colors.textSecondary
    },
    controlsContainer: {
        marginBottom: 20,
    },
    filters: {
        marginBottom: 16,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 16,
    },
    filterInput: {
        flex: 1,
        backgroundColor: 'white',
    },
    tableCard: {
        backgroundColor: Colors.surface,
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeader: {
        backgroundColor: '#F5F5F5',
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    tableTitle: {
        fontWeight: 'bold',
        color: Colors.text,
    },
    tableRow: {
        borderBottomColor: Colors.border,
    },
});
