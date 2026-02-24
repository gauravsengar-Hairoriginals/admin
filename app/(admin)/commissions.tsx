import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';
import { Text, DataTable, Button, Modal, Portal, TextInput, ActivityIndicator, IconButton, Card, HelperText, Chip, Searchbar, Divider } from 'react-native-paper';
import { Colors } from '../../constants/Colors';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import AdminPageLayout from '../../components/AdminPageLayout';

enum CommissionType {
    PERCENTAGE = 'percentage',
    FIXED = 'fixed',
    TIERED = 'tiered',
}

enum Level {
    SILVER = 'silver',
    GOLD = 'gold',
    PLATINUM = 'platinum',
}

enum UserRole {
    STYLIST = 'STYLIST',
    SALON_OWNER = 'SALON_OWNER',
    SALON_MANAGER = 'SALON_MANAGER',
    FIELD_AGENT = 'FIELD_AGENT',
}

interface CommissionRule {
    id?: string;
    name: string;
    type: CommissionType;
    value: number;
    minOrderAmount: number;
    maxCommission?: number;
    allowedLevels?: Level[];
    roleApplicable?: UserRole[];
    productIds?: string[];
    isActive: boolean;
    validFrom?: string;
    validUntil?: string;
    priority?: number;
}

interface Product {
    id: string;
    title: string;
    vendor: string;
}

