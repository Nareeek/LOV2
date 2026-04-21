import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    credentials: true,
  },
})
export class NotificationsGateway {
  @WebSocketServer()
  private server?: Server;

  emitCharacterEvent(characterId: string, type: string, payload: unknown) {
    this.server?.to(`character:${characterId}`).emit(type, payload);
  }
}

