// app/index.tsx

import { useSocketGateway } from '@/hooks/useSocketGateway';
import socketService from '@/services/SocketService';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState, useEffect } from 'react';

export default function HomeScreen() {
    const [isConnected, setIsConnected] = useState(false);
    const [socketId, setSocketId] = useState<string>('');

    // Initialize the gateway hook when the screen mounts
    useSocketGateway();

    useEffect(() => {
        // Monitor connection status
        const checkConnection = setInterval(() => {
            setIsConnected(socketService.isConnected());
            if (socketService.socket.id) {
                setSocketId(socketService.socket.id);
            }
        }, 1000);

        return () => clearInterval(checkConnection);
    }, []);

    const handleReconnect = () => {
        if (!isConnected) {
            socketService.connect();
        }
    };

    const handleDisconnect = () => {
        if (isConnected) {
            socketService.disconnect();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>NetOne USSD Gateway</Text>
                <Text style={styles.subtitle}>Mobile Bundle Automation</Text>
            </View>

            <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Connection Status:</Text>
                    <View style={[
                        styles.statusIndicator, 
                        { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
                    ]}>
                        <Text style={styles.statusText}>
                            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </Text>
                    </View>
                </View>

                {isConnected && socketId && (
                    <View style={styles.statusRow}>
                        <Text style={styles.statusLabel}>Socket ID:</Text>
                        <Text style={styles.socketId}>{socketId.substring(0, 8)}...</Text>
                    </View>
                )}

                <Text style={styles.infoText}>
                    {isConnected 
                        ? '✓ Ready to receive bundle purchase tasks' 
                        : '✗ Waiting for connection to bridge server'}
                </Text>
            </View>

            <View style={styles.actionButtons}>
                {!isConnected ? (
                    <TouchableOpacity 
                        style={[styles.button, styles.connectButton]} 
                        onPress={handleReconnect}
                    >
                        <Text style={styles.buttonText}>Reconnect</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        style={[styles.button, styles.disconnectButton]} 
                        onPress={handleDisconnect}
                    >
                        <Text style={styles.buttonText}>Disconnect</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>How it works:</Text>
                <Text style={styles.infoItem}>1. Keep this app running in the background</Text>
                <Text style={styles.infoItem}>2. Ensure stable internet connection</Text>
                <Text style={styles.infoItem}>3. Tasks will be executed automatically</Text>
                <Text style={styles.infoItem}>4. Confirm purchases when prompted</Text>
            </View>

            <View style={styles.footer}>
                <Text style={styles.footerText}>Version 1.0.0</Text>
                <Text style={styles.footerText}>Server: 192.168.1.113:3000</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        padding: 20,
    },
    header: {
        marginTop: 60,
        marginBottom: 30,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
    },
    statusCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginRight: 10,
    },
    statusIndicator: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    statusText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 12,
    },
    socketId: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'monospace',
    },
    infoText: {
        fontSize: 14,
        color: '#666',
        marginTop: 10,
    },
    actionButtons: {
        marginBottom: 20,
    },
    button: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    connectButton: {
        backgroundColor: '#4CAF50',
    },
    disconnectButton: {
        backgroundColor: '#F44336',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 15,
    },
    infoItem: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        lineHeight: 20,
    },
    footer: {
        alignItems: 'center',
        marginTop: 'auto',
        paddingTop: 20,
    },
    footerText: {
        fontSize: 12,
        color: '#999',
        marginBottom: 4,
    },
});