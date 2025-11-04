// notification-hub.service.ts
import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

import { BidderAuthService } from './bidderauth';
import { FavouriteNotification } from '../models/favourite-notification.model';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from '../models/notification.model';

export type NotificationType = 'favourite-added' | 'favourite-deactivated';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

const HUB_URL = 'http://localhost:5070/hubs/notifications';

@Injectable({ providedIn: 'root' })
export class NotificationHubService {
  private auth = inject(BidderAuthService);
  private api = inject(NotificationsService);

  private hub?: signalR.HubConnection;
  private starting = false;

  private _connected$ = new BehaviorSubject<boolean>(false);
  connected$ = this._connected$.asObservable();

  private _notifications$ = new BehaviorSubject<NotificationItem[]>([]);
  notifications$ = this._notifications$.asObservable();

  /** Initialize hub + notification list for the given userId.
   *  Pass null when there is no logged-in bidder.
   */
  initForUser(userId: number | null): void {
    // Stop any previous connection (fire & forget)
    this.stop();

    if (!userId) {
      this._notifications$.next([]);
      return;
    }

    // 1) Hydrate from server (Notification table)
    this.api.getForCurrentUser().subscribe({
      next: dtos => {
        const items = (dtos || []).map(dto => this.mapDtoToItem(dto));
        // newest first
        const sorted = items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        this._notifications$.next(sorted);
      },
      error: err => {
        console.error('[notif] Failed to load notifications from server', err);
        this._notifications$.next([]);
      }
    });

    // 2) Start SignalR for realtime updates
    this.start();
  }

  /** Start the SignalR connection (safe to call multiple times). */
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
        console.error('[notif] SignalR start failed', err);
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
      console.error('[notif] stop failed', e);
    } finally {
      this.hub = undefined;
      this._connected$.next(false);
    }
  }

  /** Mark all notifications as read (keeps them in the list + syncs with server). */
  markAllAsRead(): void {
    const updated = this._notifications$.value.map(n => ({ ...n, read: true }));
    this._notifications$.next(updated);

    this.api.markAllRead().subscribe({
      next: ok => {
        if (!ok) console.warn('[notif] markAllRead returned false');
      },
      error: err => {
        console.error('[notif] markAllRead failed', err);
        // optional: you could re-fetch from server here if you want to be strict
      }
    });
  }

  /** Remove all notifications from the list (and from server). */
  clearAll(): void {
    this._notifications$.next([]);

    this.api.clearAll().subscribe({
      next: ok => {
        if (!ok) console.warn('[notif] clearAll returned false');
      },
      error: err => {
        console.error('[notif] clearAll failed', err);
        // optional: re-hydrate from server if needed
      }
    });
  }

  /* ================= SignalR handlers ================= */

  private registerHandlers(hub: signalR.HubConnection): void {
    // When a favourite is added / re-activated
    hub.on('FavouriteAdded', (payload: FavouriteNotification) => {
      console.log('[notif] FavouriteAdded', payload);
      const note = this.buildFavouriteAddedNotification(payload);
      this.addNotification(note);
    });

    // When a favourite is deactivated
    hub.on('FavouriteDeactivated', (payload: FavouriteNotification) => {
      console.log('[notif] FavouriteDeactivated', payload);

      const lotLabel =
        payload.title?.trim() ||
        (payload.inventoryAuctionId != null
          ? `lot #${payload.inventoryAuctionId}`
          : 'this lot');

      const note: NotificationItem = {
        id: `fav-deact-${payload.favouriteId}-${Date.now()}`,
        type: 'favourite-deactivated',
        title: payload.title || 'Favourite removed',
        message: `You removed ${lotLabel} from your favourites.`,
        createdAt: new Date(),
        read: false
      };
      this.addNotification(note);
    });

    hub.onreconnected(() => {
      console.log('[notif] reconnected');
      this._connected$.next(true);
    });

    hub.onclose(() => {
      console.warn('[notif] connection closed');
      this._connected$.next(false);
      this.hub = undefined;
    });
  }

  private buildFavouriteAddedNotification(
    payload: FavouriteNotification
  ): NotificationItem {
    const start = payload.startEpochMsUtc ? new Date(payload.startEpochMsUtc) : null;
    const end = payload.endEpochMsUtc ? new Date(payload.endEpochMsUtc) : null;

    const lotLabel =
      payload.title?.trim() ||
      (payload.inventoryAuctionId != null
        ? `lot #${payload.inventoryAuctionId}`
        : 'a lot');

    let msg = `${lotLabel} has been added to your favourites.`;
    if (start && end) {
      msg += ` Auction runs ${start.toLocaleString()} → ${end.toLocaleString()}.`;
    } else if (start) {
      msg += ` Auction starts at ${start.toLocaleString()}.`;
    }

    return {
      id: `fav-add-${payload.favouriteId}-${Date.now()}`,
      type: 'favourite-added',
      title: payload.title || 'New favourite lot',
      message: msg,
      createdAt: new Date(),
      read: false
    };
  }

  private addNotification(note: NotificationItem): void {
    const current = this._notifications$.value;
    // newest first, cap list length to 50
    this._notifications$.next([note, ...current].slice(0, 50));
  }

  /* ================= Mapping helpers ================= */

  /** Map server NotificationDto → UI NotificationItem */
  private mapDtoToItem(dto: NotificationDto): NotificationItem {
    // Handle both camelCase and PascalCase from backend
    const createdRaw =
      (dto as any).createdDate ??
      (dto as any).CreatedDate ??
      null;

    const createdAt = createdRaw ? new Date(createdRaw) : new Date();

    const typeRaw =
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

    const idNumber =
      (dto as any).notificationId ??
      (dto as any).NotificationId ??
      undefined;

    return {
      id: idNumber != null ? String(idNumber) : `notif-${Date.now()}-${Math.random()}`,
      type: (typeRaw as NotificationType) || 'favourite-added',
      title,
      message,
      createdAt,
      read: !!isRead
    };
  }
}
