import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  useWindowDimensions,
  Pressable,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { BRAND_COLOR } from "../../constants/theme";
import { LoadingSpinner } from "./LoadingSpinner";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
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
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { height: windowHeight } = useWindowDimensions();

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
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      >
        {/* Backdrop — tap to dismiss */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Bottom sheet — lifted above the keyboard while typing */}
        <View
          className="bg-white rounded-t-[40px] px-9 pt-3"
          style={{
            paddingBottom: Math.max(insets.bottom, 20),
            marginBottom: keyboardHeight,
            maxHeight: windowHeight * 0.9 - keyboardHeight,
          }}
        >
          {/* Drag handle */}
          <View className="w-12 h-1.5 rounded-full bg-gray-200 self-center mt-3" />

          {/* Header */}
          <View className="flex-row items-center justify-between mt-4 mb-5">
            <Text className="text-[20px] leading-[22px] font-semibold text-finance-fence">
              Make Payment
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-[30px] h-[30px] rounded-full bg-brand-light items-center justify-center"
            >
              <MaterialIcons name="close" size={18} color={BRAND_COLOR} />
            </TouchableOpacity>
          </View>

          <ScrollView
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="pb-2">
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

              {/* Continue */}
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={!amount || isLoading || !!error}
                className={`h-[45px] rounded-[30px] items-center justify-center mt-8 ${
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
