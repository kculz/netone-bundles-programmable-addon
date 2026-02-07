import { useSocketGateway } from '@/hooks/useSocketGateway';
import socketService from '@/services/SocketService';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Platform, SafeAreaView, Alert } from 'react-native';
import { UssdResponseCaptureModal } from '@/components/UssdResponseCaptureModal';
import { checkCallPermission, requestAllPermissions, openAppSettings } from '@/services/PermissionService';
import { checkAccessibilityPermission, requestAccessibilityPermission } from '@/services/UssdBackgroundService';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
    const [isConnected, setIsConnected] = useState(false);
    const [socketId, setSocketId] = useState<string>('');
    const [autoMode, setAutoMode] = useState(true);
    const [hasCallPermission, setHasCallPermission] = useState<boolean | null>(null);
    const [isPermissionBlocked, setIsPermissionBlocked] = useState(false);
    const [isExpoGo, setIsExpoGo] = useState(false);
    const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

    const tasks = useSelector((state: RootState) => state.tasks.items);
    const lastBalance = useSelector((state: RootState) => state.tasks.lastBalance);

    // Initialize the gateway hook with response capture capabilities
    const {
        responseCaptureState,
        handleResponseSubmit,
        handleResponseSkip
    } = useSocketGateway();

    useEffect(() => {
        const checkInitialStatus = async () => {
            const hasPerm = await checkCallPermission();
            setHasCallPermission(hasPerm);
        };
        checkInitialStatus();

        const checkStatus = setInterval(async () => {
            setIsConnected(socketService.isConnected());
            if (socketService.socket.id) {
                setSocketId(socketService.socket.id);
            }

            // Periodically check permission status
            const hasPerm = await checkCallPermission();
            setHasCallPermission(hasPerm);

            // Check accessibility status
            const isAccEnabled = await checkAccessibilityPermission();
            setIsAccessibilityEnabled(isAccEnabled);
        }, 1000);

        return () => clearInterval(checkStatus);
    }, []);

    const handleRequestPermissions = async () => {
        const result = await requestAllPermissions();
        setHasCallPermission(result.granted);
        setIsPermissionBlocked(result.isBlocked || false);
        setIsExpoGo(result.isExpoGo || false);

        if (result.granted) {
            Alert.alert('Success', 'Permissions granted! Gateway is ready.');
        } else if (result.isExpoGo) {
            Alert.alert(
                'Expo Go Restricted',
                'USSD Automation requires "Direct Call" permissions which are blocked in standard Expo Go. You must create a Development Build or Eject to proceed.',
                [
                    { text: 'Got it', style: 'cancel' },
                    { text: 'View Setup Guide', onPress: () => Alert.alert('Setup Guide', 'Run "npx expo prebuild" to create a native Android project where USSD automation is supported.') }
                ]
            );
        } else if (result.isBlocked) {
            Alert.alert(
                'Action Required',
                'Android has blocked the permission request because it was denied multiple times. Please enable "Phone" permission manually in App Settings.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: openAppSettings }
                ]
            );
        } else {
            Alert.alert('Error', result.message);
        }
    };

    const handleReconnect = () => {
        if (!isConnected) {
            socketService.connect();
        }
    };

    const activeTasks = tasks.filter(t => t.status === 'PROCESSING' || t.status === 'PENDING_CONFIRMATION');
    const queuedTasks = tasks.filter(t => t.status === 'QUEUED' || t.status === 'PENDING');
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'FAILED');

    // Limit completed history
    const recentHistory = completedTasks.slice(0, 5);

    return (
        <LinearGradient
            colors={['#1a1b2e', '#16213e', '#1a1b2e']}
            style={styles.container}
        >
            <StatusBar style="light" />
            <SafeAreaView style={styles.safeArea}>

                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>NetOne Gateway</Text>
                        <Text style={styles.subtitle}>USSD Automation Bridge</Text>
                    </View>
                    <View style={styles.statusBadgeContainer}>
                        <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#FF5252' }]} />
                        <Text style={styles.statusText}>{isConnected ? 'ONLINE' : 'OFFLINE'}</Text>
                    </View>
                </View>

                {/* Connection Status Card */}
                <View style={styles.card}>
                    <View style={styles.row}>
                        <Text style={styles.label}>Gateway ID</Text>
                        <Text style={styles.value}>{socketId ? socketId.substring(0, 8) : 'Connecting...'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Permissions</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: hasCallPermission === null ? '#FF9800' : hasCallPermission ? '#4CAF50' : '#FF5252' }
                            ]} />
                            <Text style={[
                                styles.value,
                                { color: hasCallPermission === null ? '#FF9800' : hasCallPermission ? '#4CAF50' : '#FF5252' }
                            ]}>
                                {hasCallPermission === null ? 'CHECKING...' : hasCallPermission ? 'GRANTED' : isExpoGo ? 'RESTRICTED' : isPermissionBlocked ? 'BLOCKED' : 'MISSING'}
                            </Text>
                        </View>
                    </View>
                    {hasCallPermission === false && (
                        <TouchableOpacity
                            style={[styles.reconnectBtn, { backgroundColor: isExpoGo ? '#5C6BC0' : isPermissionBlocked ? '#607D8B' : '#FF9800' }]}
                            onPress={isExpoGo ? () => handleRequestPermissions() : (isPermissionBlocked ? openAppSettings : handleRequestPermissions)}
                        >
                            <Text style={styles.reconnectText}>
                                {isExpoGo ? 'Why Restricted?' : isPermissionBlocked ? 'Open System Settings' : 'Grant Permissions'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    {isExpoGo && (
                        <Text style={[styles.taskMessage, { marginTop: 10, fontSize: 11, fontStyle: 'italic' }]}>
                            ⚠️ USSD automation requires a Development Build or Ejection.
                        </Text>
                    )}
                    <View style={styles.row}>
                        <Text style={styles.label}>Accessibility</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[
                                styles.statusDot,
                                { backgroundColor: isAccessibilityEnabled ? '#4CAF50' : '#FF9800' }
                            ]} />
                            <Text style={[
                                styles.value,
                                { color: isAccessibilityEnabled ? '#4CAF50' : '#FF9800' }
                            ]}>
                                {isAccessibilityEnabled ? 'ENABLED' : 'DISABLED'}
                            </Text>
                        </View>
                    </View>
                    {!isAccessibilityEnabled && !isExpoGo && (
                        <TouchableOpacity
                            style={[styles.reconnectBtn, { backgroundColor: '#5D4037', marginTop: 5 }]}
                            onPress={requestAccessibilityPermission}
                        >
                            <Text style={styles.reconnectText}>Enable Accessibility</Text>
                        </TouchableOpacity>
                    )}
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>Auto-Execution</Text>
                        <Switch
                            value={autoMode}
                            onValueChange={setAutoMode}
                            trackColor={{ false: '#767577', true: '#4CAF50' }}
                            thumbColor={autoMode ? '#fff' : '#f4f3f4'}
                        />
                    </View>
                    {!isConnected && (
                        <TouchableOpacity style={styles.reconnectBtn} onPress={handleReconnect}>
                            <Text style={styles.reconnectText}>Reconnect Now</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Balance Card */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, { marginTop: 0, marginBottom: 15 }]}>Wallet Balance</Text>
                    <View style={styles.row}>
                        <Text style={styles.label}>USD Balance</Text>
                        <Text style={styles.value}>{lastBalance?.USD || 'Unknown'}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <Text style={styles.label}>ZWL Balance</Text>
                        <Text style={styles.value}>{lastBalance?.ZWL || 'Unknown'}</Text>
                    </View>
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

                    {/* Active Tasks Section */}
                    <Text style={styles.sectionTitle}>Executing Tasks</Text>
                    {activeTasks.length > 0 ? (
                        activeTasks.map(task => (
                            <View key={task.taskId} style={[styles.taskCard, styles.activeTaskBorder]}>
                                <View style={styles.taskHeader}>
                                    <Text style={styles.taskTitle}>{task.description || 'Unknown Task'}</Text>
                                    <View style={styles.pulseBadge}>
                                        <Text style={styles.activeText}>EXECUTING</Text>
                                    </View>
                                </View>
                                <Text style={styles.taskMessage}>{task.message}</Text>
                                <Text style={styles.taskTime}>{new Date(task.timestamp).toLocaleTimeString()}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No active tasks running.</Text>
                        </View>
                    )}

                    {/* Queued Tasks Section */}
                    <Text style={styles.sectionTitle}>Queued</Text>
                    {queuedTasks.length > 0 ? (
                        queuedTasks.map(task => (
                            <View key={task.taskId} style={styles.taskCard}>
                                <View style={styles.taskHeader}>
                                    <Text style={styles.taskTitle}>{task.description}</Text>
                                    <Text style={styles.queuedText}>WAITING</Text>
                                </View>
                                <Text style={styles.taskTime}>{new Date(task.timestamp).toLocaleTimeString()}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Queue is empty.</Text>
                        </View>
                    )}

                    {/* History Section */}
                    <Text style={styles.sectionTitle}>Recent History</Text>
                    {recentHistory.map(task => (
                        <View key={task.taskId} style={[styles.taskCard, { opacity: 0.7 }]}>
                            <View style={styles.taskHeader}>
                                <Text style={styles.taskTitle}>{task.description}</Text>
                                <Text style={[
                                    styles.statusTextSmall,
                                    { color: task.status === 'COMPLETED' ? '#4CAF50' : '#FF5252' }
                                ]}>
                                    {task.status}
                                </Text>
                            </View>
                            <Text style={styles.taskMessage}>{task.message}</Text>
                        </View>
                    ))}

                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Powered by Xash.Network</Text>
                </View>

                {/* USSD Response Capture Modal */}
                <UssdResponseCaptureModal
                    visible={responseCaptureState.visible}
                    taskId={responseCaptureState.taskId}
                    taskDescription={responseCaptureState.taskDescription}
                    onSubmit={handleResponseSubmit}
                    onSkip={handleResponseSkip}
                />
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        paddingTop: Platform.OS === 'android' ? 40 : 0,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    subtitle: {
        fontSize: 14,
        color: '#8F9BB3',
        marginTop: 2,
    },
    statusBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        color: '#8F9BB3',
        fontSize: 14,
    },
    value: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 15,
    },
    reconnectBtn: {
        marginTop: 15,
        backgroundColor: '#FF5252',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    reconnectText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#A0AEC0',
        marginBottom: 10,
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    taskCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    activeTaskBorder: {
        borderColor: '#4CAF50',
        borderWidth: 1,
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 6,
    },
    taskTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 10,
    },
    taskMessage: {
        color: '#CBD5E0',
        fontSize: 13,
        marginBottom: 6,
    },
    taskTime: {
        color: '#718096',
        fontSize: 11,
        textAlign: 'right',
    },
    pulseBadge: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    activeText: {
        color: '#4CAF50',
        fontSize: 10,
        fontWeight: 'bold',
    },
    queuedText: {
        color: '#ECC94B',
        fontSize: 10,
        fontWeight: 'bold',
    },
    statusTextSmall: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyState: {
        padding: 20,
        alignItems: 'center',
        opacity: 0.5,
    },
    emptyText: {
        color: '#718096',
    },
    footer: {
        padding: 20,
        alignItems: 'center',
    },
    footerText: {
        color: '#4A5568',
        fontSize: 12,
        fontWeight: '600',
    },
});