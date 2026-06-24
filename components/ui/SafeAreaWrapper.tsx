import { BRAND_COLOR } from '@/constants/theme';
import React from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { ViewStyle, View } from 'react-native';
import { Image } from 'expo-image';

interface SafeAreaWrapperProps extends SafeAreaViewProps {
    backgroundColor?: string;
    style?: ViewStyle;
    edgeConfig?: 'all' | 'content';
}

export function SafeAreaWrapper({
    children,
    backgroundColor = BRAND_COLOR,
    style,
    edges = ['top'],
    edgeConfig = 'all',
    ...props
}: SafeAreaWrapperProps) {
    return (
        <SafeAreaView
            style={[{ flex: 1, backgroundColor }, style]}
            edges={edges}
            {...props}
        >
            <View style={{ flex: 1 }}>
                {children}
            </View>
            <View style={{ alignItems: 'center', paddingVertical: 10, backgroundColor: '#F9FAFB' }}>
                <Image
                    source={require('../../assets/logos/logos-02.svg')}
                    style={{ width: 80, height: 24, opacity: 0.4 }}
                    contentFit="contain"
                />
            </View>
        </SafeAreaView>
    );
}
