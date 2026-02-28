// app/index.tsx

import { useSocketGateway } from '@/hooks/useSocketGateway';
import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
    // Initialize the gateway hook when the screen mounts
    useSocketGateway();

    return (
        <View style={styles.container}>
            <Text style={styles.header}>NetOne USSD Gateway App</Text>
            <Text>Status: Connected to server, listening for tasks...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
});
