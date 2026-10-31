import { session } from '../../lib/session';
import { ErrorView } from '../../components/ui/ErrorView';
import { useAuth } from '../../hooks/useAuth';
import { tenantKeys } from '../../lib/queryKeys';
import { BRAND_COLOR } from '@/constants/theme';
import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Linking, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { useQuery } from '@tanstack/react-query';
import { tenantApi, API_BASE_URL } from '../../lib/api';
import { secureStorage } from '../../lib/storage';
import { useLease } from '../../hooks/LeaseContext';
import { LeaseSwitcher } from '../../components/ui/LeaseSwitcher';
import { SafeAreaWrapper } from '../../components/ui/SafeAreaWrapper';
import { FinWiseScreen } from '../../components/ui/FinWiseScreen';
import { File, Paths } from 'expo-file-system';
import { SECURITY_DEPOSIT_LABELS } from '../../lib/paymentCheckout';
import { formatMoney } from '../../lib/currency';

export default function LeaseScreen() {
  const { user } = useAuth();
  const { selectedLeaseId, isLoadingLeases } = useLease();
  const router = useRouter();
  const [isDownloading, setIsDownloading] = useState(false);
  const generation = useRef(session.current()).current;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = () => mounted.current && session.isCurrent(generation);

  // Fetch detailed lease information via dashboard API
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: tenantKeys.query(user?.id, 'tenant-dashboard', selectedLeaseId),
    queryFn: ({ signal }) => tenantApi.getDashboard(selectedLeaseId!, signal),
    enabled: !!user && !!selectedLeaseId,
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
      if (!active()) return;
      const result = await File.downloadFileAsync(
        `${API_BASE_URL}/exports/leases/${selectedLeaseId}/my-statement.pdf`,
        new File(Paths.cache, `vrt-${Date.now()}-${selectedLeaseId.split('-')[0]}.pdf`),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!active()) { result.delete(); return; }
      await Sharing.shareAsync(result.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Lease Statement',
      });
    } catch {
      if (active()) Alert.alert('Error', 'Failed to download statement');
    } finally {
      if (active()) setIsDownloading(false);
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

  if (!selectedLeaseId && !isLoadingLeases) return <ErrorView title="No lease selected" message="Select a lease or contact your property manager." />;

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand justify-center items-center">
        <LoadingSpinner size="large" className="bg-transparent" />
        <Text className="text-white/70 mt-2">Loading lease information...</Text>
      </View>
    );
  }

  if (error || !dashboardData || !dashboardData.lease) {
    return (
      <View className="flex-1 bg-brand justify-center items-center px-9">
        <MaterialIcons name="error-outline" size={48} color="#EF4444" />
        <Text className="text-[20px] font-semibold text-white mt-4 text-center">
          Unable to Load Lease Information
        </Text>
        <Text className="text-[14px] text-white/70 mt-2 text-center">
          {error ? 'Failed to fetch lease data. Please try again later.' : 'No active lease information found. Contact your landlord if this seems incorrect.'}
        </Text>
      </View>
    );
  }

  const { lease, unit, property, landlord, quickStats, management } = dashboardData;

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
      <FinWiseScreen
        title="Lease Information"
        onBack={() => router.back()}
        header={
          <View className="flex-row items-center justify-end mt-4">
            <LeaseSwitcher />
          </View>
        }
        headerClassName="px-9 pt-6 pb-8"
      >
        <View className="space-y-9">
          {/* Lease Status */}
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[15px] font-medium text-finance-fence">
                Lease Status
              </Text>
              <StatusBadge
                status={lease.status === 'active' ? 'success' : lease.status === 'expired' ? 'error' : 'warning'}
                text={lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                dot
              />
            </View>
            <DetailRow
              label="Lease Period"
              value={
                isValidStartDate
                  ? `${new Date(lease.startDate).toLocaleDateString()} - ${isValidEndDate ? endDate!.toLocaleDateString() : 'Ongoing'}`
                  : 'Date information unavailable'
              }
            />
            {isValidEndDate && (
              <DetailRow
                label="Days Remaining"
                value={
                  daysUntilExpiry < 0
                    ? 'Expired'
                    : `${daysUntilExpiry} days`
                }
                valueClass={
                  daysUntilExpiry < 60
                    ? 'text-amber-600 font-semibold'
                    : daysUntilExpiry < 0
                      ? 'text-rose-600 font-semibold'
                      : 'text-finance font-semibold'
                }
              />
            )}
            {quickStats && (
              <DetailRow
                label="Progress"
                value={`${Math.round(quickStats.leaseProgress)}% completed`}
              />
            )}

            {isValidEndDate && daysUntilExpiry < 60 && daysUntilExpiry > 0 && (
              <View className="bg-amber-50 p-4 rounded-[18px] mt-3">
                <Text className="text-amber-800 text-[13px] font-medium leading-relaxed">
                  Your lease expires soon. Contact your landlord about renewal options.
                </Text>
              </View>
            )}
            {isValidEndDate && daysUntilExpiry < 0 && (
              <View className="bg-rose-50 p-4 rounded-[18px] mt-3">
                <Text className="text-rose-700 text-[13px] font-medium leading-relaxed">
                  Your lease has expired. Please contact your landlord immediately.
                </Text>
              </View>
            )}
          </View>

          {/* Contracting parties */}
          {management && (
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-1">
                Contracting Parties
              </Text>
              <DetailRow label="Legal owner" value={management.ownerLegalName} />
              <DetailRow label="Property manager" value={management.managingDisplayName} />
              {management.payeeDisplayName && (
                <DetailRow label="Mobile-money recipient" value={management.payeeDisplayName} />
              )}
            </View>
          )}

          {/* Property Information */}
          {property && (
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-1">
                Property Information
              </Text>
              <DetailRow label="Property" value={property.name} />
              <DetailRow label="Address" value={property.address} />
              <DetailRow
                label="City, State"
                value={`${property.city}, ${property.state} ${property.postalCode || ''}`}
              />
            </View>
          )}

          {/* Unit Details */}
          {unit && (
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-1">
                Unit Details
              </Text>
              <DetailRow label="Unit Number" value={unit.unitNumber} />
              <DetailRow label="Bedrooms" value={String(unit.bedrooms)} />
              <DetailRow label="Bathrooms" value={String(unit.bathrooms)} />
              {unit.squareFeet && (
                <DetailRow label="Square Feet" value={`${unit.squareFeet} sq ft`} />
              )}
            </View>
          )}

          {/* Financial Terms */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-1">
              Financial Terms
            </Text>
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-[13px] text-gray-500">Monthly Rent</Text>
              <Text className="text-[24px] font-bold text-brand">
                {formatMoney(lease.monthlyRent, lease.currency)}
              </Text>
            </View>
            <DetailRow label="Advance rent" value={formatMoney(lease.deposit, lease.depositCurrency)} />
            <View className="mt-3 bg-brand-light/60 rounded-[18px] p-4">
              <Text className="text-[13px] font-medium text-finance-fence">
                Refundable security deposit
              </Text>
              <Text className="text-[12px] text-gray-500 mt-0.5">
                {SECURITY_DEPOSIT_LABELS[lease.securityDepositStatus]}
              </Text>
              {lease.securityDeposit !== null && lease.securityDepositCurrency && (
                <Text className="text-[15px] font-semibold text-finance-fence mt-1">
                  {formatMoney(lease.securityDeposit, lease.securityDepositCurrency)}
                </Text>
              )}
              <Text className="text-[11px] text-gray-400 mt-1.5">
                Held separately from advance rent and rent payments.
              </Text>
            </View>
          </View>

          {/* Landlord Contact */}
          {landlord && (
            <View>
              <Text className="text-[15px] font-medium text-finance-fence mb-1">
                Landlord Contact
              </Text>
              <DetailRow label="Name" value={landlord.name} />

              {landlord.email && (
                <TouchableOpacity
                  className="flex-row justify-between items-center py-2"
                  onPress={() => handleEmailLandlord(landlord.email!)}
                >
                  <Text className="text-[13px] text-gray-500">Email</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[13px] font-medium text-brand">
                      {landlord.email}
                    </Text>
                    <MaterialIcons name="email" size={16} color={BRAND_COLOR} />
                  </View>
                </TouchableOpacity>
              )}

              {landlord.phone && (
                <TouchableOpacity
                  className="flex-row justify-between items-center py-2"
                  onPress={() => handleCallLandlord(landlord.phone!)}
                >
                  <Text className="text-[13px] text-gray-500">Phone</Text>
                  <View className="flex-row items-center gap-2">
                    <MaterialIcons name="phone" size={16} color={BRAND_COLOR} />
                    <Text className="text-[13px] font-medium text-brand">
                      {landlord.phone}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Documents */}
          <View>
            <Text className="text-[15px] font-medium text-finance-fence mb-1">
              Lease Documents
            </Text>
            <Text className="text-[13px] text-gray-500 mb-3">
              Download your full payment statement as a PDF.
            </Text>

            <TouchableOpacity
              onPress={handleDownloadStatement}
              disabled={isDownloading}
              className={`h-[45px] rounded-[30px] items-center justify-center flex-row gap-2 ${
                isDownloading ? 'bg-brand-light' : 'bg-finance'
              }`}
            >
              <MaterialIcons name="file-download" size={20} color={isDownloading ? '#9CA3AF' : '#052224'} />
              <Text
                className={`font-semibold text-[15px] ${
                  isDownloading ? 'text-gray-400' : 'text-finance-fence'
                }`}
              >
                {isDownloading ? 'Downloading...' : 'Download Statement'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </FinWiseScreen>
    </SafeAreaWrapper>
  );
}

function DetailRow({
  label,
  value,
  valueClass = 'text-finance-fence',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="text-[13px] text-gray-500">{label}</Text>
      <Text className={`text-[13px] font-medium text-right flex-1 ml-3 ${valueClass}`}>
        {value}
      </Text>
    </View>
  );
}
