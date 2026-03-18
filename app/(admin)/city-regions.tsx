import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
    Text,
    Button,
    IconButton,
    Portal,
    Modal,
    TextInput,
    ActivityIndicator,
    Switch,
    Chip,
} from 'react-native-paper';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function CityRegionsScreen() {
    const { user } = useAuth();
    const [regions, setRegions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [editingRegion, setEditingRegion] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Form state
    const [form, setForm] = useState({ regionCode: '', regionName: '', cities: '' });
    const [newCity, setNewCity] = useState('');
    const [cityList, setCityList] = useState<string[]>([]);

    useEffect(() => { if (user) loadRegions(); }, [user]);

    const loadRegions = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/city-regions');
            setRegions(res.data);
        } catch (e: any) {
            Alert.alert('Error', 'Failed to load city regions');
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setEditingRegion(null);
        setForm({ regionCode: '', regionName: '', cities: '' });
        setCityList([]);
        setNewCity('');
        setModalVisible(true);
    };

    const openEditModal = (region: any) => {
        setEditingRegion(region);
        setForm({ regionCode: region.regionCode, regionName: region.regionName, cities: '' });
        setCityList([...(region.cities ?? [])]);
        setNewCity('');
        setModalVisible(true);
    };

    const addCity = () => {
        const trimmed = newCity.trim().toLowerCase();
        if (!trimmed) return;
        if (cityList.includes(trimmed)) {
            Alert.alert('Duplicate', `"${trimmed}" is already in the list`);
            return;
        }
        setCityList(prev => [...prev, trimmed]);
        setNewCity('');
    };

    const removeCity = (city: string) => {
        setCityList(prev => prev.filter(c => c !== city));
    };

    const handleSave = async () => {
        if (!form.regionName.trim()) {
            Alert.alert('Validation', 'Region Name is required');
            return;
        }
        if (!editingRegion && !form.regionCode.trim()) {
            Alert.alert('Validation', 'Region Code is required');
            return;
        }

        setSaving(true);
        try {
            if (editingRegion) {
                await api.post(`/admin/city-regions/${editingRegion.id}`, {
                    regionName: form.regionName.trim(),
                    cities: cityList,
                });
                Alert.alert('Success', 'Region updated successfully');
            } else {
                await api.post('/admin/city-regions', {
                    regionCode: form.regionCode.trim().toUpperCase().replace(/\s+/g, '_'),
                    regionName: form.regionName.trim(),
                    cities: cityList,
                });
                Alert.alert('Success', 'Region created successfully');
            }
            setModalVisible(false);
            loadRegions();
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to save region');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (region: any) => {
        try {
            await api.post(`/admin/city-regions/${region.id}`, { isActive: !region.isActive });
            loadRegions();
        } catch {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleDelete = (region: any) => {
        Alert.alert(
            'Delete Region',
            `Are you sure you want to delete "${region.regionName}"? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(region.id);
                        try {
                            await api.delete(`/admin/city-regions/${region.id}`);
                            loadRegions();
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete region');
                        } finally {
                            setDeleting(null);
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>City Regions</Text>
                    <Text style={styles.subtitle}>Manage which cities belong to each caller region</Text>
                </View>
                <Button mode="contained" onPress={openCreateModal} icon="plus">
                    Add Region
                </Button>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 60 }} size="large" />
            ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                    {regions.length === 0 ? (
                        <Text style={{ textAlign: 'center', marginTop: 60, color: '#6B7280' }}>
                            No regions found.
                        </Text>
                    ) : (
                        regions.map(region => (
                            <View key={region.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <Text style={styles.regionName}>{region.regionName}</Text>
                                            <View style={[
                                                styles.codeBadge,
                                                { backgroundColor: region.isActive ? '#DBEAFE' : '#F3F4F6' }
                                            ]}>
                                                <Text style={[
                                                    styles.codeText,
                                                    { color: region.isActive ? '#1D4ED8' : '#9CA3AF' }
                                                ]}>
                                                    {region.regionCode}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.cityCount}>
                                            {region.cities?.length ?? 0} city keyword{(region.cities?.length ?? 0) !== 1 ? 's' : ''}
                                        </Text>
                                    </View>

                                    <View style={styles.cardActions}>
                                        <Switch
                                            value={region.isActive}
                                            onValueChange={() => handleToggleActive(region)}
                                            color="#10B981"
                                        />
                                        <IconButton
                                            icon="pencil"
                                            size={20}
                                            iconColor="#4B5563"
                                            onPress={() => openEditModal(region)}
                                        />
                                        {region.regionCode !== 'REST_OF_INDIA' && (
                                            deleting === region.id ? (
                                                <ActivityIndicator size={20} />
                                            ) : (
                                                <IconButton
                                                    icon="trash-can-outline"
                                                    size={20}
                                                    iconColor="#EF4444"
                                                    onPress={() => handleDelete(region)}
                                                />
                                            )
                                        )}
                                    </View>
                                </View>

                                {/* City chips */}
                                {(region.cities?.length ?? 0) > 0 && (
                                    <View style={styles.chipsContainer}>
                                        {region.cities.map((city: string) => (
                                            <View key={city} style={styles.cityChip}>
                                                <Text style={styles.cityChipText}>{city}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                                {region.regionCode === 'REST_OF_INDIA' && (
                                    <Text style={styles.fallbackNote}>
                                        ℹ️ This is the catch-all fallback for cities not matched by any other region.
                                    </Text>
                                )}
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Add/Edit Modal */}
            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                        <Text style={styles.modalTitle}>
                            {editingRegion ? `Edit: ${editingRegion.regionName}` : 'New Region'}
                        </Text>

                        {!editingRegion && (
                            <>
                                <Text style={styles.label}>Region Code * <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(e.g. BANGALORE)</Text></Text>
                                <TextInput
                                    value={form.regionCode}
                                    onChangeText={val => setForm({ ...form, regionCode: val.toUpperCase().replace(/\s+/g, '_') })}
                                    mode="outlined"
                                    style={styles.input}
                                    placeholder="BANGALORE"
                                    autoCapitalize="characters"
                                />
                            </>
                        )}

                        <Text style={styles.label}>Region Name *</Text>
                        <TextInput
                            value={form.regionName}
                            onChangeText={val => setForm({ ...form, regionName: val })}
                            mode="outlined"
                            style={styles.input}
                            placeholder="e.g. Bangalore"
                        />

                        <Text style={styles.label}>City Keywords</Text>
                        <Text style={styles.hint}>
                            Add lowercase keywords. A lead city matching any of these keywords will be assigned to this region.
                        </Text>

                        {/* Existing chips */}
                        {cityList.length > 0 && (
                            <View style={styles.chipsContainer}>
                                {cityList.map(city => (
                                    <View key={city} style={[styles.cityChip, styles.editableChip]}>
                                        <Text style={styles.cityChipText}>{city}</Text>
                                        <TouchableOpacity onPress={() => removeCity(city)} style={{ marginLeft: 4 }}>
                                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 14 }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Add new city */}
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                            <TextInput
                                value={newCity}
                                onChangeText={setNewCity}
                                mode="outlined"
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder="e.g. bangalore"
                                autoCapitalize="none"
                                onSubmitEditing={addCity}
                            />
                            <Button mode="outlined" onPress={addCity} style={{ marginTop: 2 }}>
                                Add
                            </Button>
                        </View>

                        <View style={styles.modalActions}>
                            <Button mode="text" onPress={() => setModalVisible(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
                                Save Region
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6', padding: 24 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 16,
        marginBottom: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    regionName: { fontSize: 16, fontWeight: '700', color: '#111827' },
    codeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    codeText: { fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
    cityCount: { fontSize: 12, color: '#6B7280', marginTop: 3 },
    cardActions: { flexDirection: 'row', alignItems: 'center' },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 12,
    },
    cityChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderWidth: 1,
        borderColor: '#BBF7D0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 16,
    },
    editableChip: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
    cityChipText: { fontSize: 12, color: '#166534', fontWeight: '500' },
    fallbackNote: {
        marginTop: 10,
        fontSize: 12,
        color: '#6B7280',
        fontStyle: 'italic',
    },
    modal: {
        backgroundColor: 'white',
        padding: 24,
        margin: 24,
        borderRadius: 12,
        maxWidth: 520,
        alignSelf: 'center',
        width: '100%',
        maxHeight: '90%',
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 4 },
    hint: { fontSize: 12, color: '#9CA3AF', marginBottom: 10 },
    input: { marginBottom: 16, backgroundColor: '#FFFFFF' },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
});
