// admin-notification-hub.service.ts
import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from './auth';
import { AdminNotificationsService } from './admin-notifications.service';
import { AdminNotificationDto } from '../models/admin-notification.model';

export interface AdminNotificationItem {
  id: string;          // string id for UI
  type: string;        // e.g. "bidder-created", "auction-status", etc.
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;

  affectedUserId?: number | null;
  auctionId?: number | null;
  inventoryAuctionId?: number | null;
}

const HUB_URL = 'http://localhost:5070/hubs/notifications';

@Injectable({ providedIn: 'root' })
export class AdminNotificationHubService {
  private auth = inject(AuthService);
  private api = inject(AdminNotificationsService);

  private hub?: signalR.HubConnection;
  private starting = false;

  private _connected$ = new BehaviorSubject<boolean>(false);
  connected$ = this._connected$.asObservable();

  private _notifications$ = new BehaviorSubject<AdminNotificationItem[]>([]);
  notifications$ = this._notifications$.asObservable();

  /** Call this when an admin logs in / layout loads. */
  init(): void {
    // clear state + stop any previous hub
    this.stop();

    if (!this.auth.isAuthenticated) {
      this._notifications$.next([]);
      return;
    }

    // 1) load existing notifications from API
    this.api.getAll().subscribe({
      next: dtos => {
        const items = (dtos || []).map(dto => this.mapDtoToItem(dto));
        const sorted = items.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        this._notifications$.next(sorted);
      },
      error: err => {
        console.error('[admin-notif] load failed', err);
        this._notifications$.next([]);
      }
    });

    // 2) start SignalR connection
    this.start();
  }

  private start(): void {
    if (this.hub || this.starting) return;
    this.starting = true;

    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => this.auth.token ?? '',
        transport:
          signalR.HttpTransportType.WebSockets |
          signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers(this.hub);

    this.hub
      .start()
      .then(() => {
        this._connected$.next(true);
      })
      .catch(err => {
        console.error('[admin-notif] SignalR start failed', err);
        this._connected$.next(false);
      })
      .finally(() => {
        this.starting = false;
      });
  }

  async stop(): Promise<void> {
    if (!this.hub) return;
    try {
      await this.hub.stop();
    } catch (e) {
      console.error('[admin-notif] stop failed', e);
    } finally {
      this.hub = undefined;
      this._connected$.next(false);
    }
  }

  /** Optimistic mark-all-read. */
  markAllAsRead(): void {
    const updated = this._notifications$.value.map(n => ({ ...n, read: true }));
    this._notifications$.next(updated);

    this.api.markAllRead().subscribe({
      error: err => console.error('[admin-notif] markAllRead failed', err)
    });
  }

  /** Optimistic clear-all. */
  clearAll(): void {
    this._notifications$.next([]);
    this.api.clearAll().subscribe({
      error: err => console.error('[admin-notif] clearAll failed', err)
    });
  }

  private registerHandlers(hub: signalR.HubConnection): void {
    // Server pushes admin notifications via this event
    hub.on('AdminNotificationCreated', (payload: AdminNotificationDto) => {
      console.log('[admin-notif] AdminNotificationCreated', payload);
      const note = this.mapDtoToItem(payload);
      this.addNotification(note);
    });

    hub.onreconnected(() => {
      console.log('[admin-notif] reconnected');
      this._connected$.next(true);
    });

    hub.onclose(() => {
      console.warn('[admin-notif] connection closed');
      this._connected$.next(false);
      this.hub = undefined;
    });
  }

  private addNotification(note: AdminNotificationItem): void {
    const current = this._notifications$.value;
    this._notifications$.next([note, ...current].slice(0, 50));
  }

  private mapDtoToItem(dto: AdminNotificationDto): AdminNotificationItem {
    const createdRaw =
      (dto as any).createdDate ??
      (dto as any).CreatedDate ??
      null;

    const createdAt = createdRaw ? new Date(createdRaw) : new Date();

    const idNumber =
      (dto as any).adminNotificationId ??
      (dto as any).AdminNotificationId ??
      undefined;

    const type =
      (dto as any).type ??
      (dto as any).Type ??
      '';

    const title =
      (dto as any).title ??
      (dto as any).Title ??
      '';

    const message =
      (dto as any).message ??
      (dto as any).Message ??
      '';

    const isRead =
      (dto as any).isRead ??
      (dto as any).IsRead ??
      false;

    const affectedUserId =
      (dto as any).affectedUserId ??
      (dto as any).AffectedUserId ??
      null;

    const auctionId =
      (dto as any).auctionId ??
      (dto as any).AuctionId ??
      null;

    const inventoryAuctionId =
      (dto as any).inventoryAuctionId ??
      (dto as any).InventoryAuctionId ??
      null;

    return {
      id:
        idNumber != null
          ? String(idNumber)
          : `admin-notif-${Date.now()}-${Math.random()}`,
      type: type || 'info',
      title,
      message,
      createdAt,
      read: !!isRead,
      affectedUserId:
        affectedUserId != null ? Number(affectedUserId) : null,
      auctionId: auctionId != null ? Number(auctionId) : null,
      inventoryAuctionId:
        inventoryAuctionId != null ? Number(inventoryAuctionId) : null
    };
  }
}
