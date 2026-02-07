// hooks/useSocketGatewayWithCapture.ts

import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import socketService from '../services/SocketService';
import { initiateUssdDial } from '../services/UssdAutomation';
import { UssdTaskDetails } from '@/types/types';
import { addTask, updateTaskStatus } from '@/store/slices/tasksSlice';

interface ResponseCaptureState {
    visible: boolean;
    taskId: string;
    taskDescription: string;
}

export const useSocketGatewayWithCapture = () => {
    const dispatch = useDispatch();
    const [responseCaptureState, setResponseCaptureState] = useState<ResponseCaptureState>({
        visible: false,
        taskId: '',
        taskDescription: ''
    });

    const handleResponseSubmit = (rawResponse: string) => {
        const { taskId } = responseCaptureState;
        console.log(`Response captured for task ${taskId}:`, rawResponse);

        // Send response to backend with rawResponse field
        socketService.emitResult({
            taskId,
            status: 'COMPLETED',
            message: 'USSD response captured',
            rawResponse // This will be parsed by backend
        });

        // Update Redux state
        dispatch(updateTaskStatus({
            taskId,
            status: 'COMPLETED',
            message: 'Response captured and sent to backend'
        }));

        // Hide modal
        setResponseCaptureState({ visible: false, taskId: '', taskDescription: '' });
    };

    const handleResponseSkip = () => {
        const { taskId } = responseCaptureState;
        console.log(`Response capture skipped for task ${taskId}`);

        // Send completion without response
        socketService.emitResult({
            taskId,
            status: 'COMPLETED',
            message: 'USSD executed (response not captured)'
        });

        // Update Redux state
        dispatch(updateTaskStatus({
            taskId,
            status: 'COMPLETED',
            message: 'USSD executed'
        }));

        // Hide modal
        setResponseCaptureState({ visible: false, taskId: '', taskDescription: '' });
    };

    useEffect(() => {
        const handleNewTask = async (taskData: UssdTaskDetails) => {
            console.log("Processing task:", taskData.taskId);

            // Add to Redux Store
            dispatch(addTask({
                taskId: taskData.taskId,
                status: 'PROCESSING',
                description: taskData.description || `Bundle: ${taskData.bundleType}`,
                message: 'Starting USSD execution...',
                timestamp: Date.now()
            }));

            try {
                // Send progress update - task received
                socketService.emitProgress({
                    taskId: taskData.taskId,
                    step: 0,
                    message: 'Task received, checking permissions'
                });

                // Define progress callback for step-by-step updates
                const onProgress = (step: number, total: number, message: string) => {
                    console.log(`Task ${taskData.taskId} - Step ${step}/${total}: ${message}`);

                    // Emit progress to backend
                    socketService.emitProgress({
                        taskId: taskData.taskId,
                        step: step,
                        message: message
                    });

                    // Update Redux state
                    dispatch(updateTaskStatus({
                        taskId: taskData.taskId,
                        status: 'PROCESSING',
                        message: `Step ${step}/${total}: ${message}`
                    }));
                };

                // Initiate USSD dial with sequential execution (visible on screen)
                const result = await initiateUssdDial(taskData, onProgress);

                if (!result.success) {
                    // Send error if dial failed
                    socketService.emitError({
                        taskId: taskData.taskId,
                        error: result.message,
                        step: result.currentStep || 0
                    });

                    dispatch(updateTaskStatus({
                        taskId: taskData.taskId,
                        status: 'FAILED',
                        message: result.message
                    }));
                    return;
                }

                // USSD execution completed - show response capture modal
                dispatch(updateTaskStatus({
                    taskId: taskData.taskId,
                    status: 'PROCESSING',
                    message: 'USSD executed, please capture the response...'
                }));

                // Show response capture modal after a delay to let user see USSD response
                const delay = taskData.waitForConfirmation ? 3000 : 2000;
                setTimeout(() => {
                    setResponseCaptureState({
                        visible: true,
                        taskId: taskData.taskId,
                        taskDescription: taskData.description || `${taskData.bundleType} - ${taskData.bundleId}`
                    });
                }, delay);

            } catch (error: any) {
                console.error("Error processing task:", error);
                const errorMsg = error.message || 'Unknown error occurred';

                socketService.emitError({
                    taskId: taskData.taskId,
                    error: errorMsg,
                    step: 0
                });

                dispatch(updateTaskStatus({
                    taskId: taskData.taskId,
                    status: 'FAILED',
                    message: errorMsg
                }));
            }
        };

        // Attach the typed listener
        socketService.onNewTask(handleNewTask);

        return () => {
            // Cleanup listener on unmount
            socketService.socket.off('NEW_USSD_TASK', handleNewTask);
        };
    }, [dispatch]);

    return {
        responseCaptureState,
        handleResponseSubmit,
        handleResponseSkip
    };
};
