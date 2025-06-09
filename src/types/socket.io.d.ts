import { Socket } from 'socket.io';

declare module 'socket.io' {
    interface Socket {
        gameId: string;
        username: string;
        host: boolean;
        uuid: string;
    }
}