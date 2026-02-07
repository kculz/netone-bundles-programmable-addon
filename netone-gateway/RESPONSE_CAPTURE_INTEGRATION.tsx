// Example: How to integrate UssdResponseCaptureModal in your main app

import React from 'react';
import { View } from 'react-native';
import { useSocketGatewayWithCapture } from '@/hooks/useSocketGatewayWithCapture';
import { UssdResponseCaptureModal } from '@/components/UssdResponseCaptureModal';

export default function App() {
    // Use the enhanced hook with response capture
    const {
        responseCaptureState,
        handleResponseSubmit,
        handleResponseSkip
    } = useSocketGatewayWithCapture();

    return (
        <View style={{ flex: 1 }}>
            {/* Your existing app content */}

            {/* Add the response capture modal */}
            <UssdResponseCaptureModal
                visible={responseCaptureState.visible}
                taskId={responseCaptureState.taskId}
                taskDescription={responseCaptureState.taskDescription}
                onSubmit={handleResponseSubmit}
                onSkip={handleResponseSkip}
            />
        </View>
    );
}

/**
 * INTEGRATION STEPS:
 * 
 * 1. Replace your current useSocketGateway() with useSocketGatewayWithCapture()
 * 
 * 2. Add the UssdResponseCaptureModal component to your main app layout
 * 
 * 3. That's it! The modal will automatically show after USSD execution
 * 
 * HOW IT WORKS:
 * - User sends a task from backend/web
 * - Gateway receives task and executes USSD (visible on screen)
 * - USSD dialogs show with auto-filled options
 * - After execution, modal appears asking user to input the response
 * - User enters the USSD response text
 * - Response is sent to backend with rawResponse field
 * - Backend parses the response and extracts balance/transaction data
 */
