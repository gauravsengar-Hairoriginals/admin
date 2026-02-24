import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { DataTable, FAB, Portal, Modal, Text, TextInput, Button, useTheme, IconButton, List, Chip } from 'react-native-paper';
import AdminPageLayout from '../../components/AdminPageLayout';
import api from '../../services/api';

export default function FieldForceScreen() {
    const theme = useTheme();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);

    // Form State
    const [newAgent, setNewAgent] = useState({ name: '', email: '', phone: '', password: '' });

    const fetchAgents = async () => {
        try {
            const response = await api.get('/users/field-force');
            setAgents(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const handleCreateAgent = async () => {
        try {
            await api.post('/users/field-force', newAgent);
            setCreateModalVisible(false);
            setNewAgent({ name: '', email: '', phone: '', password: '' });
            fetchAgents();
        } catch (error) {
            console.error('Error creating agent:', error);
            alert('Failed to create agent');
        }
    };

    // Assignment Logic
    const [salonQuery, setSalonQuery] = useState('');
    const [salonResults, setSalonResults] = useState([]);
    const [selectedSalons, setSelectedSalons] = useState([]); // Array of salon objects
    const [isSearching, setIsSearching] = useState(false);
    const [assignLoading, setAssignLoading] = useState(false);

    const searchSalons = async (query) => {
        setSalonQuery(query);
        if (query.length < 3) {
            setSalonResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const response = await api.get('/admin/salons', { params: { search: query } });
            setSalonResults(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleSalonSelection = (salon) => {
        if (selectedSalons.find(s => s.id === salon.id)) {
            setSelectedSalons(selectedSalons.filter(s => s.id !== salon.id));
        } else {
            setSelectedSalons([...selectedSalons, salon]);
        }
    };

    const handleAssignSalons = async () => {
        if (!selectedAgent || selectedSalons.length === 0) return;
        setAssignLoading(true);
        try {
            await api.post('/users/field-force/assign', {
                agentId: selectedAgent.id,
                salonIds: selectedSalons.map(s => s.id)
            });
            setAssignModalVisible(false);
            setSelectedSalons([]);
            setSalonQuery('');
            setSalonResults([]);
            fetchAgents(); // Refresh counts
            alert('Salons assigned successfully');
        } catch (error) {
            console.error(error);
            alert('Failed to assign salons');
        } finally {
            setAssignLoading(false);
        }
    };

    // Fetch already assigned salons when opening modal
    const fetchAssignedSalons = async (agentId) => {
        try {
            const response = await api.get(`/users/field-force/${agentId}/salons`);
            // Map to salon objects from the relation
            const assigned = response.data.map(mapping => mapping.salon);
            setSelectedSalons(assigned);
        } catch (error) {
            console.error(error);
        }
    };

    const openAssignModal = (agent) => {
        setSelectedAgent(agent);
        setAssignModalVisible(true);
        fetchAssignedSalons(agent.id);
    };

    return (
        <AdminPageLayout>
            <View style={{ marginBottom: 20 }}>
                <Text variant="headlineMedium" style={{ fontWeight: 'bold' }}>Field Force Management</Text>
            </View>
            <View style={styles.container}>
                <DataTable>
                    <DataTable.Header>
                        <DataTable.Title>Name</DataTable.Title>
                        <DataTable.Title>Phone</DataTable.Title>
                        <DataTable.Title numeric>Salons</DataTable.Title>
                        <DataTable.Title numeric>Actions</DataTable.Title>
                    </DataTable.Header>

                    {agents.map((agent) => (
                        <DataTable.Row key={agent.id}>
                            <DataTable.Cell>{agent.name}</DataTable.Cell>
                            <DataTable.Cell>{agent.phone}</DataTable.Cell>
                            <DataTable.Cell numeric>{agent.assignedSalonsCount || 0}</DataTable.Cell>
                            <DataTable.Cell numeric>
                                <IconButton icon="map-marker-plus" onPress={() => openAssignModal(agent)} />
                            </DataTable.Cell>
                        </DataTable.Row>
                    ))}
                </DataTable>
            </View>

            <Portal>
                <Modal visible={createModalVisible} onDismiss={() => setCreateModalVisible(false)} contentContainerStyle={styles.modal}>
                    <Text style={styles.modalTitle}>Register Field Agent</Text>
                    <TextInput
                        label="Name"
                        value={newAgent.name}
                        onChangeText={(text) => setNewAgent({ ...newAgent, name: text })}
                        style={styles.input}
                    />
                    <TextInput
                        label="Email"
                        value={newAgent.email}
                        onChangeText={(text) => setNewAgent({ ...newAgent, email: text })}
                        style={styles.input}
                    />
                    <TextInput
                        label="Phone"
                        value={newAgent.phone}
                        onChangeText={(text) => setNewAgent({ ...newAgent, phone: text })}
                        style={styles.input}
                        keyboardType="phone-pad"
                    />
                    <TextInput
                        label="Password"
                        value={newAgent.password}
                        onChangeText={(text) => setNewAgent({ ...newAgent, password: text })}
                        style={styles.input}
                        secureTextEntry
                    />
                    <Button mode="contained" onPress={handleCreateAgent} style={styles.button}>
                        Create Agent
                    </Button>
                </Modal>

                <Modal visible={assignModalVisible} onDismiss={() => setAssignModalVisible(false)} contentContainerStyle={styles.modal}>
                    <Text style={styles.modalTitle}>Assign Salons to {selectedAgent?.name}</Text>

                    <View style={{ marginBottom: 16 }}>
                        <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Selected Salons ({selectedSalons.length})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 60 }}>
                            {selectedSalons.map(salon => (
                                <Chip
                                    key={salon.id}
                                    onClose={() => toggleSalonSelection(salon)}
                                    style={{ marginRight: 8, backgroundColor: '#E0F2F1' }}
                                >
                                    {salon.name}
                                </Chip>
                            ))}
                        </ScrollView>
                    </View>

                    <TextInput
                        label="Search Salons (Name/Phone)"
                        value={salonQuery}
                        onChangeText={searchSalons}
                        style={styles.input}
                        right={isSearching ? <TextInput.Icon icon="loading" /> : null}
                    />

                    {salonResults.length > 0 && (
                        <View style={{ height: 200, borderWidth: 1, borderColor: '#eee', marginBottom: 16 }}>
                            <ScrollView>
                                {salonResults.map(salon => {
                                    const isSelected = selectedSalons.some(s => s.id === salon.id);
                                    return (
                                        <List.Item
                                            key={salon.id}
                                            title={salon.name}
                                            description={`${salon.city} | ${salon.ownerPhone}`}
                                            onPress={() => toggleSalonSelection(salon)}
                                            right={props => <List.Icon {...props} icon={isSelected ? "check-circle" : "plus-circle-outline"} color={isSelected ? "green" : "grey"} />}
                                            style={{ backgroundColor: isSelected ? '#F1F8E9' : 'white' }}
                                        />
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
                        <Button onPress={() => setAssignModalVisible(false)}>Cancel</Button>
                        <Button mode="contained" onPress={handleAssignSalons} loading={assignLoading}>Save Assignments</Button>
                    </View>
                </Modal>
            </Portal>

            <FAB
                style={[styles.fab, { backgroundColor: theme.colors.primary }]}
                icon="plus"
                onPress={() => setCreateModalVisible(true)}
                label="Add Agent"
            />
        </AdminPageLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
    },
    modal: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    input: {
        marginBottom: 12,
    },
    button: {
        marginTop: 12,
    },
});
