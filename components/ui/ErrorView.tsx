import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ErrorViewProps {
    title: string;
    message: string;
    onRetry?: () => void;
    retryLabel?: string;
    isRetrying?: boolean;
    icon?: keyof typeof MaterialIcons.glyphMap;
    iconColor?: string;
    children?: React.ReactNode;
}

export function ErrorView({
    title,
    message,
    onRetry,
    retryLabel = 'Retry',
    isRetrying = false,
    icon = 'error',
    iconColor = '#EF4444',
    children
}: ErrorViewProps) {
    return (
        <View className="flex-1 bg-gray-50 justify-center items-center px-4">
            <MaterialIcons name={icon} size={48} color={iconColor} />
            <Text className="text-lg font-semibold text-gray-800 mt-4 text-center">
                {title}
            </Text>
            <Text className="text-gray-600 mt-2 text-center mb-4">
                {message}
            </Text>
            {isRetrying && (
                <Text className="text-sm text-blue-600 mb-2">
                    Retrying...
                </Text>
            )}
            {onRetry && (
                <TouchableOpacity
                    onPress={onRetry}
                    disabled={isRetrying}
                    className={`px-6 py-3 rounded-md mt-2 ${isRetrying ? 'bg-gray-400' : 'bg-brand'
                        }`}
                >
                    <Text className="text-white font-semibold">
                        {isRetrying ? 'Retrying...' : retryLabel}
                    </Text>
                </TouchableOpacity>
            )}
            {children}
        </View>
    );
}
