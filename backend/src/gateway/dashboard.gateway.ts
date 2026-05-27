import {
  WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws',
})
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[WS] 클라이언트 연결: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[WS] 클라이언트 해제: ${client.id}`);
  }

  @OnEvent('subcontract.created')
  notifySubcontractCreated(payload: any) {
    this.server.emit('dashboard:refresh', { type: 'subcontract.created', ...payload });
  }

  @OnEvent('billing.approved')
  notifyBillingApproved(payload: any) {
    this.server.emit('dashboard:refresh', { type: 'billing.approved', ...payload });
  }

  @OnEvent('project.changed')
  notifyProjectChanged(payload: any) {
    this.server.emit('dashboard:refresh', { type: 'project.changed', ...payload });
  }
}
