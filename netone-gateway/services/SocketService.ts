// services/SocketService.ts

import { TaskResult, UssdTaskDetails } from '@/types/types';
import io, { Socket } from 'socket.io-client';

const SERVER_URL = 'http://192.168.1.113:3000'; 

class SocketService {
    public socket: Socket;

    constructor() {
        this.socket = io(SERVER_URL, { transports: ['websocket'] });
        this.socket.on('connect', () => console.log('Socket Connected'));
        this.socket.on('disconnect', () => console.log('Socket Disconnected'));
        this.socket.on('error', (err) => console.error('Socket Error:', err));
    }

    onNewTask(callback: (task: UssdTaskDetails) => void): void {
        this.socket.on('NEW_USSD_TASK', callback);
    }

    emitResult(result: TaskResult): void {
        this.socket.emit('TASK_RESULT', result);
    }
}

export default new SocketService();
