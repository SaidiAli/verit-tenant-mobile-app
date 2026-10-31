import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  formatMoney,
  formatPhoneNumber,
  normalizePhoneNumber,
  getMobileMoneyProvider,
} from "../../lib/currency";
import type { Currency } from "../../types";

interface PaymentConfirmationModalProps {
  paymentType?: 'rent' | 'security_deposit';
  visible: boolean;
  onClose: () => void;
  onConfirm: (phoneNumber: string) => void;
  amount: number;
  currency: Currency;
  phoneNumber: string;
  providerName: string;
  isLoading?: boolean;
  error?: string;
}

export function PaymentConfirmationModal({
  visible,
  paymentType = 'rent',
  onClose,
  onConfirm,
  amount,
  currency,
  phoneNumber,
  providerName: initialProviderName,
  isLoading = false,
  error,
}: PaymentConfirmationModalProps) {
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phoneNumber);
  const [isEditing, setIsEditing] = useState(false);
  const [derivedProvider, setDerivedProvider] = useState(initialProviderName);

  const [previous, setPrevious] = useState({ visible, phoneNumber, initialProviderName });
  if (visible !== previous.visible || phoneNumber !== previous.phoneNumber || initialProviderName !== previous.initialProviderName) {
    setPrevious({ visible, phoneNumber, initialProviderName });
    if (visible) {
      setCurrentPhoneNumber(phoneNumber);
      setDerivedProvider(initialProviderName);
      setIsEditing(false);
    }
  }

  const handlePhoneChange = (text: string) => {
    setCurrentPhoneNumber(text);
    const normalized = normalizePhoneNumber(text);
    const provider = getMobileMoneyProvider(normalized);

    if (provider === "mtn") setDerivedProvider("MTN MoMo");
    else if (provider === "airtel") setDerivedProvider("Airtel Money");
    else setDerivedProvider("Unknown Provider");
  };

  const handleConfirm = () => {
    onConfirm(normalizePhoneNumber(currentPhoneNumber));
  };

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
              <TouchableOpacity onPress={onClose} disabled={isLoading} className="w-[30px] h-[30px] rounded-full bg-white/10 items-center justify-center">
                <MaterialIcons name="arrow-back" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              <Text className="text-[20px] leading-[22px] font-semibold text-white text-center flex-1 mx-3">
                {paymentType === 'security_deposit' ? 'Confirm Security Deposit' : 'Confirm Rent Payment'}
              </Text>
              <View className="w-[30px]" />
            </View>
          </View>

          <View className="flex-1">
            <View className="bg-white rounded-t-[40px] px-9 pt-8 pb-16">
            {/* Provider and Amount Info */}
            <View className="mb-8">
              <View className="items-center gap-4">
                <View
                  className={`w-16 h-16 rounded-full items-center justify-center ${
                    derivedProvider === "MTN MoMo"
                      ? "bg-[#FFCB05]"
                      : derivedProvider === "Airtel Money"
                        ? "bg-[#E51A1A]"
                        : "bg-gray-400"
                  }`}
                >
                  <MaterialIcons name="phone-android" size={32} color="white" />
                </View>

                <View className="items-center gap-2 w-full">
                  <Text className="text-[24px] font-bold text-finance-fence">
                    {formatMoney(amount, currency)}
                  </Text>
                  <Text className="text-[13px] text-gray-500">via {derivedProvider}</Text>
                  {paymentType === 'security_deposit' && <Text className="text-[12px] text-gray-400 text-center">Exact refundable security amount. This payment does not reduce rent owed.</Text>}

                  {isEditing ? (
                    <View className="flex-row items-center bg-brand-light rounded-full px-3 py-1 w-full max-w-[260px]">
                      <TextInput
                        value={currentPhoneNumber}
                        onChangeText={handlePhoneChange}
                        keyboardType="phone-pad"
                        className="flex-1 text-center text-lg font-semibold text-gray-900"
                        autoFocus
                        onBlur={() => setIsEditing(false)}
                      />
                      <TouchableOpacity
                        onPress={() => setIsEditing(false)}
                        className="ml-1 w-7 h-7 rounded-full bg-emerald-500 items-center justify-center"
                      >
                        <MaterialIcons name="check" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => setIsEditing(true)}
                      className="flex-row items-center gap-2 bg-brand-light px-4 py-2 rounded-full"
                    >
                      <Text className="text-finance-fence font-semibold text-[15px]">
                        {formatPhoneNumber(currentPhoneNumber)}
                      </Text>
                      <View className="w-5 h-5 rounded-full bg-gray-400 items-center justify-center">
                        <MaterialIcons name="edit" size={12} color="white" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Instructions */}
            <View className="items-center gap-6">
              <View className="bg-amber-50 p-4 rounded-[18px] border border-amber-200 w-full">
                <View className="flex-row items-start gap-2">
                  <MaterialIcons
                    name="info"
                    size={24}
                    color="#F59E0B"
                    className="mt-1"
                  />
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-amber-900 text-[13px]">
                      Next Step
                    </Text>
                    <Text className="text-amber-800 text-[13px] leading-relaxed">
                      When you tap &quot;Pay Now&quot;, you will receive a
                      prompt on your phone (
                      {formatPhoneNumber(currentPhoneNumber)}) to enter your
                      Mobile Money PIN validation.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Error Message */}
              {error && (
                <View className="flex-row items-center gap-2 bg-red-50 px-4 py-3 rounded-[18px] w-full">
                  <MaterialIcons name="error" size={20} color="#EF4444" />
                  <Text className="text-red-600 text-[13px] flex-1">{error}</Text>
                </View>
              )}

              {/* Loading State */}
              {isLoading && (
                <View className="items-center gap-3 mt-4">
                  <LoadingSpinner size="large" message="" className="my-0" />
                  <Text className="text-gray-500 text-center text-[13px]">
                    Initiating payment request...
                  </Text>
                </View>
              )}
            </View>
            </View>
          </View>

          {/* Footer */}
          <View className="absolute bottom-0 left-0 right-0 bg-white px-9 pb-6 pt-4 border-t border-gray-100">
            <View className="gap-3">
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isLoading || derivedProvider === "Unknown Provider"}
                className={`h-[45px] rounded-[30px] items-center justify-center ${
                  isLoading || derivedProvider === "Unknown Provider"
                    ? "bg-brand-light"
                    : "bg-finance"
                }`}
              >
                <Text
                  className={`font-semibold text-[15px] ${
                    isLoading || derivedProvider === "Unknown Provider"
                      ? "text-gray-400"
                      : "text-finance-fence"
                  }`}
                >
                  {isLoading ? "Processing..." : "Pay Now"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
