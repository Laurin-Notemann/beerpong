import * as Updates from 'expo-updates';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import copyToClipboard from '@/components/copyToClipboard';

/**
 * Shown instead of crashing when the app hits an error it can't render past.
 * The error has already been sent to Sentry; the id lets us find it.
 */
export function CrashFallback({
    error,
    eventId,
    onRetry,
}: {
    error: unknown;
    eventId?: string;
    onRetry: () => void;
}) {
    const message = error instanceof Error ? error.message : String(error);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message} numberOfLines={4}>
                {message}
            </Text>
            {eventId ? (
                <Pressable onPress={() => copyToClipboard(eventId)}>
                    <Text style={styles.eventId}>Error ID: {eventId}</Text>
                </Pressable>
            ) : null}
            <Pressable style={styles.button} onPress={onRetry}>
                <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
            <Pressable
                style={[styles.button, styles.secondary]}
                onPress={() => {
                    // The update or embedded bundle starts fresh; expo-updates may pick a fixed update.
                    Updates.reloadAsync().catch(onRetry);
                }}
            >
                <Text style={styles.buttonText}>Restart App</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 12,
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '700' },
    message: { color: '#aaa', fontSize: 14, textAlign: 'center' },
    eventId: { color: '#666', fontSize: 12, marginBottom: 12 },
    button: {
        backgroundColor: '#0A84FF',
        borderRadius: 12,
        paddingVertical: 14,
        alignSelf: 'stretch',
        alignItems: 'center',
    },
    secondary: { backgroundColor: '#2C2C2E' },
    buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
