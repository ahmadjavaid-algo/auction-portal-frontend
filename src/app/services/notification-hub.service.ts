import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

import { BidderAuthService } from './bidderauth';
import { FavouriteNotification } from '../models/favourite-notification.model';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from '../models/notification.model';

export type NotificationType =
  | 'favourite-added'
  | 'favourite-deactivated'
  | 'auction-starting-soon'
  | 'auction-started'
  | 'auction-ending-soon'
  | 'auction-ended'
  | 'bid-winning'
  | 'bid-outbid'
  | 'auction-won'
  | 'auction-lost';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: Date;
  read: boolean;

  auctionId?: number | null;
  inventoryAuctionId?: number | null;
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

  // 🔥 per-notification stream so pages can react to single new items
  private _stream$ = new Subject<NotificationItem>();
  stream$ = this._stream$.asObservable();

  /** Initialize hub + notification list for the given userId.
   *  Pass null when there is no logged-in bidder.
   */
  initForUser(userId: number | null): void {
    // stop previous connection (if any)
    this.stop();

    if (!userId) {
      this._notifications$.next([]);
      return;
    }

    // load existing notifications for this user
    this.api.getForCurrentUser().subscribe({
      next: dtos => {
        const items = (dtos || []).map(dto => this.mapDtoToItem(dto));
        const sorted = items.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        );
        this._notifications$.next(sorted);
      },
      error: err => {
        console.error('[notif] Failed to load notifications from server', err);
        this._notifications$.next([]);
      }
    });

    // start SignalR connection
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

  markAllAsRead(): void {
    const updated = this._notifications$.value.map(n => ({ ...n, read: true }));
    this._notifications$.next(updated);

    this.api.markAllRead().subscribe({
      next: _dtos => {
        // server state updated; nothing else to do here
      },
      error: err => {
        console.error('[notif] markAllRead failed', err);
      }
    });
  }

  clearAll(): void {
    this._notifications$.next([]);

    this.api.clearAll().subscribe({
      next: _dtos => {
        // server state updated; nothing else to do here
      },
      error: err => {
        console.error('[notif] clearAll failed', err);
      }
    });
  }

  private registerHandlers(hub: signalR.HubConnection): void {
    // Favourite added
    hub.on('FavouriteAdded', (payload: FavouriteNotification) => {
      console.log('[notif] FavouriteAdded', payload);
      const note = this.buildFavouriteAddedNotification(payload);
      this.addNotification(note);
    });

    // Favourite deactivated
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
        read: false,
        auctionId: payload.auctionId,
        inventoryAuctionId: payload.inventoryAuctionId
      };
      this.addNotification(note);
    });

    // Generic notifications (including bids / results)
    hub.on('NotificationCreated', (payload: NotificationDto) => {
      console.log('[notif] NotificationCreated', payload);
      const note = this.mapDtoToItem(payload);
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
      read: false,
      auctionId: payload.auctionId,
      inventoryAuctionId: payload.inventoryAuctionId
    };
  }

  private addNotification(note: NotificationItem): void {
    const current = this._notifications$.value;

    this._notifications$.next([note, ...current].slice(0, 50));

    // 🔥 emit this new notification to listeners (e.g. AuctionBid page)
    this._stream$.next(note);
  }

  private mapDtoToItem(dto: NotificationDto): NotificationItem {
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
          : `notif-${Date.now()}-${Math.random()}`,
      type: (typeRaw as NotificationType) || 'favourite-added',
      title,
      message,
      createdAt,
      read: !!isRead,
      auctionId: auctionId != null ? Number(auctionId) : null,
      inventoryAuctionId:
        inventoryAuctionId != null ? Number(inventoryAuctionId) : null
    };
  }
}
