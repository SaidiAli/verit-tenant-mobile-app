import { BRAND_COLOR } from '@/constants/theme';
import React from 'react';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import { Platform, ViewStyle, View } from 'react-native';
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
    mode = 'padding',
    ...props
}: SafeAreaWrapperProps) {
    // Router 58 no longer measures web safe areas during streamed hydration.
    // CSS env() values update in the browser without mounting another provider.
    const web = Platform.OS === 'web';
    const Container = web ? View : SafeAreaView;
    const webInsets: ViewStyle = {};
    if (web) {
        const edgeModes = Array.isArray(edges)
            ? Object.fromEntries(edges.map(edge => [edge, 'additive']))
            : edges;
        for (const [edge, edgeMode] of Object.entries(edgeModes)) {
            if (edgeMode === 'off') continue;
            Object.assign(webInsets, {
                [`${mode}${edge[0].toUpperCase()}${edge.slice(1)}`]: `env(safe-area-inset-${edge}, 0px)`,
            });
        }
    }
    return (
        <Container
            style={[{ flex: 1, backgroundColor }, style, webInsets]}
            {...(web ? {} : { edges, mode })}
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
        </Container>
    );
}
