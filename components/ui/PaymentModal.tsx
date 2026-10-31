import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LoadingSpinner } from "./LoadingSpinner";
import { PaymentBalance } from "../../types";
import {
  formatMoney,
  parseMoney,
  validatePaymentAmount,
  formatNumber,
  MOBILE_MONEY_UNAVAILABLE_MESSAGE,
} from "../../lib/currency";

interface PaymentAmountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  balance: PaymentBalance;
  isLoading?: boolean;
}

export function PaymentModal({
  visible,
  onClose,
  onConfirm,
  balance,
  isLoading = false,
}: PaymentAmountModalProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [previousVisible, setPreviousVisible] = useState(visible);
  if (visible !== previousVisible) {
    setPreviousVisible(visible);
    if (visible) {
      // Reset state when modal opens
      setAmount("");
      setError(null);
    }
  }

  const handleAmountChange = (text: string) => {
    // Remove any non-digit characters except for spaces and commas
    const cleanText = text.replace(/[^\d,\s]/g, "");

    // Parse the amount
    const numericValue = parseMoney(cleanText);

    // Update state
    setAmount(formatNumber(numericValue));
    setError(null);
  };

  const handleConfirm = () => {
    if (balance.currency !== "UGX") {
      setError(MOBILE_MONEY_UNAVAILABLE_MESSAGE);
      return;
    }

    const numericAmount = parseMoney(amount);

    // Validate amount
    const validation = validatePaymentAmount(numericAmount, balance.currency, 10000);

    if (!validation.isValid) {
      setError(validation.error || "Invalid amount");
      return;
    }

    // Proceed with payment
    onConfirm(numericAmount);
  };

  const remainingBalance = Math.max(
    0,
    balance.outstandingBalance - parseMoney(amount),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 bg-brand">
          {/* Header */}
          <View className="px-9 pt-12 pb-6">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose} className="w-[30px] h-[30px] rounded-full bg-white/10 items-center justify-center">
                <MaterialIcons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-[20px] leading-[22px] font-semibold text-white">
                Make Payment
              </Text>
              <View className="w-[30px]" />
            </View>
          </View>

          <ScrollView className="flex-1">
            <View className="bg-white rounded-t-[40px] px-9 pt-8 pb-16">
              {/* Balance Information */}
              <View className="mb-8">
                <Text className="text-[15px] font-medium text-finance-fence mb-2">
                  Outstanding Balance
                </Text>
                <Text className="text-[24px] font-bold text-brand">
                  {formatMoney(balance.outstandingBalance, balance.currency)}
                </Text>
                <View className="flex-row justify-between mt-2">
                  {/* Rent is denominated in the lease's rent currency, which is not the
                      payable currency on an arrears-only lease. */}
                  <Text className="text-[12px] text-gray-500">Monthly Rent: {formatMoney(balance.monthlyRent, balance.monthlyRentCurrency)}</Text>
                  <Text className="text-[12px] text-gray-500">Paid: {formatMoney(balance.paidAmount, balance.currency)}</Text>
                </View>
              </View>

              {/* Amount Input */}
              <View>
                <Text className="text-[15px] font-medium text-finance-fence mb-2">
                  Enter Payment Amount
                </Text>

                <View className="relative">
                  <Text className="absolute left-4 top-[10px] text-[15px] text-gray-400 z-10">
                    {balance.currency}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={handleAmountChange}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    className="h-[45px] bg-brand-light rounded-[18px] px-12 text-[16px] font-semibold text-finance-fence text-right"
                    maxLength={12}
                  />
                </View>

                {error && (
                  <View className="flex-row items-center gap-2 mt-3">
                    <MaterialIcons name="error" size={16} color="#EF4444" />
                    <Text className="text-red-500 text-[12px] flex-1">{error}</Text>
                  </View>
                )}

                {amount && !error && (
                  <View className="bg-finance-honeydew p-3.5 rounded-[18px] mt-3">
                    <Text className="text-finance-dark text-[13px]">
                      Remaining balance after payment:{" "}
                      {formatMoney(remainingBalance, balance.currency)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View className="absolute bottom-0 left-0 right-0 bg-white px-9 pb-6 pt-4 border-t border-gray-100">
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!amount || isLoading || !!error}
              className={`h-[45px] rounded-[30px] items-center justify-center ${
                !amount || isLoading || !!error ? "bg-brand-light" : "bg-finance"
              }`}
            >
              {isLoading ? (
                <LoadingSpinner size="small" message="" className="my-0" />
              ) : (
                <Text
                  className={`font-semibold text-[15px] ${
                    !amount || isLoading || !!error ? "text-gray-400" : "text-finance-fence"
                  }`}
                >
                  Continue to Pay
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
