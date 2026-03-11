import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import {
    Text,
    DataTable,
    Button,
    IconButton,
    Portal,
    Modal,
    TextInput,
    ActivityIndicator,
    FAB,
    SegmentedButtons,
    Switch,
} from 'react-native-paper';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export default function ExperienceCentersScreen() {
    const { user } = useAuth();
    const [ecs, setEcs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalVisible, setModalVisible] = useState(false);
    const [editingEc, setEditingEc] = useState<any>(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [form, setForm] = useState({
        name: '',
        type: 'FULL',
        city: '',
        address: '',
        managerName: '',
        managerContact: '',
        isActive: true,
    });

    useEffect(() => {
        if (user) {
            loadEcs();
        }
    }, [user]);

    const loadEcs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/experience-centers');
            setEcs(res.data);
        } catch (error: any) {
            console.error('Failed to load ECs', error);
            Alert.alert('Error', 'Failed to load experience centers');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!form.name || !form.city) {
            Alert.alert('Error', 'Please provide at least a Name and City.');
            return;
        }

        setSaving(true);
        try {
            if (editingEc) {
                // Update
                await api.post(`/admin/experience-centers/${editingEc.id}`, form);
                Alert.alert('Success', 'Experience center updated');
            } else {
                // Create
                await api.post('/admin/experience-centers', form);
                Alert.alert('Success', 'Experience center created');
            }
            setModalVisible(false);
            loadEcs();
        } catch (error: any) {
            console.error('Failed to save EC', error?.response?.data || error);
            Alert.alert('Error', error?.response?.data?.message || 'Failed to save experience center');
        } finally {
            setSaving(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            await api.post(`/admin/experience-centers/${id}/status`, { isActive: !currentStatus });
            loadEcs();
        } catch (error) {
            console.error('Failed to toggle status', error);
            Alert.alert('Error', 'Could not update status');
        }
    };

    const openCreateModal = () => {
        setEditingEc(null);
        setForm({
            name: '',
            type: 'FULL',
            city: '',
            address: '',
            managerName: '',
            managerContact: '',
            isActive: true,
        });
        setModalVisible(true);
    };

    const openEditModal = (ec: any) => {
        setEditingEc(ec);
        setForm({
            name: ec.name || '',
            type: ec.type || 'FULL',
            city: ec.city || '',
            address: ec.address || '',
            managerName: ec.managerName || '',
            managerContact: ec.managerContact || '',
            isActive: ec.isActive !== false,
        });
        setModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Experience Centers</Text>
                    <Text style={styles.subtitle}>Manage physical stores and mini centers</Text>
                </View>
                <Button mode="contained" onPress={openCreateModal} icon="plus">
                    Add Center
                </Button>
            </View>

            <ScrollView style={styles.tableContainer} horizontal>
                <View style={{ minWidth: 900 }}>
                    <DataTable>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title style={{ flex: 2 }}>Name</DataTable.Title>
                            <DataTable.Title style={{ flex: 1 }}>Type</DataTable.Title>
                            <DataTable.Title style={{ flex: 1.5 }}>City</DataTable.Title>
                            <DataTable.Title style={{ flex: 2 }}>Manager</DataTable.Title>
                            <DataTable.Title style={{ flex: 1 }}>Status</DataTable.Title>
                            <DataTable.Title style={{ flex: 1, justifyContent: 'center' }}>Actions</DataTable.Title>
                        </DataTable.Header>

                        {loading ? (
                            <ActivityIndicator style={{ marginTop: 40 }} />
                        ) : ecs.length === 0 ? (
                            <Text style={{ textAlign: 'center', marginTop: 40, color: '#6B7280' }}>
                                No experience centers found.
                            </Text>
                        ) : (
                            ecs.map((ec) => (
                                <DataTable.Row key={ec.id} style={styles.tableRow}>
                                    <DataTable.Cell style={{ flex: 2 }}>
                                        <View>
                                            <Text style={{ fontWeight: '500', color: '#111827' }}>{ec.name}</Text>
                                            {!!ec.address && <Text style={{ fontSize: 11, color: '#6B7280' }} numberOfLines={1}>{ec.address}</Text>}
                                        </View>
                                    </DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 1 }}>
                                        <View style={[styles.badge, { backgroundColor: ec.type === 'FULL' ? '#DBEAFE' : '#FEF3C7' }]}>
                                            <Text style={{ fontSize: 11, color: ec.type === 'FULL' ? '#1D4ED8' : '#D97706', fontWeight: '600' }}>
                                                {ec.type}
                                            </Text>
                                        </View>
                                    </DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 1.5 }}>{ec.city || '—'}</DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 2 }}>
                                        <View>
                                            <Text style={{ fontSize: 13 }}>{ec.managerName || '—'}</Text>
                                            {!!ec.managerContact && <Text style={{ fontSize: 11, color: '#6B7280' }}>{ec.managerContact}</Text>}
                                        </View>
                                    </DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 1 }}>
                                        <Switch
                                            value={ec.isActive}
                                            onValueChange={() => toggleStatus(ec.id, ec.isActive)}
                                            color="#10B981"
                                        />
                                    </DataTable.Cell>
                                    <DataTable.Cell style={{ flex: 1, justifyContent: 'center' }}>
                                        <IconButton
                                            icon="pencil"
                                            size={20}
                                            iconColor="#4B5563"
                                            onPress={() => openEditModal(ec)}
                                        />
                                    </DataTable.Cell>
                                </DataTable.Row>
                            ))
                        )}
                    </DataTable>
                </View>
            </ScrollView>

            <Portal>
                <Modal
                    visible={modalVisible}
                    onDismiss={() => setModalVisible(false)}
                    contentContainerStyle={styles.modal}
                >
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>
                            {editingEc ? 'Edit Experience Center' : 'New Experience Center'}
                        </Text>

                        <Text style={styles.label}>Type</Text>
                        <SegmentedButtons
                            value={form.type}
                            onValueChange={(val) => setForm({ ...form, type: val })}
                            buttons={[
                                { value: 'FULL', label: 'Full Center' },
                                { value: 'MINI', label: 'Mini Center' },
                            ]}
                            style={{ marginBottom: 16 }}
                        />

                        <Text style={styles.label}>Center Name *</Text>
                        <TextInput
                            value={form.name}
                            onChangeText={(val) => setForm({ ...form, name: val })}
                            mode="outlined"
                            style={styles.input}
                            placeholder="e.g. Bangalore HSR Layout"
                        />

                        <Text style={styles.label}>City *</Text>
                        <TextInput
                            value={form.city}
                            onChangeText={(val) => setForm({ ...form, city: val })}
                            mode="outlined"
                            style={styles.input}
                        />

                        <Text style={styles.label}>Full Address</Text>
                        <TextInput
                            value={form.address}
                            onChangeText={(val) => setForm({ ...form, address: val })}
                            mode="outlined"
                            style={styles.input}
                            multiline
                            numberOfLines={2}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Manager Name</Text>
                                <TextInput
                                    value={form.managerName}
                                    onChangeText={(val) => setForm({ ...form, managerName: val })}
                                    mode="outlined"
                                    style={styles.input}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Manager Contact</Text>
                                <TextInput
                                    value={form.managerContact}
                                    onChangeText={(val) => setForm({ ...form, managerContact: val })}
                                    mode="outlined"
                                    style={styles.input}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <Button mode="text" onPress={() => setModalVisible(false)} disabled={saving}>
                                Cancel
                            </Button>
                            <Button
                                mode="contained"
                                onPress={handleSave}
                                loading={saving}
                                disabled={saving}
                            >
                                Save
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    tableContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tableHeader: {
        backgroundColor: '#F9FAFB',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    tableRow: {
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    modal: {
        backgroundColor: 'white',
        padding: 24,
        margin: 24,
        borderRadius: 12,
        maxWidth: 500,
        alignSelf: 'center',
        width: '100%',
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4B5563',
        marginBottom: 6,
    },
    input: {
        marginBottom: 16,
        backgroundColor: '#FFFFFF',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 24,
    },
});
