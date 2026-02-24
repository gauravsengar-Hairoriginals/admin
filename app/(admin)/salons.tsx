import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, DataTable, Button, Modal, Portal, TextInput, ActivityIndicator, IconButton, Divider, Tooltip, Card, useTheme, RadioButton, Dialog, Searchbar, Checkbox, Chip } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

// Stage configuration
const STAGE_ORDER = ['APPROACH', 'OWNER_READY', 'UNDER_ACTIVATION', 'ACTIVATED', 'CLOSED'];
const STAGE_LABELS: Record<string, string> = {
    APPROACH: 'Approach',
    OWNER_READY: 'Owner Ready',
    UNDER_ACTIVATION: 'Under Activation',
    ACTIVATED: 'Activated',
    CLOSED: 'Closed',
};
const STAGE_COLORS: Record<string, string> = {
    APPROACH: '#9E9E9E',
    OWNER_READY: '#FF9800',
    UNDER_ACTIVATION: '#2196F3',
    ACTIVATED: '#4CAF50',
    CLOSED: '#F44336',
};
const STAGE_CHECKLIST_ITEMS: Record<string, string[]> = {
    APPROACH: ['address_filled', 'owner_details_filled', 'services_filled'],
    OWNER_READY: ['stylists_added', 'photos_uploaded', 'owner_account_activated'],
    UNDER_ACTIVATION: ['product_demo', 'branding_material_sent', 'display_ready', 'app_training_given'],
    ACTIVATED: [],
    CLOSED: [],
};
const CHECKLIST_LABELS: Record<string, string> = {
    address_filled: 'Address filled',
    owner_details_filled: 'Owner name & phone filled',
    services_filled: 'Services offered filled',
    stylists_added: 'Stylist details added on app',
    photos_uploaded: 'Salon photos & details uploaded',
    owner_account_activated: 'Owner account activated',
    product_demo: 'Product demo completed',
    branding_material_sent: 'Branding material sent',
    display_ready: 'Display ready',
    app_training_given: 'App downloaded & training given to stylists',
};

interface SalonData {
    id?: string;
    name: string;
    ownerName: string;
    ownerPhone: string;
    managerName: string;
    managerPhone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude?: string;
    longitude?: string;
    isActive: boolean;
    level?: string;
    stylists?: any[];
}

