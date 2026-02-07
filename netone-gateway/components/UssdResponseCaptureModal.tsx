// components/UssdResponseCaptureModal.tsx
/**
 * Modal for manually capturing USSD responses
 * Shows after USSD execution completes, allowing user to input the response they see
 */

import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert
} from 'react-native';

interface UssdResponseCaptureModalProps {
    visible: boolean;
    taskId: string;
    taskDescription: string;
    onSubmit: (response: string) => void;
    onSkip: () => void;
}

export const UssdResponseCaptureModal: React.FC<UssdResponseCaptureModalProps> = ({
    visible,
    taskId,
    taskDescription,
    onSubmit,
    onSkip
}) => {
    const [response, setResponse] = useState('');

    const handleSubmit = () => {
        if (!response.trim()) {
            Alert.alert('Error', 'Please enter the USSD response');
            return;
        }

        onSubmit(response.trim());
        setResponse(''); // Clear for next time
    };

    const handleSkip = () => {
        setResponse('');
        onSkip();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={handleSkip}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        <Text style={styles.title}>USSD Response</Text>

                        <Text style={styles.description}>
                            {taskDescription}
                        </Text>

                        <Text style={styles.instruction}>
                            Please enter the USSD response you see on your screen:
                        </Text>

                        <TextInput
                            style={styles.input}
                            value={response}
                            onChangeText={setResponse}
                            placeholder="Enter USSD response..."
                            placeholderTextColor="#999"
                            multiline
                            numberOfLines={4}
                            autoFocus
                        />

                        <View style={styles.buttonContainer}>
                            <TouchableOpacity
                                style={[styles.button, styles.skipButton]}
                                onPress={handleSkip}
                            >
                                <Text style={styles.skipButtonText}>Skip</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.submitButton]}
                                onPress={handleSubmit}
                            >
                                <Text style={styles.submitButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.hint}>
                            Tip: Copy the USSD response text and paste it here
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modal: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    description: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    instruction: {
        fontSize: 14,
        color: '#333',
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 16,
        color: '#333',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    skipButton: {
        backgroundColor: '#f0f0f0',
    },
    skipButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#007AFF',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    hint: {
        fontSize: 12,
        color: '#999',
        marginTop: 12,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});
