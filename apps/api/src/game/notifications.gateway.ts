import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import { resolveCorsOrigin } from '../runtime-config.js';

@WebSocketGateway({
  namespace: '/events',
  cors: {
    origin: resolveCorsOrigin(process.env),
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
