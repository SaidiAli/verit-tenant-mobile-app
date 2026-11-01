import { session } from '../../lib/session';
import { useAuth } from '../../hooks/useAuth';
import { tenantKeys } from '../../lib/queryKeys';
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Share,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND_COLOR } from "../../constants/theme";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "./LoadingSpinner";
import { paymentApi, API_BASE_URL } from "../../lib/api";
import { secureStorage } from "../../lib/storage";
import { formatMoney } from "../../lib/currency";
import { File, Paths } from "expo-file-system";
import { formatDateShort, formatSchedulePeriod } from "@/lib/utils";
import { PAYMENT_TYPE_LABELS } from "../../types";

interface PaymentReceiptModalProps {
  visible: boolean;
  onClose: () => void;
  paymentId: string;
}

export function PaymentReceiptModal({
  visible,
  onClose,
  paymentId,
}: PaymentReceiptModalProps) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isDownloading, setIsDownloading] = useState(false);
  const generation = useRef(session.current()).current;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const active = () => mounted.current && session.isCurrent(generation);

  const {
    data: receipt,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: tenantKeys.query(user?.id, 'payment-receipt', paymentId),
    queryFn: ({ signal }) => paymentApi.getReceipt(paymentId, signal),
    enabled: visible && !!paymentId,
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const token = await secureStorage.getToken();
      if (!active()) return;
      const result = await File.downloadFileAsync(
        `${API_BASE_URL}/exports/payments/${paymentId}/my-receipt.pdf`,
        new File(
          Paths.cache,
          `vrt-${Date.now()}-${paymentId.split("-")[0]}.pdf`,
        ),
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!active()) { result.delete(); return; }
      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Receipt PDF",
      });
    } catch {
      if (active()) Alert.alert("Error", "Failed to download receipt PDF");
    } finally {
      if (active()) setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!receipt) return;

    const receiptText = `
Verit - Payment Receipt

Receipt #: ${receipt.receiptNumber}
Amount: ${formatMoney(receipt.amount, receipt.currency)}
Payment Type: ${PAYMENT_TYPE_LABELS[receipt.paymentType ?? "rent"]}
Payment Method: ${receipt.paymentMethod}
Periods: ${receipt.appliedSchedules?.length ? receipt.appliedSchedules.map((s) => `#${s.paymentNumber} ${formatSchedulePeriod(s.period)}`).join(", ") : receipt.periodCovered || (receipt.dueDate ? formatDateShort(receipt.dueDate) : "N/A")}
Date: ${formatDateShort(receipt.paidDate)}
Transaction ID: ${receipt.transactionId}

Tenant: ${receipt.tenant?.name}
Phone: ${receipt.tenant?.phone}

Generated: ${formatDateShort(receipt.generatedAt)}

