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
        <View className="flex-1 bg-brand justify-center items-center px-9">
            <View className="w-16 h-16 rounded-full bg-white/10 items-center justify-center mb-5">
                <MaterialIcons name={icon} size={32} color={iconColor} />
            </View>
            <Text className="text-[20px] font-semibold text-white mt-1 text-center">
                {title}
            </Text>
            <Text className="text-[14px] text-white/70 mt-2 text-center mb-6 leading-relaxed">
                {message}
            </Text>
            {isRetrying && (
                <Text className="text-[13px] text-white/60 mb-2">
                    Retrying...
                </Text>
            )}
            {onRetry && (
                <TouchableOpacity
                    onPress={onRetry}
                    disabled={isRetrying}
                    className={`h-[45px] px-8 rounded-[30px] items-center justify-center ${isRetrying ? 'bg-white/20' : 'bg-finance'
                        }`}
                >
                    <Text className={`font-semibold text-[15px] ${isRetrying ? 'text-white/60' : 'text-finance-fence'}`}>
                        {isRetrying ? 'Retrying...' : retryLabel}
                    </Text>
                </TouchableOpacity>
            )}
            {children}
        </View>
    );
}
