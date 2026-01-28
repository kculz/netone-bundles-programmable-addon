// services/SocketService.ts

import { TaskResult, UssdTaskDetails, TaskProgress, TaskError, ConfirmationRequest } from '@/types/types';
import io, { Socket } from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.113:3000'; 

class SocketService {
    public socket: Socket;

    constructor() {
        this.socket = io(SERVER_URL, { 
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });
        
        this.socket.on('connect', () => {
            console.log('Socket Connected to Bridge Server');
            console.log('Socket ID:', this.socket.id);
        });
        
        this.socket.on('disconnect', () => {
            console.log('Socket Disconnected from Bridge Server');
        });
        
        this.socket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err.message);
        });
        
        this.socket.on('error', (err) => {
            console.error('Socket Error:', err);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            console.log('Socket Reconnected after', attemptNumber, 'attempts');
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
            console.log('Socket Reconnection Attempt:', attemptNumber);
        });

        this.socket.on('reconnect_failed', () => {
            console.error('Socket Reconnection Failed');
        });
    }

    onNewTask(callback: (task: UssdTaskDetails) => void): void {
        this.socket.on('NEW_USSD_TASK', callback);
    }

    emitResult(result: TaskResult): void {
        console.log('Emitting TASK_RESULT:', result);
        this.socket.emit('TASK_RESULT', result);
    }

    emitProgress(progress: TaskProgress): void {
        console.log('Emitting TASK_PROGRESS:', progress);
        this.socket.emit('TASK_PROGRESS', progress);
    }

    emitError(error: TaskError): void {
        console.log('Emitting TASK_ERROR:', error);
        this.socket.emit('TASK_ERROR', error);
    }

    emitConfirmationRequest(request: ConfirmationRequest): void {
        console.log('Emitting REQUEST_CONFIRMATION:', request);
        this.socket.emit('REQUEST_CONFIRMATION', request);
    }

    disconnect(): void {
        this.socket.disconnect();
    }

    connect(): void {
        this.socket.connect();
    }

    isConnected(): boolean {
        return this.socket.connected;
    }
}

export default new SocketService();