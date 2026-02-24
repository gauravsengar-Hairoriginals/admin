import React from 'react';
import { View, StyleSheet, ScrollView, ViewStyle } from 'react-native';
import { Colors } from '../constants/Colors';

interface AdminPageLayoutProps {
    children: React.ReactNode;
    style?: ViewStyle;
    scrollable?: boolean;
}

export default function AdminPageLayout({ children, style, scrollable = true }: AdminPageLayoutProps) {
    const Content = (
        <View style={[styles.content, style]}>
            {children}
        </View>
    );

    return (
        <View style={styles.container}>
            {scrollable ? (
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    {Content}
                </ScrollView>
            ) : (
                Content
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        // Removed alignItems: 'center' to allow full width stretch by default
    },
    content: {
        width: '95%',
        alignSelf: 'center', // Center the 95% wide content
        paddingVertical: 24,
        flex: 1,
    },
});