export default function SalonsScreen() {
    const [salons, setSalons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Create/Edit Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedSalonId, setSelectedSalonId] = useState<string | null>(null);

    // Stylist Management Modal State
    const [stylistModalVisible, setStylistModalVisible] = useState(false);
    const [currentSalonForStylists, setCurrentSalonForStylists] = useState<any>(null);
    const [newStylistPhone, setNewStylistPhone] = useState('');
    const [newStylistName, setNewStylistName] = useState('');
    const [addStylistLoading, setAddStylistLoading] = useState(false);

    // Level Management State
    const [levelDialogVisible, setLevelDialogVisible] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<string>('');
    const [selectedSalonForLevel, setSelectedSalonForLevel] = useState<any>(null);
    const [levelLoading, setLevelLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState<SalonData>({
        name: '',
        ownerName: '',
        ownerPhone: '',
        managerName: '',
        managerPhone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        latitude: '',
        longitude: '',
        isActive: true
    });
    const [formOwnerLookupLoading, setFormOwnerLookupLoading] = useState(false);
    const [formOwnerFound, setFormOwnerFound] = useState<any>(null);
    const [formManagerLookupLoading, setFormManagerLookupLoading] = useState(false);
    const [formManagerFound, setFormManagerFound] = useState<any>(null);

    const theme = useTheme();

    useEffect(() => {
        fetchSalons();
    }, []);

    const fetchSalons = async () => {
        try {
            const response = await api.get('/admin/salons', {
                params: { search: searchQuery }
            });
            setSalons(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            ownerName: '',
            ownerPhone: '',
            managerName: '',
            managerPhone: '',
            address: '',
            city: '',
            state: '',
            pincode: '',
            latitude: '',
            longitude: '',
            isActive: true
        });
        setIsEditing(false);
        setSelectedSalonId(null);
        setFormOwnerFound(null);
        setFormManagerFound(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalVisible(true);
    };

    // Field Force Logic
    const [fieldAgents, setFieldAgents] = useState([]);
    const [selectedAgentForEdit, setSelectedAgentForEdit] = useState(null);
    const [selectedSalon, setSelectedSalon] = useState<any>(null); // Added to support handleEditSalon
    const [editName, setEditName] = useState(''); // Added to support handleEditSalon
    const [editOwnerName, setEditOwnerName] = useState('');
    const [editOwnerPhone, setEditOwnerPhone] = useState('');
    const [ownerLookupLoading, setOwnerLookupLoading] = useState(false);
    const [ownerFound, setOwnerFound] = useState<any>(null); // null = not looked up, false = not found, object = found
    const [editManagerName, setEditManagerName] = useState('');
    const [editManagerPhone, setEditManagerPhone] = useState('');
    const [managerLookupLoading, setManagerLookupLoading] = useState(false);
    const [managerFound, setManagerFound] = useState<any>(null);
    const [editAddress, setEditAddress] = useState('');
    const [editLocation, setEditLocation] = useState({ latitude: '', longitude: '' });
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    // Stage & Checklist State for Edit Modal
    const [editStage, setEditStage] = useState('APPROACH');
    const [editChecklist, setEditChecklist] = useState<Record<string, boolean>>({});
    const [advancingStage, setAdvancingStage] = useState(false);

    // Photo Gallery State for Edit Modal
    const [salonPhotos, setSalonPhotos] = useState<any[]>([]);
    const [photosLoading, setPhotosLoading] = useState(false);

    const fetchFieldAgents = async () => {
        try {
            const response = await api.get('/users/field-force');
            setFieldAgents(response.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditSalon = (salon: any) => {
        setSelectedSalon(salon);
        setEditName(salon.name);
        setEditOwnerName(salon.owner?.name || '');
        setEditOwnerPhone(salon.owner?.phone || '');
        setOwnerFound(salon.owner ? salon.owner : null);
        setEditManagerName(salon.managerName || '');
        setEditManagerPhone(salon.managerPhone || '');
        setManagerFound(null);
        setEditAddress(salon.address || '');
        setEditLocation({
            latitude: salon.latitude ? String(salon.latitude) : '',
            longitude: salon.longitude ? String(salon.longitude) : ''
        });
        setEditStage(salon.stage || 'APPROACH');
        setEditChecklist(salon.checklist || {});

        const assignedAgent = salon.fieldForceSalons?.[0]?.agent;
        setSelectedAgentForEdit(assignedAgent ? assignedAgent.id : null);

        setEditModalVisible(true);
        if (fieldAgents.length === 0) fetchFieldAgents();
        // Fetch photos
        fetchSalonPhotos(salon.id);
    };

    const fetchSalonPhotos = async (salonId: string) => {
        setPhotosLoading(true);
        try {
            const res = await api.get(`/salons/${salonId}/photos`);
            setSalonPhotos(res.data);
        } catch (error) {
            console.error('Failed to fetch photos:', error);
            setSalonPhotos([]);
        } finally {
            setPhotosLoading(false);
        }
    };

    const handleDeletePhoto = async (photoId: string) => {
        if (!selectedSalon) return;
        try {
            await api.delete(`/salons/${selectedSalon.id}/photos/${photoId}`);
            setSalonPhotos(prev => prev.filter(p => p.id !== photoId));
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to delete photo');
        }
    };

    const handleChecklistToggle = async (key: string, value: boolean) => {
        if (!selectedSalon) return;
        try {
            const res = await api.patch(`/salons/${selectedSalon.id}/checklist`, {
                checklist: { [key]: value },
            });
            setEditChecklist(res.data.salon.checklist);
            // Update salon in list
            setSalons(prev => prev.map(s => s.id === selectedSalon.id ? { ...s, checklist: res.data.salon.checklist } : s));
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to update checklist');
        }
    };

    const handleAdvanceStage = async () => {
        if (!selectedSalon) return;
        setAdvancingStage(true);
        try {
            const res = await api.post(`/salons/${selectedSalon.id}/advance-stage`);
            setEditStage(res.data.stage);
            setEditChecklist(res.data.checklist || {});
            setSelectedSalon({ ...selectedSalon, stage: res.data.stage, checklist: res.data.checklist });
            setSalons(prev => prev.map(s => s.id === selectedSalon.id ? { ...s, stage: res.data.stage, checklist: res.data.checklist } : s));
            Alert.alert('Success', `Salon advanced to ${STAGE_LABELS[res.data.stage]}`);
        } catch (error: any) {
            Alert.alert('Cannot Advance', error.response?.data?.message || 'Failed to advance stage');
        } finally {
            setAdvancingStage(false);
        }
    };

    const lookupUser = async (phone: string, type: 'owner' | 'manager') => {
        const setLoading = type === 'owner' ? setOwnerLookupLoading : setManagerLookupLoading;
        const setFound = type === 'owner' ? setOwnerFound : setManagerFound;
        const setName = type === 'owner' ? setEditOwnerName : setEditManagerName;

        if (phone.length < 10) {
            setFound(null);
            return;
        }

        setLoading(true);
        try {
            const response = await api.get('/salons/lookup-user', { params: { phone } });
            if (response.data.found) {
                setFound(response.data.user);
                setName(response.data.user.name);
            } else {
                setFound(false);
                setName('');
            }
        } catch (error) {
            console.error(error);
            setFound(false);
        } finally {
            setLoading(false);
        }
    };

    const saveSalonEdits = async () => {
        if (!selectedSalon) return;
        setSaving(true);
        try {
            await api.patch(`/salons/${selectedSalon.id}`, {
                name: editName,
                ownerName: editOwnerName,
                ownerPhone: editOwnerPhone,
                managerName: editManagerName,
                managerPhone: editManagerPhone,
                address: editAddress,
                latitude: parseFloat(editLocation.latitude),
                longitude: parseFloat(editLocation.longitude)
            });

            // Handle Field Agent Assignment
            if (selectedAgentForEdit) {
                await api.post('/users/field-force/assign', {
                    agentId: selectedAgentForEdit,
                    salonIds: [selectedSalon.id]
                });
            }

            setEditModalVisible(false);
            fetchSalons(); // Refresh list to see updates
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update salon'); // Changed alert to Alert.alert
        } finally {
            setSaving(false);
        }
    };
    const openStylistModal = (salon: any) => {
        setCurrentSalonForStylists(salon);
        setNewStylistPhone('');
        setNewStylistName('');
        setStylistModalVisible(true);
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.ownerName || !formData.ownerPhone) {
            Alert.alert('Error', 'Name, Owner Name and Owner Phone are required');
            return;
        }

        setCreateLoading(true);
        try {
            const payload = {
                ...formData,
                latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
                longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
                stylists: undefined // Don't send stylists array back
            };

            if (isEditing && selectedSalonId) {
                await api.patch(`/salons/${selectedSalonId}`, payload);
                Alert.alert('Success', 'Salon updated successfully');
            } else {
                await api.post('/admin/salons', payload);
                Alert.alert('Success', 'Salon created successfully');
            }

            setModalVisible(false);
            fetchSalons();
            resetForm();
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to save salon: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setCreateLoading(false);
        }
    };

    const handleAddStylist = async () => {
        if (newStylistPhone.length < 10) {
            Alert.alert('Error', 'Please enter a valid 10-digit phone number');
            return;
        }
        if (!currentSalonForStylists) return;

        setAddStylistLoading(true);
        try {
            await api.post(`/salons/${currentSalonForStylists.id}/stylists`, {
                phone: newStylistPhone,
                name: newStylistName
            });
            Alert.alert('Success', 'Stylist added successfully');
            setNewStylistPhone('');
            setNewStylistName('');

            // Refresh main list and update local salon object to show new stylist immediately
            const salonResponse = await api.get(`/salons/${currentSalonForStylists.id}`);
            setCurrentSalonForStylists(salonResponse.data); // Update modal data
            fetchSalons(); // Update main table in background

        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to add stylist: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setAddStylistLoading(false);
        }
    };

    const handleRemoveStylist = async (stylistId: string) => {
        if (!currentSalonForStylists) return;

        Alert.alert(
            'Remove Stylist',
            'Are you sure you want to remove this stylist from the salon?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/salons/${currentSalonForStylists.id}/stylists/${stylistId}`);
                            // Update local state
                            const updatedStylists = currentSalonForStylists.stylists?.filter((s: any) => s.id !== stylistId);
                            setCurrentSalonForStylists({ ...currentSalonForStylists, stylists: updatedStylists });
                            fetchSalons(); // Refresh main list too
                            Alert.alert('Success', 'Stylist removed');
                        } catch (error) {
                            console.error(error);
                            Alert.alert('Error', 'Failed to remove stylist');
                        }
                    }
                }
            ]
        );
    };

    const openLevelDialog = (salon: any) => {
        setSelectedSalonForLevel(salon);
        setSelectedLevel(salon.level || 'silver');
        setLevelDialogVisible(true);
    };

    const handleLevelUpdate = async () => {
        if (!selectedSalonForLevel) return;
        setLevelLoading(true);
        try {
            await api.post(`/admin/salons/${selectedSalonForLevel.id}/level`, {
                level: selectedLevel
            });

            // Optimistic update
            setSalons(salons.map(s =>
                s.id === selectedSalonForLevel.id ? { ...s, level: selectedLevel } : s
            ));
            setLevelDialogVisible(false);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to update level');
        } finally {
            setLevelLoading(false);
            setSelectedSalonForLevel(null);
        }
    };

    return (
        <AdminPageLayout>
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>Salons</Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>Manage salon partners and their details</Text>
                </View>
                <Searchbar
                    placeholder="Search name, phone..."
                    onChangeText={setSearchQuery}
                    value={searchQuery}
                    onSubmitEditing={fetchSalons}
                    style={{ width: 300, backgroundColor: 'white', borderWidth: 1, borderColor: Colors.border, elevation: 0 }}
                    inputStyle={{ minHeight: 0 }}
                />
                <Button mode="contained" onPress={openCreateModal} icon="plus" style={styles.addButton}>
                    Add Salon
                </Button>
            </View>

            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <DataTable>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title textStyle={styles.tableTitle}>Salon Name</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Owner</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Phone</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>City</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Field Staff</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontWeight: 'bold', color: Colors.textSecondary }}>Stylists</Text>
                                    <Tooltip title="Manage Stylists">
                                        <IconButton icon="information-outline" size={16} iconColor={Colors.textSecondary} style={{ margin: 0, padding: 0 }} />
                                    </Tooltip>
                                </View>
                            </DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Stage</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Level</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Action</DataTable.Title>
                        </DataTable.Header>

                        {salons.map((item) => (
                            <DataTable.Row key={item.id} style={styles.tableRow}>
                                <DataTable.Cell><Text style={{ fontWeight: '500' }}>{item.name}</Text></DataTable.Cell>
                                <DataTable.Cell>{item.owner?.name || '-'}</DataTable.Cell>
                                <DataTable.Cell>{item.owner?.phone || '-'}</DataTable.Cell>
                                <DataTable.Cell>{item.city || '-'}</DataTable.Cell>
                                <DataTable.Cell>
                                    <Text variant="bodySmall">{item.fieldForceSalons?.[0]?.agent?.name || '-'}</Text>
                                </DataTable.Cell>
                                <DataTable.Cell>
                                    <Button
                                        mode="text"
                                        compact
                                        onPress={() => openStylistModal(item)}
                                        textColor={Colors.primary}
                                        style={{ marginLeft: -10 }}
                                    >
                                        {item.stylists?.length || 0} View
                                    </Button>
                                </DataTable.Cell>
                                <DataTable.Cell>
                                    <Chip
                                        mode="flat"
                                        compact
                                        style={{ backgroundColor: (STAGE_COLORS[item.stage] || '#9E9E9E') + '20' }}
                                        textStyle={{ color: STAGE_COLORS[item.stage] || '#9E9E9E', fontSize: 11, fontWeight: '600' }}
                                    >
                                        {STAGE_LABELS[item.stage] || 'Approach'}
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
                                    <IconButton icon="pencil" size={20} iconColor={Colors.textSecondary} onPress={() => handleEditSalon(item)} style={{ marginLeft: -10 }} />
                                </DataTable.Cell>
                            </DataTable.Row>
                        ))}
                    </DataTable>
                )}
            </Card>

            {/* Create/Edit Salon Modal */}
            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
                    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text variant="titleLarge" style={{ marginBottom: 20, fontWeight: 'bold' }}>
                            {isEditing ? 'Edit Salon' : 'Add New Salon'}
                        </Text>

                        {/* Basic Info */}
                        <Text variant="titleMedium" style={styles.sectionTitle}>Basic Info</Text>
                        <TextInput label="Salon Name *" value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} style={styles.input} mode="outlined" />

                        {/* Owner Info */}
                        <Text variant="titleMedium" style={styles.sectionTitle}>Owner Details</Text>
                        <View style={styles.row}>
                            <TextInput
                                label="Owner Phone *"
                                value={formData.ownerPhone}
                                onChangeText={(t) => {
                                    const cleaned = t.replace(/[^0-9]/g, '').slice(0, 10);
                                    setFormData({ ...formData, ownerPhone: cleaned });
                                    if (cleaned.length === 10) {
                                        setFormOwnerLookupLoading(true);
                                        api.get('/salons/lookup-user', { params: { phone: cleaned } })
                                            .then(res => {
                                                if (res.data.found) {
                                                    setFormOwnerFound(res.data.user);
                                                    setFormData(prev => ({ ...prev, ownerName: res.data.user.name }));
                                                } else {
                                                    setFormOwnerFound(false);
                                                    setFormData(prev => ({ ...prev, ownerName: '' }));
                                                }
                                            })
                                            .catch(() => setFormOwnerFound(false))
                                            .finally(() => setFormOwnerLookupLoading(false));
                                    } else {
                                        setFormOwnerFound(null);
                                        setFormData(prev => ({ ...prev, ownerName: '' }));
                                    }
                                }}
                                keyboardType="numeric"
                                maxLength={10}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                mode="outlined"
                                right={formOwnerLookupLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : formData.ownerPhone.length === 10 ? <TextInput.Icon icon={formOwnerFound ? 'check-circle' : 'alert-circle'} color={formOwnerFound ? Colors.success : Colors.warning} /> : undefined}
                            />
                            <TextInput
                                label="Owner Name *"
                                value={formData.ownerName}
                                onChangeText={(t) => setFormData({ ...formData, ownerName: t })}
                                editable={!formOwnerFound || formOwnerFound === false}
                                style={[styles.input, { flex: 1, marginLeft: 8, backgroundColor: formOwnerFound && formOwnerFound !== false ? '#f0f8f0' : 'white' }]}
                                mode="outlined"
                            />
                        </View>
                        {formOwnerFound && formOwnerFound !== false && (
                            <Text variant="bodySmall" style={{ color: Colors.success, marginBottom: 8, marginTop: -8 }}>
                                ✓ Existing user found: {formOwnerFound.name} ({formOwnerFound.role})
                            </Text>
                        )}
                        {formOwnerFound === false && formData.ownerPhone.length === 10 && (
                            <Text variant="bodySmall" style={{ color: Colors.warning, marginBottom: 8, marginTop: -8 }}>
                                ⓘ No user found — a new owner account will be created
                            </Text>
                        )}

                        {/* Manager Info */}
                        <Text variant="titleMedium" style={styles.sectionTitle}>Manager Details</Text>
                        <View style={styles.row}>
                            <TextInput
                                label="Manager Phone"
                                value={formData.managerPhone}
                                onChangeText={(t) => {
                                    const cleaned = t.replace(/[^0-9]/g, '').slice(0, 10);
                                    setFormData({ ...formData, managerPhone: cleaned });
                                    if (cleaned.length === 10) {
                                        setFormManagerLookupLoading(true);
                                        api.get('/salons/lookup-user', { params: { phone: cleaned } })
                                            .then(res => {
                                                if (res.data.found) {
                                                    setFormManagerFound(res.data.user);
                                                    setFormData(prev => ({ ...prev, managerName: res.data.user.name }));
                                                } else {
                                                    setFormManagerFound(false);
                                                    setFormData(prev => ({ ...prev, managerName: '' }));
                                                }
                                            })
                                            .catch(() => setFormManagerFound(false))
                                            .finally(() => setFormManagerLookupLoading(false));
                                    } else {
                                        setFormManagerFound(null);
                                        setFormData(prev => ({ ...prev, managerName: '' }));
                                    }
                                }}
                                keyboardType="numeric"
                                maxLength={10}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                mode="outlined"
                                right={formManagerLookupLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : formData.managerPhone.length === 10 ? <TextInput.Icon icon={formManagerFound ? 'check-circle' : 'alert-circle'} color={formManagerFound ? Colors.success : Colors.warning} /> : undefined}
                            />
                            <TextInput
                                label="Manager Name"
                                value={formData.managerName}
                                onChangeText={(t) => setFormData({ ...formData, managerName: t })}
                                editable={!formManagerFound || formManagerFound === false}
                                style={[styles.input, { flex: 1, marginLeft: 8, backgroundColor: formManagerFound && formManagerFound !== false ? '#f0f8f0' : 'white' }]}
                                mode="outlined"
                            />
                        </View>
                        {formManagerFound && formManagerFound !== false && (
                            <Text variant="bodySmall" style={{ color: Colors.success, marginBottom: 8, marginTop: -8 }}>
                                ✓ Existing user found: {formManagerFound.name} ({formManagerFound.role})
                            </Text>
                        )}
                        {formManagerFound === false && formData.managerPhone.length === 10 && (
                            <Text variant="bodySmall" style={{ color: Colors.warning, marginBottom: 8, marginTop: -8 }}>
                                ⓘ No user found — a new manager entry will be created
                            </Text>
                        )}

                        {/* Location Info */}
                        <Text variant="titleMedium" style={styles.sectionTitle}>Location</Text>
                        <TextInput label="Address" value={formData.address} onChangeText={(t) => setFormData({ ...formData, address: t })} style={styles.input} mode="outlined" />
                        <View style={styles.row}>
                            <TextInput label="City" value={formData.city} onChangeText={(t) => setFormData({ ...formData, city: t })} style={[styles.input, { flex: 1, marginRight: 8 }]} mode="outlined" />
                            <TextInput label="State" value={formData.state} onChangeText={(t) => setFormData({ ...formData, state: t })} style={[styles.input, { flex: 1, marginLeft: 8 }]} mode="outlined" />
                        </View>
                        <View style={styles.row}>
                            <TextInput label="Pincode" value={formData.pincode} onChangeText={(t) => setFormData({ ...formData, pincode: t })} keyboardType="numeric" style={[styles.input, { flex: 1, marginRight: 8 }]} mode="outlined" />
                            <View style={{ flex: 1 }} />
                        </View>

                        <View style={styles.modalActions}>
                            <Button onPress={() => setModalVisible(false)} style={{ marginRight: 10 }}>Cancel</Button>
                            <Button mode="contained" onPress={handleSubmit} loading={createLoading}>
                                {isEditing ? 'Update Salon' : 'Create Salon'}
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>

            {/* Edit Salon Modal */}
            <Portal>
                <Modal visible={editModalVisible} onDismiss={() => setEditModalVisible(false)} contentContainerStyle={styles.modal}>
                    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text variant="titleLarge" style={{ marginBottom: 20, fontWeight: 'bold' }}>
                            Edit Salon & Assign Staff
                        </Text>

                        <Text variant="titleMedium" style={styles.sectionTitle}>Field Force Assignment</Text>
                        <View style={{ borderWidth: 1, borderColor: Colors.border, borderRadius: 4, marginBottom: 16 }}>
                            <Picker
                                selectedValue={selectedAgentForEdit}
                                onValueChange={(itemValue) => setSelectedAgentForEdit(itemValue)}
                                style={{ height: 50, width: '100%' }}
                            >
                                <Picker.Item label="Select Field Agent" value={null} />
                                {fieldAgents.map((agent: any) => (
                                    <Picker.Item key={agent.id} label={agent.name} value={agent.id} />
                                ))}
                            </Picker>
                        </View>

                        <Text variant="titleMedium" style={styles.sectionTitle}>Basic Info</Text>
                        <TextInput label="Salon Name *" value={editName} onChangeText={setEditName} style={styles.input} mode="outlined" />

                        <Text variant="titleMedium" style={styles.sectionTitle}>Owner Details</Text>
                        <View style={styles.row}>
                            <TextInput
                                label="Owner Phone *"
                                value={editOwnerPhone}
                                onChangeText={(t) => {
                                    const cleaned = t.replace(/[^0-9]/g, '').slice(0, 10);
                                    setEditOwnerPhone(cleaned);
                                    if (cleaned.length === 10) lookupUser(cleaned, 'owner');
                                    else { setOwnerFound(null); setEditOwnerName(''); }
                                }}
                                keyboardType="numeric"
                                maxLength={10}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                mode="outlined"
                                right={ownerLookupLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : editOwnerPhone.length === 10 ? <TextInput.Icon icon={ownerFound ? 'check-circle' : 'alert-circle'} color={ownerFound ? Colors.success : Colors.warning} /> : undefined}
                            />
                            <TextInput
                                label="Owner Name *"
                                value={editOwnerName}
                                onChangeText={setEditOwnerName}
                                editable={!ownerFound || ownerFound === false}
                                style={[styles.input, { flex: 1, marginLeft: 8, backgroundColor: ownerFound && ownerFound !== false ? '#f0f8f0' : 'white' }]}
                                mode="outlined"
                            />
                        </View>
                        {ownerFound && ownerFound !== false && (
                            <Text variant="bodySmall" style={{ color: Colors.success, marginBottom: 8, marginTop: -8 }}>
                                ✓ Existing user found: {ownerFound.name} ({ownerFound.role})
                            </Text>
                        )}
                        {ownerFound === false && editOwnerPhone.length === 10 && (
                            <Text variant="bodySmall" style={{ color: Colors.warning, marginBottom: 8, marginTop: -8 }}>
                                ⓘ No user found — a new owner account will be created
                            </Text>
                        )}

                        <Text variant="titleMedium" style={styles.sectionTitle}>Manager Details</Text>
                        <View style={styles.row}>
                            <TextInput
                                label="Manager Phone"
                                value={editManagerPhone}
                                onChangeText={(t) => {
                                    const cleaned = t.replace(/[^0-9]/g, '').slice(0, 10);
                                    setEditManagerPhone(cleaned);
                                    if (cleaned.length === 10) lookupUser(cleaned, 'manager');
                                    else { setManagerFound(null); setEditManagerName(''); }
                                }}
                                keyboardType="numeric"
                                maxLength={10}
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                mode="outlined"
                                right={managerLookupLoading ? <TextInput.Icon icon={() => <ActivityIndicator size={18} />} /> : editManagerPhone.length === 10 ? <TextInput.Icon icon={managerFound ? 'check-circle' : 'alert-circle'} color={managerFound ? Colors.success : Colors.warning} /> : undefined}
                            />
                            <TextInput
                                label="Manager Name"
                                value={editManagerName}
                                onChangeText={setEditManagerName}
                                editable={!managerFound || managerFound === false}
                                style={[styles.input, { flex: 1, marginLeft: 8, backgroundColor: managerFound && managerFound !== false ? '#f0f8f0' : 'white' }]}
                                mode="outlined"
                            />
                        </View>
                        {managerFound && managerFound !== false && (
                            <Text variant="bodySmall" style={{ color: Colors.success, marginBottom: 8, marginTop: -8 }}>
                                ✓ Existing user found: {managerFound.name} ({managerFound.role})
                            </Text>
                        )}
                        {managerFound === false && editManagerPhone.length === 10 && (
                            <Text variant="bodySmall" style={{ color: Colors.warning, marginBottom: 8, marginTop: -8 }}>
                                ⓘ No user found — a new manager entry will be created
                            </Text>
                        )}

                        <Text variant="titleMedium" style={styles.sectionTitle}>Location</Text>
                        <TextInput label="Address" value={editAddress} onChangeText={setEditAddress} style={styles.input} mode="outlined" />
                        <View style={styles.row}>
                            <TextInput label="Latitude" value={editLocation.latitude} onChangeText={(t) => setEditLocation({ ...editLocation, latitude: t })} style={[styles.input, { flex: 1, marginRight: 8 }]} mode="outlined" />
                            <TextInput label="Longitude" value={editLocation.longitude} onChangeText={(t) => setEditLocation({ ...editLocation, longitude: t })} style={[styles.input, { flex: 1, marginLeft: 8 }]} mode="outlined" />
                        </View>

                        {/* Stage Pipeline */}
                        <Text variant="titleMedium" style={styles.sectionTitle}>Stage Pipeline</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            {STAGE_ORDER.map((stage, idx) => {
                                const isActive = stage === editStage;
                                const isPast = STAGE_ORDER.indexOf(editStage) > idx;
                                const color = isPast ? '#4CAF50' : isActive ? STAGE_COLORS[stage] : '#E0E0E0';
                                return (
                                    <React.Fragment key={stage}>
                                        <View style={{ alignItems: 'center', flex: 1 }}>
                                            <View style={{
                                                width: 28, height: 28, borderRadius: 14,
                                                backgroundColor: color,
                                                justifyContent: 'center', alignItems: 'center',
                                                borderWidth: isActive ? 3 : 0,
                                                borderColor: isActive ? color + '60' : undefined,
                                            }}>
                                                <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{isPast ? '✓' : idx + 1}</Text>
                                            </View>
                                            <Text style={{ fontSize: 9, marginTop: 4, color: isActive ? color : '#999', fontWeight: isActive ? 'bold' : 'normal', textAlign: 'center' }}>
                                                {STAGE_LABELS[stage]}
                                            </Text>
                                        </View>
                                        {idx < STAGE_ORDER.length - 1 && (
                                            <View style={{ height: 2, flex: 0.5, backgroundColor: isPast ? '#4CAF50' : '#E0E0E0', marginTop: -14 }} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </View>

                        {/* Checklist for current stage */}
                        {(STAGE_CHECKLIST_ITEMS[editStage] || []).length > 0 && (
                            <Card mode="outlined" style={{ marginBottom: 16, borderColor: STAGE_COLORS[editStage] + '40' }}>
                                <Card.Content>
                                    <Text variant="titleSmall" style={{ marginBottom: 8, fontWeight: 'bold', color: STAGE_COLORS[editStage] }}>
                                        {STAGE_LABELS[editStage]} Checklist
                                    </Text>
                                    {(STAGE_CHECKLIST_ITEMS[editStage] || []).map(key => (
                                        <View key={key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                                            <Checkbox
                                                status={editChecklist[key] ? 'checked' : 'unchecked'}
                                                onPress={() => handleChecklistToggle(key, !editChecklist[key])}
                                                color={STAGE_COLORS[editStage]}
                                            />
                                            <Text style={{ flex: 1, color: editChecklist[key] ? '#333' : '#999' }}>
                                                {CHECKLIST_LABELS[key] || key}
                                            </Text>
                                        </View>
                                    ))}
                                    {(() => {
                                        const items = STAGE_CHECKLIST_ITEMS[editStage] || [];
                                        const allDone = items.length > 0 && items.every(k => editChecklist[k]);
                                        const currentIdx = STAGE_ORDER.indexOf(editStage);
                                        const canAdvance = allDone && currentIdx < STAGE_ORDER.length - 1 && editStage !== 'ACTIVATED' && editStage !== 'CLOSED';
                                        return canAdvance ? (
                                            <Button
                                                mode="contained"
                                                onPress={handleAdvanceStage}
                                                loading={advancingStage}
                                                icon="check-decagram"
                                                style={{ marginTop: 12, backgroundColor: '#4CAF50' }}
                                                labelStyle={{ fontWeight: 'bold' }}
                                            >
                                                Verify & Advance to {STAGE_LABELS[STAGE_ORDER[currentIdx + 1]]}
                                            </Button>
                                        ) : null;
                                    })()}
                                </Card.Content>
                            </Card>
                        )}
                        {editStage === 'ACTIVATED' && (
                            <Card mode="outlined" style={{ marginBottom: 16, borderColor: '#4CAF5040' }}>
                                <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <IconButton icon="check-circle" iconColor="#4CAF50" size={24} />
                                    <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>This store is activated and live.</Text>
                                </Card.Content>
                            </Card>
                        )}
                        {editStage === 'CLOSED' && (
                            <Card mode="outlined" style={{ marginBottom: 16, borderColor: '#F4433640' }}>
                                <Card.Content style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <IconButton icon="close-circle" iconColor="#F44336" size={24} />
                                    <Text style={{ color: '#F44336', fontWeight: 'bold' }}>This store is closed.</Text>
                                </Card.Content>
                            </Card>
                        )}

                        {/* Uploaded Photos */}
                        <Text variant="titleMedium" style={styles.sectionTitle}>Uploaded Photos</Text>
                        {photosLoading ? (
                            <ActivityIndicator size="small" style={{ marginVertical: 16 }} />
                        ) : salonPhotos.length === 0 ? (
                            <Card mode="outlined" style={{ marginBottom: 16, borderColor: Colors.border }}>
                                <Card.Content style={{ alignItems: 'center', padding: 20 }}>
                                    <IconButton icon="image-off" size={32} iconColor={Colors.textSecondary} />
                                    <Text style={{ color: Colors.textSecondary }}>No photos uploaded yet</Text>
                                </Card.Content>
                            </Card>
                        ) : (
                            <View style={{ marginBottom: 16 }}>
                                {Object.entries(
                                    salonPhotos.reduce((acc: Record<string, any[]>, p: any) => {
                                        const key = p.checklistItem || p.stage || 'other';
                                        if (!acc[key]) acc[key] = [];
                                        acc[key].push(p);
                                        return acc;
                                    }, {})
                                ).map(([itemKey, itemPhotos]) => (
                                    <View key={itemKey} style={{ marginBottom: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 6 }}>
                                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: Colors.text }}>
                                                {CHECKLIST_LABELS[itemKey] || STAGE_LABELS[itemKey] || itemKey}
                                            </Text>
                                            {(itemPhotos as any[])[0]?.stage && (
                                                <Text style={{ fontSize: 10, color: STAGE_COLORS[(itemPhotos as any[])[0].stage] || '#999' }}>
                                                    ({STAGE_LABELS[(itemPhotos as any[])[0].stage] || (itemPhotos as any[])[0].stage})
                                                </Text>
                                            )}
                                        </View>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {(itemPhotos as any[]).map((photo: any) => (
                                                <View key={photo.id} style={{ width: '30%', position: 'relative' }}>
                                                    <Image
                                                        source={{ uri: photo.url }}
                                                        style={{ width: '100%', height: 100, borderRadius: 8 }}
                                                        resizeMode="cover"
                                                    />
                                                    <IconButton
                                                        icon="close-circle"
                                                        size={18}
                                                        iconColor="#F44336"
                                                        style={{ position: 'absolute', top: -8, right: -8, backgroundColor: 'white', margin: 0 }}
                                                        onPress={() => handleDeletePhoto(photo.id)}
                                                    />
                                                    {photo.uploadedBy && (
                                                        <Text style={{ fontSize: 9, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 }}>
                                                            by {photo.uploadedBy.name}
                                                        </Text>
                                                    )}
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={styles.modalActions}>
                            <Button onPress={() => setEditModalVisible(false)} style={{ marginRight: 10 }}>Cancel</Button>
                            <Button mode="contained" onPress={saveSalonEdits} loading={saving}>
                                Save Changes
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>

            {/* Manage Stylists Modal */}
            <Portal>
                <Modal visible={stylistModalVisible} onDismiss={() => setStylistModalVisible(false)} contentContainerStyle={styles.modal}>
                    <View style={{ maxHeight: 600 }}>
                        <Text variant="titleLarge" style={{ marginBottom: 4, fontWeight: 'bold' }}>
                            Manage Stylists
                        </Text>
                        <Text variant="bodyMedium" style={{ marginBottom: 20, color: Colors.textSecondary }}>
                            {currentSalonForStylists?.name}
                        </Text>

                        <Card mode="outlined" style={{ marginBottom: 16, borderColor: Colors.border }}>
                            <Card.Content>
                                <Text variant="titleMedium" style={{ marginBottom: 10, color: Colors.primary }}>Add New Stylist</Text>
                                <TextInput
                                    label="Stylist Name (Optional)"
                                    placeholder="Enter name"
                                    value={newStylistName}
                                    onChangeText={setNewStylistName}
                                    style={[styles.input, { marginBottom: 10 }]}
                                    mode="outlined"
                                    dense
                                />
                                <View style={styles.row}>
                                    <TextInput
                                        label="Stylist Phone"
                                        placeholder="Enter phone"
                                        value={newStylistPhone}
                                        onChangeText={(t) => setNewStylistPhone(t.replace(/[^0-9]/g, '').slice(0, 10))}
                                        keyboardType="numeric"
                                        maxLength={10}
                                        style={[styles.input, { flex: 1, marginRight: 8 }]}
                                        mode="outlined"
                                        dense
                                    />
                                    <Button
                                        mode="contained"
                                        onPress={handleAddStylist}
                                        loading={addStylistLoading}
                                        disabled={newStylistPhone.length < 10}
                                        style={{ justifyContent: 'center' }}
                                    >
                                        Add
                                    </Button>
                                </View>
                            </Card.Content>
                        </Card>

                        <Divider style={{ marginVertical: 10 }} />
                        <Text variant="titleMedium" style={{ marginBottom: 12 }}>Assigned Stylists ({currentSalonForStylists?.stylists?.length || 0})</Text>

                        <ScrollView style={{ maxHeight: 300 }}>
                            {currentSalonForStylists?.stylists && currentSalonForStylists.stylists.length > 0 ? (
                                currentSalonForStylists.stylists.map((stylist: any) => (
                                    <View key={stylist.id} style={styles.stylistItem}>
                                        <View>
                                            <Text variant="bodyMedium" style={{ fontWeight: 'bold' }}>{stylist.name}</Text>
                                            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>{stylist.phone}</Text>
                                            {stylist.assignedAgentName && (
                                                <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Agent: {stylist.assignedAgentName}</Text>
                                            )}
                                        </View>
                                        <Button
                                            textColor={Colors.error}
                                            onPress={() => handleRemoveStylist(stylist.id)}
                                            compact
                                        >
                                            Remove
                                        </Button>
                                    </View>
                                ))
                            ) : (
                                <Text variant="bodySmall" style={{ fontStyle: 'italic', marginBottom: 10, alignSelf: 'center', marginTop: 10, color: Colors.textSecondary }}>No stylists assigned yet.</Text>
                            )}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <Button onPress={() => setStylistModalVisible(false)}>Close</Button>
                        </View>
                    </View>
                </Modal>
            </Portal>

            {/* Level Management Modal */}
            <Portal>
                <Modal visible={levelDialogVisible} onDismiss={() => setLevelDialogVisible(false)} contentContainerStyle={styles.modal}>
                    <Text variant="titleLarge" style={{ marginBottom: 10, fontWeight: 'bold' }}>Update Level</Text>
                    <Text variant="bodyMedium" style={{ marginBottom: 10 }}>
                        Select level for <Text style={{ fontWeight: 'bold' }}>{selectedSalonForLevel?.name}</Text>:
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
                    <View style={styles.modalActions}>
                        <Button onPress={() => setLevelDialogVisible(false)}>Cancel</Button>
                        <Button mode="contained" onPress={handleLevelUpdate} loading={levelLoading} style={{ marginLeft: 8 }}>Update</Button>
                    </View>
                </Modal>
            </Portal>
        </AdminPageLayout >
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    addButton: {
        borderRadius: 8,
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
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
        maxHeight: '90%'
    },
    input: {
        marginBottom: 12,
        backgroundColor: 'white',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 4
    },
    sectionTitle: {
        marginTop: 16,
        marginBottom: 8,
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 24,
    },
    stylistItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border
    },
    radioRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8
    }
});
