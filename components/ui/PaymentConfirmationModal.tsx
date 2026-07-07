import React, { useState, useEffect } from "react";
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
import { Card } from "./Card";
import { LoadingSpinner } from "./LoadingSpinner";
import {
  formatUGX,
  formatPhoneNumber,
  normalizePhoneNumber,
  getMobileMoneyProvider,
} from "../../lib/currency";

interface PaymentConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (phoneNumber: string) => void;
  amount: number;
  phoneNumber: string;
  providerName: string;
  isLoading?: boolean;
  error?: string;
}

export function PaymentConfirmationModal({
  visible,
  onClose,
  onConfirm,
  amount,
  phoneNumber,
  providerName: initialProviderName,
  isLoading = false,
  error,
}: PaymentConfirmationModalProps) {
  const [currentPhoneNumber, setCurrentPhoneNumber] = useState(phoneNumber);
  const [isEditing, setIsEditing] = useState(false);
  const [derivedProvider, setDerivedProvider] = useState(initialProviderName);

  useEffect(() => {
    if (visible) {
      setCurrentPhoneNumber(phoneNumber);
      setDerivedProvider(initialProviderName);
      setIsEditing(false);
    }
  }, [visible, phoneNumber, initialProviderName]);

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
        <View className="flex-1 bg-gray-50">
          {/* Header */}
          <View className="bg-white px-4 pt-12 pb-4 border-b border-gray-200">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity onPress={onClose} disabled={isLoading}>
                <MaterialIcons name="arrow-back" size={24} color="#6B7280" />
              </TouchableOpacity>
              <Text className="text-lg font-semibold text-gray-800">
                Confirm Payment
              </Text>
              <View className="w-6" />
            </View>
          </View>

          <View className="flex-1 px-4 pt-8">
            {/* Provider and Amount Info */}
            <Card className="mb-8">
              <View className="items-center space-y-4">
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
                  <Text className="text-xl font-bold text-gray-800">
                    {formatUGX(amount)}
                  </Text>
                  <Text className="text-gray-600">via {derivedProvider}</Text>

                  {isEditing ? (
                    <View className="flex-row items-center bg-gray-100 rounded-full px-3 py-1 border border-gray-300 w-full max-w-[240px]">
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
                      className="flex-row items-center gap-2 bg-gray-100 border border-dashed border-gray-400 px-4 py-2 rounded-full"
                    >
                      <Text className="text-gray-900 font-semibold text-lg">
                        {formatPhoneNumber(currentPhoneNumber)}
                      </Text>
                      <View className="w-5 h-5 rounded-full bg-gray-400 items-center justify-center">
                        <MaterialIcons name="edit" size={12} color="white" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </Card>

            {/* Instructions */}
            <View className="items-center space-y-6">
              <View className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 w-full">
                <View className="flex-row items-start gap-2">
                  <MaterialIcons
                    name="info"
                    size={24}
                    color="#F59E0B"
                    className="mt-1"
                  />
                  <View className="flex-1 space-y-1">
                    <Text className="font-semibold text-yellow-900">
                      Next Step
                    </Text>
                    <Text className="text-yellow-800 leading-5">
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
                <View className="flex-row items-center space-x-2 bg-red-50 px-4 py-3 rounded-md w-full">
                  <MaterialIcons name="error" size={20} color="#EF4444" />
                  <Text className="text-red-600 flex-1">{error}</Text>
                </View>
              )}

              {/* Loading State */}
              {isLoading && (
                <View className="items-center space-y-3 mt-4">
                  <LoadingSpinner size="large" message="" className="my-0" />
                  <Text className="text-gray-600 text-center">
                    Initiating payment request...
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Footer */}
          <View className="bg-white px-4 pb-6 pt-4 border-t border-gray-200">
            <View className="space-y-3">
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isLoading || derivedProvider === "Unknown Provider"}
                className={`py-3 rounded-md items-center ${
                  isLoading || derivedProvider === "Unknown Provider"
                    ? "bg-gray-300"
                    : "bg-brand"
                }`}
              >
                <Text className="text-white font-semibold text-lg">
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
