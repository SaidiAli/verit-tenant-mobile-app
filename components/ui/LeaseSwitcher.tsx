import { BRAND_COLOR } from '@/constants/theme';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { useLease } from '../../hooks/LeaseContext';
import { StatusBadge } from './StatusBadge';

export function LeaseSwitcher() {
    const { allLeases, selectedLease, switchLease } = useLease();
    const [modalVisible, setModalVisible] = useState(false);

    // If there's only one lease or no leases, don't show the switcher
    if (allLeases.length <= 1) {
        return null;
    }

    const handleSelectLease = (leaseId: string) => {
        switchLease(leaseId);
        setModalVisible(false);
    };

    return (
        <>
            <TouchableOpacity
                onPress={() => setModalVisible(true)}
                className="flex-row items-center bg-white px-3 py-1.5 rounded-full space-x-2 border border-gray-200 shadow-sm"
                style={{ alignSelf: 'flex-start' }}
            >
                <View>
                    <Text className="text-gray-800 text-xs font-medium">
                        {selectedLease?.propertyName || 'Unknown Property'}
                    </Text>
                    <Text className="text-gray-500 text-[10px]">
                        Unit {selectedLease?.unitNumber}
                    </Text>
                </View>
                <MaterialIcons name="arrow-drop-down" size={20} color="#4B5563" />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/50 justify-end"
                    activeOpacity={1}
                    onPress={() => setModalVisible(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        className="bg-white rounded-t-3xl p-5 max-h-[70%]"
                    >
                        <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-xl font-bold text-gray-800">Select Lease</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <MaterialIcons name="close" size={24} color="#6B7280" />
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={allLeases}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    onPress={() => handleSelectLease(item.id)}
                                    className={`p-4 rounded-xl mb-3 border ${selectedLease?.id === item.id
                                        ? 'border-brand bg-brand/5'
                                        : 'border-gray-200'
                                        }`}
                                >
                                    <View className="flex-row justify-between items-start">
                                        <View>
                                            <Text className="font-semibold text-gray-800 text-lg">
                                                {item.propertyName || 'Unknown Property'}
                                            </Text>
                                            <Text className="text-gray-600 mt-1">
                                                Unit {item.unitNumber}
                                            </Text>
                                            <View className="flex-row items-center mt-2 space-x-2">
                                                <Text className="text-xs text-gray-500">
                                                    {new Date(item.startDate).toLocaleDateString()} - {item.endDate ? new Date(item.endDate).toLocaleDateString() : 'Ongoing'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View className="items-end">
                                            <StatusBadge status={item.status === 'active' ? 'success' : 'info'} text={item.status} />
                                            {selectedLease?.id === item.id && (
                                                <View className="mt-2">
                                                    <MaterialIcons name="check-circle" size={20} color={BRAND_COLOR} />
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            )}
                        />
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal >
        </>
    );
}
