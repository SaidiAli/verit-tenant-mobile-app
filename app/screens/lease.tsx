import { BRAND_COLOR } from '@/constants/theme';
import { useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { tenantApi, API_BASE_URL } from '../../lib/api';
import { secureStorage } from '../../lib/storage';
import { useLease } from '../../hooks/LeaseContext';
import { LeaseSwitcher } from '../../components/ui/LeaseSwitcher';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { File, Paths } from 'expo-file-system';

export default function LeaseScreen() {
  const { selectedLeaseId } = useLease();
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch detailed lease information via dashboard API
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['tenant-dashboard', selectedLeaseId],
    queryFn: () => tenantApi.getDashboard(selectedLeaseId || undefined),
  });

  const handleCallLandlord = async (phoneNumber: string) => {
    try {
      const phoneUrl = `tel:${phoneNumber}`;
      const canCall = await Linking.canOpenURL(phoneUrl);

      if (canCall) {
        await Linking.openURL(phoneUrl);
      } else {
        Alert.alert('Error', 'Unable to make phone calls on this device');
      }
    } catch {
      Alert.alert('Error', 'Failed to initiate phone call');
    }
  };

  const handleDownloadStatement = async () => {
    if (!selectedLeaseId) return;
    setIsDownloading(true);
    try {
      const token = await secureStorage.getToken();
      const result = await File.downloadFileAsync(
        `${API_BASE_URL}/exports/leases/${selectedLeaseId}/my-statement.pdf`,
        new File(Paths.cache, `vrt-${Date.now()}-${selectedLeaseId.split('-')[0]}.pdf`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Lease Statement',
      });
    } catch {
      Alert.alert('Error', 'Failed to download statement');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEmailLandlord = async (email: string) => {
    try {
      const emailUrl = `mailto:${email}`;
      const canEmail = await Linking.canOpenURL(emailUrl);

      if (canEmail) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert('Error', 'No email app available on this device');
      }
    } catch {
      Alert.alert('Error', 'Failed to open email app');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <LoadingSpinner size="large" />
        <Text className="text-gray-600 mt-4">Loading lease information...</Text>
      </View>
    );
  }

  if (error || !dashboardData || !dashboardData.lease) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-4">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">
          Unable to Load Lease Information
        </Text>
        <Text className="text-gray-600 mt-2 text-center">
          {error ? 'Failed to fetch lease data. Please try again later.' : 'No active lease information found. Contact your landlord if this seems incorrect.'}
        </Text>
      </View>
    );
  }

  const { lease, unit, property, landlord, quickStats } = dashboardData;

  const endDate = lease.endDate ? new Date(lease.endDate) : null;
  const currentDate = new Date();
  const daysUntilExpiry = endDate ? Math.ceil(
    (endDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
  ) : 999;

  // Handle invalid dates
  const isValidEndDate = endDate && !isNaN(endDate.getTime());
  const isValidStartDate = !isNaN(new Date(lease.startDate).getTime());

  return (
    <SafeAreaWrapper>
      <View className="flex-1 bg-gray-50">
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-6 pb-4">
            {/* Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-semibold text-gray-800">
                Lease Information
              </Text>
              <LeaseSwitcher />
            </View>

            {/* Lease Status Card */}
            <Card className="mb-4">
              <View className="space-y-3">
                <View className="flex-row justify-between items-center">
                  <Text className="text-lg font-semibold text-gray-800">
                    Lease Status
                  </Text>
                  <StatusBadge status={lease.status === 'active' ? 'success' : lease.status === 'expired' ? 'error' : 'warning'} text={lease.status.charAt(0).toUpperCase() + lease.status.slice(1)} />
                </View>

                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Lease Period:</Text>
                    <Text className="font-medium text-gray-800">
                      {isValidStartDate
                        ? `${new Date(lease.startDate).toLocaleDateString()} - ${isValidEndDate ? endDate!.toLocaleDateString() : 'Ongoing'}`
                        : 'Date information unavailable'
                      }
                    </Text>
                  </View>
                  {isValidEndDate && (
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Days Remaining:</Text>
                      <Text className={`font-bold ${daysUntilExpiry < 60 ? 'text-yellow-600' : daysUntilExpiry < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry} days`}
                      </Text>
                    </View>
                  )}
                  {quickStats && (
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Progress:</Text>
                      <Text className="font-medium text-gray-800">
                        {Math.round(quickStats.leaseProgress)}% completed
                      </Text>
                    </View>
                  )}
                </View>

                {isValidEndDate && daysUntilExpiry < 60 && daysUntilExpiry > 0 && (
                  <View className="bg-yellow-50 p-3 rounded-md mt-2">
                    <Text className="text-yellow-700 text-sm font-medium">
                      Your lease expires soon. Contact your landlord about renewal options.
                    </Text>
                  </View>
                )}
                {isValidEndDate && daysUntilExpiry < 0 && (
                  <View className="bg-red-50 p-3 rounded-md mt-2">
                    <Text className="text-red-700 text-sm font-medium">
                      Your lease has expired. Please contact your landlord immediately.
                    </Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Property Information */}
            {property && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <Text className="text-lg font-semibold text-gray-800">
                    Property Information
                  </Text>

                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Property:</Text>
                      <Text className="font-medium text-gray-800 text-right flex-1 ml-2">
                        {property.name}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Address:</Text>
                      <Text className="font-medium text-gray-800 text-right flex-1 ml-2">
                        {property.address}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">City, State:</Text>
                      <Text className="font-medium text-gray-800">
                        {property.city}, {property.state} {property.postalCode || ''}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            )}

            {/* Unit Details */}
            {unit && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <Text className="text-lg font-semibold text-gray-800">
                    Unit Details
                  </Text>

                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Unit Number:</Text>
                      <Text className="font-medium text-gray-800">
                        {unit.unitNumber}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Bedrooms:</Text>
                      <Text className="font-medium text-gray-800">
                        {unit.bedrooms}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Bathrooms:</Text>
                      <Text className="font-medium text-gray-800">
                        {unit.bathrooms}
                      </Text>
                    </View>
                    {unit.squareFeet && (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Square Feet:</Text>
                        <Text className="font-medium text-gray-800">
                          {unit.squareFeet} sq ft
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </Card>
            )}

            {/* Financial Terms */}
            <Card className="mb-4">
              <View className="space-y-3">
                <Text className="text-lg font-semibold text-gray-800">
                  Financial Terms
                </Text>

                <View className="space-y-2">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Monthly Rent:</Text>
                    <Text className="text-lg font-bold text-brand">
                      UGX {lease.monthlyRent.toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Security Deposit:</Text>
                    <Text className="font-medium text-gray-800">
                      UGX {lease.deposit.toLocaleString()}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>

            {/* Landlord Contact */}
            {landlord && (
              <Card className="mb-4">
                <View className="space-y-3">
                  <Text className="text-lg font-semibold text-gray-800">
                    Landlord Contact
                  </Text>

                  <View className="space-y-3">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Name:</Text>
                      <Text className="font-medium text-gray-800">
                        {landlord.name}
                      </Text>
                    </View>

                    {landlord.email && (
                      <TouchableOpacity
                        className="flex-row justify-between items-center py-2 px-2 rounded-md active:bg-gray-100 -ml-2"
                        onPress={() => handleEmailLandlord(landlord.email!)}
                      >
                        <Text className="text-gray-600">Email:</Text>
                        <View className="flex-row items-center space-x-2">
                          <Text className="font-medium text-brand">
                            {landlord.email}
                          </Text>
                          <MaterialIcons name="email" size={16} color={BRAND_COLOR} />
                        </View>
                      </TouchableOpacity>
                    )}

                    {landlord.phone && (
                      <TouchableOpacity
                        className="flex-row justify-between items-center py-2 px-2 rounded-md active:bg-gray-100 -ml-2"
                        onPress={() => handleCallLandlord(landlord.phone!)}
                      >
                        <Text className="text-gray-600">Phone:</Text>
                        <View className="flex-row items-center gap-2">
                          <MaterialIcons name="phone" size={16} color={BRAND_COLOR} />
                          <Text className="font-medium text-brand">
                            {landlord.phone}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </Card>
            )}

            {/* Documents */}
            <Card className="mb-6">
              <View className="">
                <Text className="text-lg font-semibold text-gray-800">
                  Lease Documents
                </Text>

                <Text className="text-gray-600 text-sm">
                  Download your full payment statement as a PDF.
                </Text>

                <TouchableOpacity
                  onPress={handleDownloadStatement}
                  disabled={isDownloading}
                  className="bg-brand py-3 mt-4 rounded-md items-center flex-row justify-center"
                >
                  <MaterialIcons name="file-download" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    {isDownloading ? 'Downloading...' : 'Download Statement'}
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>
        </ScrollView >
      </View >
    </SafeAreaWrapper>
  );
}