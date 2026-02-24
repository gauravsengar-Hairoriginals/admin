import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, DataTable, Button, Searchbar, Chip, Avatar, Dialog, Portal, useTheme, ActivityIndicator, Modal, Card, IconButton, RadioButton, TextInput, List, Divider } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import AdminPageLayout from '../../components/AdminPageLayout';

export default function StylistsScreen() {
    const [stylists, setStylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedStylist, setSelectedStylist] = useState<any>(null);
    const [dialogVisible, setDialogVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Referral Modal State
    const [referralModalVisible, setReferralModalVisible] = useState(false);
    const [selectedStylistForReferrals, setSelectedStylistForReferrals] = useState<any>(null);
    const [referrals, setReferrals] = useState<any[]>([]);
    const [referralsLoading, setReferralsLoading] = useState(false);

    const { user } = useAuth();
    const theme = useTheme();

    useEffect(() => {
        fetchStylists();
    }, []);

    const fetchStylists = async () => {
        try {
            const response = await api.get('/admin/stylists', {
                params: { search: searchQuery }
            });
            setStylists(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchStylists();
    };

    const confirmStatusChange = (stylist: any) => {
        setSelectedStylist(stylist);
        setDialogVisible(true);
    };

    const handleStatusUpdate = async (isApproved: boolean) => {
        if (!selectedStylist) return;
        setActionLoading(true);
        try {
            await api.post(`/admin/stylists/${selectedStylist.id}/status`, {
                isApproved
            });

            // Optimistic update
            setStylists(stylists.map(s =>
                s.id === selectedStylist.id ? { ...s, isActive: isApproved } : s
            ));
            setDialogVisible(false);
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
            setSelectedStylist(null);
        }
    };

    async function fetchReferrals(stylistId: string) {
        setReferralsLoading(true);
        try {
            const response = await api.get(`/admin/stylists/${stylistId}/referrals`);
            setReferrals(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setReferralsLoading(false);
        }
    }

    const [levelDialogVisible, setLevelDialogVisible] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<string>('');

    const openLevelDialog = (stylist: any) => {
        setSelectedStylist(stylist);
        setSelectedLevel(stylist.level || 'silver');
        setLevelDialogVisible(true);
    };

    const handleLevelUpdate = async () => {
        if (!selectedStylist) return;
        setActionLoading(true);
        try {
            await api.post(`/admin/stylists/${selectedStylist.id}/level`, {
                level: selectedLevel
            });

            // Optimistic update
            setStylists(stylists.map(s =>
                s.id === selectedStylist.id ? { ...s, level: selectedLevel } : s
            ));
            setLevelDialogVisible(false);
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(false);
            setSelectedStylist(null);
        }
    };

    // Edit Stylist Modal State
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingStylist, setEditingStylist] = useState<any>(null);
    const [editName, setEditName] = useState('');
    const [editSalonQuery, setEditSalonQuery] = useState('');
    const [editSalonResults, setEditSalonResults] = useState<any[]>([]);
    const [selectedSalonForEdit, setSelectedSalonForEdit] = useState<any>(null);
    const [isSearchingSalons, setIsSearchingSalons] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);

    const openEditModal = (stylist: any) => {
        setEditingStylist(stylist);
        setEditName(stylist.name);
        setSelectedSalonForEdit(stylist.salon); // Pre-select current salon
        setEditSalonQuery('');
        setEditSalonResults([]);
        setEditModalVisible(true);
    };

    const searchSalons = async (query: string) => {
        setEditSalonQuery(query);
        if (query.length < 3) {
            setEditSalonResults([]);
            return;
        }
        setIsSearchingSalons(true);
        try {
            const response = await api.get('/salons', {
                params: { search: query }
            });
            setEditSalonResults(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearchingSalons(false);
        }
    };

    const handleUpdateStylist = async () => {
        if (!editingStylist) return;
        setUpdateLoading(true);
        try {
            const payload: any = { name: editName };
            if (selectedSalonForEdit) {
                payload.salonId = selectedSalonForEdit.id;
            }

            await api.patch(`/users/${editingStylist.id}`, payload);

            // Optimistic update
            setStylists(stylists.map(s =>
                s.id === editingStylist.id ? { ...s, name: editName, salon: selectedSalonForEdit } : s
            ));
            setEditModalVisible(false);
        } catch (error) {
            console.error(error);
            alert('Failed to update stylist');
        } finally {
            setUpdateLoading(false);
            setEditingStylist(null);
        }
    };

    function loadStylistReferrals(stylist: any) {
        setSelectedStylistForReferrals(stylist);
        setReferrals([]);
        fetchReferrals(stylist.id);
        setReferralModalVisible(true);
    }

    return (
        <AdminPageLayout>
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>Stylists</Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>Manage stylists and approvals</Text>
                </View>
                <Searchbar
                    placeholder="Search by name, phone..."
                    onChangeText={handleSearch}
                    value={searchQuery}
                    onSubmitEditing={fetchStylists}
                    style={styles.searchBar}
                    inputStyle={{ minHeight: 0 }}
                />
            </View>

            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <DataTable>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title style={{ flex: 1.5 }} textStyle={styles.tableTitle}>Stylist</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.2 }} textStyle={styles.tableTitle}>Salon</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Referrals</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Redeemed</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Status</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Level</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Action</DataTable.Title>
                        </DataTable.Header>

                        {stylists.map((item) => (
                            <DataTable.Row key={item.id} style={styles.tableRow}>
                                <DataTable.Cell style={{ flex: 1.5 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{item.name}</Text>
                                            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{item.phone}</Text>
                                        </View>
                                        <IconButton icon="pencil-outline" size={18} onPress={() => openEditModal(item)} />
                                    </View>
                                </DataTable.Cell>
                                <DataTable.Cell style={{ flex: 1.2 }}>{item.salon?.name || 'Unassigned'}</DataTable.Cell>
                                <DataTable.Cell>
                                    <Button
                                        mode="text"
                                        compact
                                        textColor={Colors.primary}
                                        onPress={() => loadStylistReferrals(item)}
                                        style={{ marginLeft: -10 }}
                                    >
                                        {item.referralsCount || 0} View
                                    </Button>
                                </DataTable.Cell>
                                <DataTable.Cell>{item.redeemedCount || 0}</DataTable.Cell>
                                <DataTable.Cell>
                                    <Chip
                                        icon={item.isActive ? 'check-circle' : 'close-circle'}
                                        mode="flat"
                                        style={{ backgroundColor: item.isActive ? '#E8F5E9' : '#FFEBEE' }}
                                        textStyle={{ color: item.isActive ? '#2E7D32' : '#C62828', fontSize: 12 }}
                                    >
                                        {item.isActive ? 'Active' : 'Inactive'}
                                    </Chip>
                                </DataTable.Cell>
                                <DataTable.Cell>
                                    <Button
                                        mode="outlined"
                                        compact
                                        textColor={item.level === 'platinum' ? '#7986CB' : item.level === 'gold' ? '#FFB300' : '#757575'}
                                        style={{ borderColor: item.level === 'platinum' ? '#7986CB' : item.level === 'gold' ? '#FFB300' : '#BDBDBD' }}
                                        onPress={() => openLevelDialog(item)}
                                    >
                                        {item.level ? item.level.toUpperCase() : 'SILVER'}
                                    </Button>
                                </DataTable.Cell>
                                <DataTable.Cell>
                                    <IconButton
                                        icon="pencil"
                                        size={20}
                                        iconColor={Colors.textSecondary}
                                        onPress={() => confirmStatusChange(item)}
                                        style={{ marginLeft: -10 }}
                                    />
                                </DataTable.Cell>
                            </DataTable.Row>
                        ))}
                    </DataTable>
                )}
            </Card>

            <Portal>
                <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title>Update Status</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium">
                            Change status for <Text style={{ fontWeight: 'bold' }}>{selectedStylist?.name}</Text>?
                        </Text>
                        <Text variant="bodySmall" style={{ marginTop: 8, color: Colors.textSecondary }}>
                            Current Status: {selectedStylist?.isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
                        <Button
                            onPress={() => handleStatusUpdate(true)}
                            disabled={actionLoading}
                            textColor={Colors.success}
                        >
                            Activate
                        </Button>
                        <Button
                            onPress={() => handleStatusUpdate(false)}
                            disabled={actionLoading}
                            textColor={Colors.error}
                        >
                            Deactivate
                        </Button>
                    </Dialog.Actions>
                </Dialog>

            </Portal>

            <Portal>
                <Dialog visible={levelDialogVisible} onDismiss={() => setLevelDialogVisible(false)} style={{ backgroundColor: 'white' }}>
                    <Dialog.Title>Update Level</Dialog.Title>
                    <Dialog.Content>
                        <Text variant="bodyMedium" style={{ marginBottom: 10 }}>
                            Select level for <Text style={{ fontWeight: 'bold' }}>{selectedStylist?.name}</Text>:
                        </Text>
                        <RadioButton.Group onValueChange={value => setSelectedLevel(value)} value={selectedLevel}>
                            <View style={styles.radioRow}>
                                <RadioButton value="silver" color="#757575" />
                                <Text>Silver</Text>
                            </View>
                            <View style={styles.radioRow}>
                                <RadioButton value="gold" color="#FFB300" />
                                <Text>Gold</Text>
                            </View>
                            <View style={styles.radioRow}>
                                <RadioButton value="platinum" color="#7986CB" />
                                <Text>Platinum</Text>
                            </View>
                        </RadioButton.Group>
                    </Dialog.Content>
                    <Dialog.Actions>
                        <Button onPress={() => setLevelDialogVisible(false)}>Cancel</Button>
                        <Button onPress={handleLevelUpdate} loading={actionLoading}>Update</Button>
                    </Dialog.Actions>
                </Dialog>
            </Portal>

            <Portal>
                <Modal visible={referralModalVisible} onDismiss={() => setReferralModalVisible(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ marginBottom: 4, fontWeight: 'bold' }}>Referrals</Text>
                    <Text variant="bodyMedium" style={{ marginBottom: 20, color: Colors.textSecondary }}>
                        Stylist: {selectedStylistForReferrals?.name}
                    </Text>

                    {referralsLoading ? (
                        <ActivityIndicator style={{ margin: 24 }} />
                    ) : (
                        <ScrollView style={{ maxHeight: 400 }}>
                            {referrals.length > 0 ? (
                                <DataTable>
                                    <DataTable.Header>
                                        <DataTable.Title>Date</DataTable.Title>
                                        <DataTable.Title>Customer</DataTable.Title>
                                        <DataTable.Title>Status</DataTable.Title>
                                        <DataTable.Title numeric>Comm.</DataTable.Title>
                                    </DataTable.Header>
                                    {referrals.map((ref) => (
                                        <DataTable.Row key={ref.id}>
                                            <DataTable.Cell>{new Date(ref.createdAt).toLocaleDateString()}</DataTable.Cell>
                                            <DataTable.Cell>
                                                <View>
                                                    <Text variant="bodySmall" style={{ fontWeight: '500' }}>{ref.customer?.firstName}</Text>
                                                    <Text variant="bodySmall" style={{ fontSize: 11, color: Colors.textSecondary }}>{ref.customer?.phone}</Text>
                                                </View>
                                            </DataTable.Cell>
                                            <DataTable.Cell>
                                                <Text style={{ color: getStatusColor(ref.status), fontWeight: 'bold', fontSize: 12 }}>
                                                    {ref.status.toUpperCase()}
                                                </Text>
                                            </DataTable.Cell>
                                            <DataTable.Cell numeric>₹{ref.commissionAmount || 0}</DataTable.Cell>
                                        </DataTable.Row>
                                    ))}
                                </DataTable>
                            ) : (
                                <Text style={{ textAlign: 'center', margin: 24, color: Colors.textSecondary }}>No referrals found.</Text>
                            )}
                        </ScrollView>
                    )}
                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 }}>
                        <Button onPress={() => setReferralModalVisible(false)}>Close</Button>
                    </View>
                </Modal>
            </Portal>

            {/* Edit Stylist Modal */}
            <Portal>
                <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ marginBottom: 16, fontWeight: 'bold' }}>Edit Stylist</Text>

                    <TextInput
                        label="Name"
                        value={editName}
                        onChangeText={setEditName}
                        mode="outlined"
                        style={{ marginBottom: 16, backgroundColor: 'white' }}
                    />

                    <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Assign Salon</Text>
                    {selectedSalonForEdit ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 10, backgroundColor: '#f0f0f0', borderRadius: 8 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={{ fontWeight: 'bold' }}>{selectedSalonForEdit.name}</Text>
                                <Text variant="bodySmall">{selectedSalonForEdit.city}</Text>
                            </View>
                            <IconButton icon="close" size={20} onPress={() => setSelectedSalonForEdit(null)} />
                        </View>
                    ) : (
                        <View>
                            <TextInput
                                label="Search Salon (Name/Phone)"
                                value={editSalonQuery}
                                onChangeText={searchSalons}
                                mode="outlined"
                                style={{ marginBottom: 8, backgroundColor: 'white' }}
                                right={isSearchingSalons ? <TextInput.Icon icon={() => <ActivityIndicator size={20} />} /> : null}
                            />
                            {editSalonResults.length > 0 && (
                                <View style={{ maxHeight: 150, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 4 }}>
                                    <ScrollView>
                                        {editSalonResults.map(salon => (
                                            <List.Item
                                                key={salon.id}
                                                title={salon.name}
                                                description={`${salon.ownerPhone} | ${salon.city || 'No City'}`}
                                                onPress={() => {
                                                    setSelectedSalonForEdit(salon);
                                                    setEditSalonResults([]);
                                                    setEditSalonQuery('');
                                                }}
                                                right={props => <List.Icon {...props} icon="plus" />}
                                            />
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24 }}>
                        <Button onPress={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>Cancel</Button>
                        <Button mode="contained" onPress={handleUpdateStylist} loading={updateLoading}>Save Changes</Button>
                    </View>
                </Modal>
            </Portal>
        </AdminPageLayout >
    );


}

// Helper to safely access nested data
const getStatusColor = (status: string) => {
    switch (status) {
        case 'redeemed': return Colors.primary;
        case 'credited': return Colors.success;
        case 'pending': return Colors.warning;
        case 'expired': return Colors.error;
        default: return Colors.text;
    }
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16,
    },
    searchBar: {
        width: 300,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: Colors.border,
        elevation: 0,
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
    modal: {
        backgroundColor: 'white',
        padding: 24,
        margin: 24,
        borderRadius: 12,
        maxWidth: 700,
        alignSelf: 'center',
        width: '100%',
        maxHeight: '90%'
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    }
});
