import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
  Alert,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useQuery } from "@tanstack/react-query";
import { Card } from "./Card";
import { LoadingSpinner } from "./LoadingSpinner";
import { paymentApi, API_BASE_URL } from "../../lib/api";
import { secureStorage } from "../../lib/storage";
import { formatUGX } from "../../lib/currency";
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
  const [isDownloading, setIsDownloading] = useState(false);

  const {
    data: receipt,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["payment-receipt", paymentId],
    queryFn: () => paymentApi.getReceipt(paymentId),
    enabled: visible && !!paymentId,
  });

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    try {
      const token = await secureStorage.getToken();
      const result = await File.downloadFileAsync(
        `${API_BASE_URL}/exports/payments/${paymentId}/my-receipt.pdf`,
        new File(
          Paths.cache,
          `vrt-${Date.now()}-${paymentId.split("-")[0]}.pdf`,
        ),
        { headers: { Authorization: `Bearer ${token}` } },
      );

      await Sharing.shareAsync(result.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Share Receipt PDF",
      });
    } catch {
      Alert.alert("Error", "Failed to download receipt PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!receipt) return;

    const receiptText = `
Verit - Payment Receipt

Receipt #: ${receipt.receiptNumber}
Amount: ${formatUGX(receipt.amount)}
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
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-800">
              Payment Receipt
            </Text>
            {receipt && (
              <TouchableOpacity onPress={handleShare}>
                <MaterialIcons name="share" size={24} color="#6B7280" />
              </TouchableOpacity>
            )}
            {!receipt && <View className="w-6" />}
          </View>
        </View>

        {/* Content */}
        <ScrollView className="flex-1 px-4 pt-6">
          {isLoading && <LoadingSpinner message="Loading receipt..." />}

          {!!error && (
            <Card className="items-center py-8">
              <MaterialIcons name="error" size={48} color="#EF4444" />
              <Text className="text-lg font-semibold text-gray-800 mt-4">
                Unable to Load Receipt
              </Text>
              <Text className="text-gray-600 mt-2 text-center">
                {(error as any).message || "Failed to load receipt"}
              </Text>
              <TouchableOpacity
                onPress={() => refetch()}
                className="bg-brand px-6 py-3 rounded-md mt-4"
              >
                <Text className="text-white font-semibold">Retry</Text>
              </TouchableOpacity>
            </Card>
          )}

          {receipt && (
            <Card className="mb-6 bg-white">
              <View className="space-y-6 p-2">
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
                <View className="space-y-4">
                  <View className="items-center">
                    <Text className="text-xl font-bold text-gray-800">
                      PAYMENT RECEIPT
                    </Text>
                    <Text className="text-lg font-semibold text-brand mt-1">
                      ID: {receipt.transactionId}
                    </Text>
                  </View>

                  {/* Payment Information */}
                  <View className="space-y-3 border-t border-b border-gray-200 py-4">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Amount Paid:</Text>
                      <Text className="font-bold text-lg text-gray-800">
                        {formatUGX(receipt.amount)}
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
                      <View className="space-y-2">
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
                                {formatUGX(schedule.amountApplied)}
                              </Text>
                              <Text className="text-xs text-gray-500">
                                of {formatUGX(schedule.scheduledAmount)}
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
                    <View className="space-y-3">
                      <Text className="font-semibold text-gray-800">
                        Tenant Information
                      </Text>
                      <View className="bg-gray-50 p-3 rounded-md space-y-2">
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
                    <View className="space-y-3">
                      <Text className="font-semibold text-gray-800">
                        Lease Information
                      </Text>
                      <View className="bg-gray-50 p-3 rounded-md space-y-2">
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600">Monthly Rent:</Text>
                          <Text className="font-medium text-gray-800">
                            {formatUGX(receipt.lease.monthlyRent)}
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
            </Card>
          )}
        </ScrollView>

        {/* Actions */}
        {receipt && (
          <View className="bg-white px-4 pb-6 pt-4 border-t border-gray-200">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={handleDownloadPdf}
                disabled={isDownloading}
                className="flex-1 bg-brand py-3 rounded-md items-center flex-row justify-center"
              >
                <MaterialIcons name="file-download" size={20} color="white" />
                <Text className="text-white font-semibold ml-1">
                  {isDownloading ? "Downloading..." : "Download PDF"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onClose}
                className="px-6 py-3 border border-gray-300 rounded-md items-center"
              >
                <Text className="text-gray-700 font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