export default function CommissionsScreen() {
    const [rules, setRules] = useState<CommissionRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

    // Product Search State
    const [productQuery, setProductQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Product[]>([]);
    const [searchingProducts, setSearchingProducts] = useState(false);
    const [selectedProductNames, setSelectedProductNames] = useState<{ [key: string]: string }>({}); // Cache names for display

    const [formData, setFormData] = useState<CommissionRule>({
        name: '',
        type: CommissionType.PERCENTAGE,
        value: 0,
        minOrderAmount: 0,
        allowedLevels: [],
        roleApplicable: [],
        productIds: [],
        isActive: true,
        priority: 0
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const response = await api.get('/commission-rules');
            setRules(response.data);
            // Fetch product names for existing IDs if needed (optional optimization)
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const searchProducts = async () => {
        if (!productQuery) return;
        setSearchingProducts(true);
        try {
            const response = await api.get('/products', { params: { search: productQuery, limit: 5 } });
            setSearchResults(response.data.items || response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setSearchingProducts(false);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            type: CommissionType.PERCENTAGE,
            value: 0,
            minOrderAmount: 0,
            allowedLevels: [],
            roleApplicable: [],
            productIds: [],
            isActive: true,
            priority: 0
        });
        setProductQuery('');
        setSearchResults([]);
        setIsEditing(false);
        setSelectedRuleId(null);
    };

    const openCreateModal = () => {
        resetForm();
        setModalVisible(true);
    };

    const handleEdit = (rule: CommissionRule) => {
        setFormData({
            ...rule,
            allowedLevels: rule.allowedLevels || [],
            roleApplicable: rule.roleApplicable || [],
            productIds: rule.productIds || [],
            minOrderAmount: rule.minOrderAmount || 0,
            value: rule.value || 0,
        });
        setSelectedRuleId(rule.id || null);
        setIsEditing(true);
        setModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        Alert.alert(
            'Delete Rule',
            'Are you sure you want to delete this rule?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await api.delete(`/commission-rules/${id}`);
                            fetchRules();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete rule');
                        }
                    }
                }
            ]
        );
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            Alert.alert('Error', 'Rule Name is required');
            return;
        }

        setSaveLoading(true);
        try {
            const payload = {
                ...formData,
                value: Number(formData.value),
                minOrderAmount: Number(formData.minOrderAmount),
                priority: Number(formData.priority || 0),
                maxCommission: formData.maxCommission ? Number(formData.maxCommission) : undefined,
            };

            if (isEditing && selectedRuleId) {
                await api.patch(`/commission-rules/${selectedRuleId}`, payload);
                Alert.alert('Success', 'Rule updated successfully');
            } else {
                await api.post('/commission-rules', payload);
                Alert.alert('Success', 'Rule created successfully');
            }
            setModalVisible(false);
            fetchRules();
        } catch (error: any) {
            console.error(error);
            Alert.alert('Error', 'Failed to save rule: ' + (error.response?.data?.message || 'Unknown error'));
        } finally {
            setSaveLoading(false);
        }
    };

    const toggleLevel = (level: Level) => {
        const current = formData.allowedLevels || [];
        if (current.includes(level)) {
            setFormData({ ...formData, allowedLevels: current.filter(l => l !== level) });
        } else {
            setFormData({ ...formData, allowedLevels: [...current, level] });
        }
    };

    const toggleRole = (role: UserRole) => {
        const current = formData.roleApplicable || [];
        if (current.includes(role)) {
            setFormData({ ...formData, roleApplicable: current.filter(r => r !== role) });
        } else {
            setFormData({ ...formData, roleApplicable: [...current, role] });
        }
    };

    const addProduct = (product: Product) => {
        const current = formData.productIds || [];
        if (!current.includes(product.id)) {
            setFormData({ ...formData, productIds: [...current, product.id] });
            setSelectedProductNames({ ...selectedProductNames, [product.id]: product.title });
        }
        setProductQuery('');
        setSearchResults([]);
    };

    const removeProduct = (id: string) => {
        setFormData({ ...formData, productIds: (formData.productIds || []).filter(pid => pid !== id) });
    };

    return (
        <AdminPageLayout>
            <View style={styles.header}>
                <View>
                    <Text variant="headlineMedium" style={{ fontWeight: 'bold', color: Colors.text }}>Commission Rules</Text>
                    <Text variant="bodyMedium" style={{ color: Colors.textSecondary }}>Manage stylist commission structures</Text>
                </View>
                <Button mode="contained" onPress={openCreateModal} icon="plus" style={styles.addButton}>
                    Create Rule
                </Button>
            </View>

            <Card mode="elevated" elevation={1} style={styles.tableCard}>
                {loading ? (
                    <ActivityIndicator size="large" style={{ margin: 50 }} />
                ) : (
                    <DataTable>
                        <DataTable.Header style={styles.tableHeader}>
                            <DataTable.Title style={{ flex: 2 }} textStyle={styles.tableTitle}>Rule Name</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Type</DataTable.Title>
                            <DataTable.Title numeric textStyle={styles.tableTitle}>Value</DataTable.Title>
                            <DataTable.Title style={{ flex: 2 }} textStyle={styles.tableTitle}>Applicability</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Status</DataTable.Title>
                            <DataTable.Title textStyle={styles.tableTitle}>Actions</DataTable.Title>
                        </DataTable.Header>

                        {rules.map((item) => (
                            <DataTable.Row key={item.id} style={styles.tableRow}>
                                <DataTable.Cell style={{ flex: 2 }}>
                                    <View>
                                        <Text style={{ fontWeight: '500' }}>{item.name}</Text>
                                        {item.priority && item.priority > 0 && <Text variant="labelSmall" style={{ color: Colors.primary }}>Priority: {item.priority}</Text>}
                                    </View>
                                </DataTable.Cell>
                                <DataTable.Cell>{item.type.toUpperCase()}</DataTable.Cell>
                                <DataTable.Cell numeric>
                                    {item.type === CommissionType.PERCENTAGE ? `${item.value}%` : `₹${item.value}`}
                                </DataTable.Cell>
                                <DataTable.Cell style={{ flex: 2 }}>
                                    <View>
                                        {item.allowedLevels && item.allowedLevels.length > 0 && (
                                            <Text variant="bodySmall" numberOfLines={1}>Levels: {item.allowedLevels.join(', ')}</Text>
                                        )}
                                        {item.roleApplicable && item.roleApplicable.length > 0 && (
                                            <Text variant="bodySmall" numberOfLines={1}>Roles: {item.roleApplicable.join(', ')}</Text>
                                        )}
                                        {item.productIds && item.productIds.length > 0 && (
                                            <Text variant="bodySmall" numberOfLines={1}>Products: {item.productIds.length} selected</Text>
                                        )}
                                        {!item.allowedLevels?.length && !item.roleApplicable?.length && !item.productIds?.length && (
                                            <Text variant="bodySmall" style={{ color: Colors.textSecondary }}>Global</Text>
                                        )}
                                    </View>
                                </DataTable.Cell>
                                <DataTable.Cell>
                                    <Chip icon={item.isActive ? 'check' : 'close'} compact style={{ backgroundColor: item.isActive ? '#E8F5E9' : '#FFEBEE' }} textStyle={{ color: item.isActive ? 'green' : 'red' }}>
                                        {item.isActive ? 'Active' : 'Inactive'}
                                    </Chip>
                                </DataTable.Cell>
                                <DataTable.Cell>
                                    <View style={{ flexDirection: 'row' }}>
                                        <IconButton icon="pencil" size={20} onPress={() => handleEdit(item)} />
                                        <IconButton icon="delete" size={20} iconColor={Colors.error} onPress={() => item.id && handleDelete(item.id)} />
                                    </View>
                                </DataTable.Cell>
                            </DataTable.Row>
                        ))}
                    </DataTable>
                )}
            </Card>

            <Portal>
                <Modal visible={modalVisible} onDismiss={() => setModalVisible(false)} contentContainerStyle={styles.modal}>
                    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                        <Text variant="titleLarge" style={{ marginBottom: 20, fontWeight: 'bold' }}>
                            {isEditing ? 'Edit Commission Rule' : 'Create New Rule'}
                        </Text>

                        <TextInput
                            label="Rule Name *"
                            value={formData.name}
                            onChangeText={(t) => setFormData({ ...formData, name: t })}
                            style={styles.input}
                            mode="outlined"
                        />

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8, borderWidth: 1, borderColor: Colors.border, borderRadius: 4, height: 50, justifyContent: 'center' }}>
                                <Picker
                                    selectedValue={formData.type}
                                    onValueChange={(itemValue) => setFormData({ ...formData, type: itemValue })}
                                    style={{ height: 50, width: '100%' }}
                                >
                                    <Picker.Item label="Percentage (%)" value={CommissionType.PERCENTAGE} />
                                    <Picker.Item label="Fixed Amount (₹)" value={CommissionType.FIXED} />
                                    <Picker.Item label="Tiered" value={CommissionType.TIERED} />
                                </Picker>
                            </View>
                            <TextInput
                                label="Value *"
                                value={String(formData.value)}
                                onChangeText={(t) => setFormData({ ...formData, value: Number(t) })}
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                mode="outlined"
                                right={<TextInput.Affix text={formData.type === CommissionType.PERCENTAGE ? "%" : "₹"} />}
                            />
                        </View>

                        <View style={styles.row}>
                            <TextInput
                                label="Min Order Amount"
                                value={String(formData.minOrderAmount)}
                                onChangeText={(t) => setFormData({ ...formData, minOrderAmount: Number(t) })}
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                mode="outlined"
                                left={<TextInput.Affix text="₹" />}
                            />
                            <TextInput
                                label="Max Cap (Optional)"
                                value={formData.maxCommission ? String(formData.maxCommission) : ''}
                                onChangeText={(t) => setFormData({ ...formData, maxCommission: t ? Number(t) : undefined })}
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                mode="outlined"
                                left={<TextInput.Affix text="₹" />}
                            />
                        </View>

                        <Divider style={{ marginVertical: 10 }} />
                        <Text variant="titleMedium" style={styles.sectionTitle}>Applicability Filters</Text>

                        {/* Levels */}
                        <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Levels</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {Object.values(Level).map((level) => (
                                <Chip
                                    key={level}
                                    selected={formData.allowedLevels?.includes(level)}
                                    onPress={() => toggleLevel(level)}
                                    showSelectedOverlay
                                    style={{ backgroundColor: formData.allowedLevels?.includes(level) ? '#E3F2FD' : '#f0f0f0' }}
                                >
                                    {level.toUpperCase()}
                                </Chip>
                            ))}
                        </View>

                        {/* Roles */}
                        <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Roles</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {Object.values(UserRole).map((role) => (
                                <Chip
                                    key={role}
                                    selected={formData.roleApplicable?.includes(role)}
                                    onPress={() => toggleRole(role)}
                                    showSelectedOverlay
                                    style={{ backgroundColor: formData.roleApplicable?.includes(role) ? '#E3F2FD' : '#f0f0f0' }}
                                >
                                    {role.replace('_', ' ')}
                                </Chip>
                            ))}
                        </View>

                        {/* Products */}
                        <Text variant="bodyMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>Specific Products</Text>
                        <Searchbar
                            placeholder="Search products..."
                            onChangeText={setProductQuery}
                            value={productQuery}
                            onSubmitEditing={searchProducts}
                            loading={searchingProducts}
                            style={{ marginBottom: 8, backgroundColor: '#f5f5f5', elevation: 0, borderWidth: 1, borderColor: Colors.border }}
                        />
                        {searchResults.length > 0 && (
                            <View style={{ maxHeight: 150, borderWidth: 1, borderColor: Colors.border, borderRadius: 4, marginBottom: 8 }}>
                                <FlatList
                                    data={searchResults}
                                    keyExtractor={item => item.id}
                                    renderItem={({ item }) => (
                                        <Button
                                            mode="text"
                                            onPress={() => addProduct(item)}
                                            contentStyle={{ justifyContent: 'flex-start' }}
                                        >
                                            {item.title}
                                        </Button>
                                    )}
                                />
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {formData.productIds?.map(id => (
                                <Chip key={id} onClose={() => removeProduct(id)}>
                                    {selectedProductNames[id] || id.slice(0, 8) + '...'}
                                </Chip>
                            ))}
                            {formData.productIds?.length === 0 && (
                                <Text variant="bodySmall" style={{ color: Colors.textSecondary, fontStyle: 'italic' }}>No specific products selected.</Text>
                            )}
                        </View>


                        <Text variant="titleMedium" style={styles.sectionTitle}>Settings</Text>
                        <View style={styles.row}>
                            <TextInput
                                label="Priority"
                                value={String(formData.priority)}
                                onChangeText={(t) => setFormData({ ...formData, priority: Number(t) })}
                                keyboardType="numeric"
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                mode="outlined"
                            />
                            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                                <Text>Active Logic:</Text>
                                <Button
                                    mode={formData.isActive ? 'contained' : 'outlined'}
                                    onPress={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    style={{ marginLeft: 8 }}
                                    compact
                                >
                                    {formData.isActive ? 'Active' : 'Inactive'}
                                </Button>
                            </View>
                        </View>

                        <View style={styles.modalActions}>
                            <Button onPress={() => setModalVisible(false)} style={{ marginRight: 10 }}>Cancel</Button>
                            <Button mode="contained" onPress={handleSubmit} loading={saveLoading}>
                                {isEditing ? 'Update Rule' : 'Create Rule'}
                            </Button>
                        </View>
                    </ScrollView>
                </Modal>
            </Portal>
        </AdminPageLayout>
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
        marginBottom: 4,
        alignItems: 'center'
    },
    sectionTitle: {
        marginTop: 16,
        marginBottom: 8,
        color: Colors.primary,
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 24,
    }
});
