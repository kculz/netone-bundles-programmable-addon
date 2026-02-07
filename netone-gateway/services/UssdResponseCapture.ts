// services/UssdResponseCapture.ts
/**
 * USSD Response Capture Service
 * 
 * Since React Native's Linking API cannot automatically capture USSD responses,
 * this service provides a manual capture mechanism where users can input
 * the USSD response they see on their device.
 * 
 * For automatic capture, native Android modules are required (see UssdBackgroundService.ts)
 */

import { Alert, Platform } from 'react-native';

export interface UssdResponseData {
    taskId: string;
    rawResponse: string;
    timestamp: number;
}

class UssdResponseCaptureService {
    private pendingTaskId: string | null = null;
    private responseCallback: ((response: UssdResponseData) => void) | null = null;

    /**
     * Set the current task that's waiting for a response
     */
    setPendingTask(taskId: string, callback: (response: UssdResponseData) => void) {
        this.pendingTaskId = taskId;
        this.responseCallback = callback;
    }

    /**
     * Clear pending task
     */
    clearPendingTask() {
        this.pendingTaskId = null;
        this.responseCallback = null;
    }

    /**
     * Prompt user to manually enter USSD response
     * This is a fallback until native modules are implemented
     */
    promptForResponse(taskId: string): Promise<string | null> {
        return new Promise((resolve) => {
            if (Platform.OS !== 'android') {
                resolve(null);
                return;
            }

            Alert.prompt(
                'USSD Response',
                'Please enter the USSD response you see on your screen:',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                        onPress: () => resolve(null)
                    },
                    {
                        text: 'Submit',
                        onPress: (response) => {
                            if (response && response.trim()) {
                                resolve(response.trim());
                            } else {
                                resolve(null);
                            }
                        }
                    }
                ],
                'plain-text'
            );
        });
    }

    /**
     * Capture response for the pending task
     */
    async captureResponse(taskId: string): Promise<UssdResponseData | null> {
        const rawResponse = await this.promptForResponse(taskId);

        if (!rawResponse) {
            return null;
        }

        const responseData: UssdResponseData = {
            taskId,
            rawResponse,
            timestamp: Date.now()
        };

        // Call the callback if set
        if (this.responseCallback && this.pendingTaskId === taskId) {
            this.responseCallback(responseData);
        }

        return responseData;
    }

    /**
     * Show a notification that response capture is available
     */
    showCaptureAvailable(taskId: string) {
        if (Platform.OS !== 'android') return;

        Alert.alert(
            'USSD Executed',
            'The USSD code has been dialed. After you see the response, you can capture it.',
            [
                {
                    text: 'Capture Response',
                    onPress: () => this.captureResponse(taskId)
                },
                {
                    text: 'Skip',
                    style: 'cancel'
                }
            ]
        );
    }
}

export default new UssdResponseCaptureService();