Thank you for your payment!
    `.trim();

    try {
      await Share.share({
        message: receiptText,
        title: "Payment Receipt",
      });
    } catch {
      Alert.alert("Error", "Failed to share receipt");
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end" style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}>
        {/* Backdrop — tap to dismiss */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Bottom sheet */}
        <View
          className="bg-white rounded-t-[40px] px-9 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 20), maxHeight: "92%" }}
        >
          {/* Drag handle */}
          <View className="w-12 h-1.5 rounded-full bg-gray-200 self-center mt-3" />

          {/* Header */}
          <View className="flex-row items-center justify-between mt-4 mb-5">
            <TouchableOpacity
              onPress={onClose}
              className="w-[30px] h-[30px] rounded-full bg-brand-light items-center justify-center"
            >
              <MaterialIcons name="close" size={18} color={BRAND_COLOR} />
            </TouchableOpacity>
            <Text className="text-[20px] leading-[22px] font-semibold text-finance-fence">
              Payment Receipt
            </Text>
            {receipt ? (
              <TouchableOpacity
                onPress={handleShare}
                className="w-[30px] h-[30px] rounded-full bg-brand-light items-center justify-center"
              >
                <MaterialIcons name="share" size={16} color={BRAND_COLOR} />
              </TouchableOpacity>
            ) : (
              <View className="w-[30px]" />
            )}
          </View>

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false}>
          {isLoading && <LoadingSpinner message="Loading receipt..." />}

          {!!error && (
            <View className="items-center py-8">
              <MaterialIcons name="error" size={48} color="#EF4444" />
              <Text className="text-[15px] font-medium text-finance-fence mt-4">
                Unable to Load Receipt
              </Text>
              <Text className="text-gray-500 text-[13px] mt-2 text-center">
                {(error as any).message || "Failed to load receipt"}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                className="h-[45px] px-8 rounded-[30px] bg-finance items-center justify-center mt-4"
              >
                <Text className="text-finance-fence font-semibold text-[15px]">Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {receipt && (
            <View className="mb-6">
              <View className="gap-6">
                {/* Company Header */}
                <View className="items-center py-4 border-b border-gray-200">
                  <Text className="text-2xl font-bold text-brand">
                    {receipt.companyInfo.name}
                  </Text>
                  <Text className="text-gray-600">
                    {receipt.companyInfo.address}
                  </Text>
                  <Text className="text-gray-600">
                    {receipt.companyInfo.phone}
                  </Text>
                </View>

                {/* Receipt Details */}
                <View className="gap-4">
                  <View className="items-center">
                    <Text className="text-xl font-bold text-gray-800">
                      PAYMENT RECEIPT
                    </Text>
                    <Text className="text-lg font-semibold text-brand mt-1">
                      ID: {receipt.transactionId}
                    </Text>
                  </View>

                  {/* Payment Information */}
                  <View className="gap-3 border-t border-b border-gray-200 py-4">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Amount Paid:</Text>
                      <Text className="font-bold text-lg text-gray-800">
                        {formatMoney(receipt.amount, receipt.currency)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Payment Method:</Text>
                      <Text className="font-medium text-gray-800">
                        {receipt.paymentMethod === "mobile_money"
                          ? "Mobile Money"
                          : receipt.paymentMethod}
                      </Text>
                    </View>

                    <View className="flex-row justify-between py-2 border-b border-gray-100">
                      <Text className="text-gray-500 text-sm">
                        Payment Type
                      </Text>
                      <Text className="text-gray-800 text-sm font-medium">
                        {PAYMENT_TYPE_LABELS[receipt.paymentType ?? "rent"]}
                      </Text>
                    </View>

                    {(receipt.paymentType ?? "rent") === "rent" &&
                    receipt.appliedSchedules &&
                    receipt.appliedSchedules.length > 0 ? (
                      <View className="gap-2">
                        <Text className="text-gray-600">Periods Cleared:</Text>
                        {receipt.appliedSchedules.map((schedule, index) => (
                          <View
                            key={index}
                            className="bg-gray-50 p-3 rounded-md flex-row justify-between items-center"
                          >
                            <View>
                              <Text className="font-medium text-gray-800">
                                Payment #{schedule.paymentNumber}
                              </Text>
                              <Text className="text-sm text-gray-500">
                                {formatSchedulePeriod(schedule.period)}
                              </Text>
                            </View>
                            <View className="items-end">
                              <Text className="font-medium text-gray-800">
                                {formatMoney(schedule.amountApplied, schedule.currency)}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                of {formatMoney(schedule.scheduledAmount, schedule.currency)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : receipt.periodCovered ? (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Period Covered:</Text>
                        <Text className="font-medium text-gray-800">
                          {receipt.periodCovered}
                        </Text>
                      </View>
                    ) : receipt.dueDate ? (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600">Payment Period:</Text>
                        <Text className="font-medium text-gray-800">
                          {formatDateShort(receipt.dueDate)}
                        </Text>
                      </View>
                    ) : null}

                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Payment Date:</Text>
                      <Text className="font-medium text-gray-800">
                        {formatDateShort(receipt.paidDate)}
                      </Text>
                    </View>
                  </View>

                  {/* Tenant Information */}
                  {receipt.tenant && (
                    <View className="gap-3">
                      <Text className="font-semibold text-gray-800">
                        Tenant Information
                      </Text>
                      <View className="bg-gray-50 p-3 rounded-md gap-2">
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Name:</Text>
                          <Text className="font-medium text-gray-800">
                            {receipt.tenant.name}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Email:</Text>
                          <Text className="text-gray-800">
                            {receipt.tenant.email}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Phone:</Text>
                          <Text className="text-gray-800">
                            {receipt.tenant.phone}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Lease Information */}
                  {receipt.lease && (
                    <View className="gap-3">
                      <Text className="font-semibold text-gray-800">
                        Lease Information
                      </Text>
                      <View className="bg-gray-50 p-3 rounded-md gap-2">
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Monthly Rent:</Text>
                          <Text className="font-medium text-gray-800">
                            {formatMoney(receipt.lease.monthlyRent, receipt.lease.currency)}
                          </Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Lease Period:</Text>
                          <Text className="text-gray-800">
                            {formatDateShort(receipt.lease.startDate)} -{" "}
                            {receipt.lease.endDate
                              ? formatDateShort(receipt.lease.endDate)
                              : "Ongoing"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Footer */}
                  <View className="items-center pt-4 border-t border-gray-200">
                    <Text className="text-xs text-gray-500 text-center">
                      Generated on {formatDateShort(receipt.generatedAt)}
                    </Text>
                    <Text className="text-xs text-gray-500 text-center mt-1">
                      Thank you for your payment!
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Actions */}
          {receipt && (
            <View className="flex-row gap-3 pt-4">
              <TouchableOpacity
                onPress={handleDownloadPdf}
                disabled={isDownloading}
                className={`flex-1 h-[45px] rounded-[30px] items-center flex-row justify-center gap-2 ${
                  isDownloading ? "bg-brand-light" : "bg-finance"
                }`}
              >
                <MaterialIcons name="file-download" size={18} color={isDownloading ? "#9CA3AF" : "#052224"} />
                <Text className={`font-semibold text-[15px] ${isDownloading ? "text-gray-400" : "text-finance-fence"}`}>
                  {isDownloading ? "Downloading..." : "Download PDF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                className="h-[45px] px-6 rounded-[30px] bg-brand-light items-center justify-center"
              >
                <Text className="text-finance-fence font-medium text-[15px]">Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
