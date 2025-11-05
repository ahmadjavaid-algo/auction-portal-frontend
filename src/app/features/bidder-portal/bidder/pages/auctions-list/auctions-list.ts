import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { Auction } from '../../../../../models/auction.model';
import { InventoryAuction } from '../../../../../models/inventoryauction.model';
import { InventoryDocumentFile } from '../../../../../models/inventorydocumentfile.model';

import { AuctionService } from '../../../../../services/auctions.service';
import { InventoryAuctionService } from '../../../../../services/inventoryauctions.service';
import { InventoryDocumentFileService } from '../../../../../services/inventorydocumentfile.service';

import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

type AuctionCard = {
  auction: Auction;
  coverUrl: string;              
  lots: number;                  
  start?: Date | null;
  end?: Date | null;
  status?: string | null;
};

@Component({
  selector: 'app-auctions-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './auctions-list.html',
  styleUrls: ['./auctions-list.scss']
})
export class AuctionsList {
  private auctionsSvc = inject(AuctionService);
  private invAucSvc   = inject(InventoryAuctionService);
  private filesSvc    = inject(InventoryDocumentFileService);

  loading = true;
  error: string | null = null;

  cards: AuctionCard[] = [];

  
  private fallback =
    'https://images.unsplash.com/photo-1517940310602-75e447f00b52?q=80&w=1200&auto=format&fit=crop';

  ngOnInit(): void {
    this.loading = true;

    forkJoin({
      auctions: this.auctionsSvc.getList().pipe(catchError(() => of([] as Auction[]))),
      invAucs : this.invAucSvc.getList().pipe(catchError(() => of([] as InventoryAuction[]))),
      files   : this.filesSvc.getList().pipe(catchError(() => of([] as InventoryDocumentFile[])))
    })
    .pipe(
      map(({ auctions, invAucs, files }) => {
        const activeAuctions = (auctions || []).filter(a => a.active ?? true);

        
        const byAuction = new Map<number, number[]>();
        (invAucs || []).forEach(ia => {
          const aid = (ia as any).auctionId as number;
          if (!aid) return;
          const list = byAuction.get(aid) || [];
          list.push(ia.inventoryId);
          byAuction.set(aid, list);
        });

        
        const imageMap = this.buildImagesMap(files);

        
        const cards: AuctionCard[] = activeAuctions
          .sort((a, b) => this.dateDesc(a.createdDate || a.modifiedDate, b.createdDate || b.modifiedDate))
          .map(a => {
            const invIds = byAuction.get(a.auctionId) || [];
            const allImages = invIds.flatMap(id => imageMap.get(id) || []);
            const cover = this.pickRandom(allImages) || this.fallback;

            return {
              auction: a,
              coverUrl: cover,
              lots: invIds.length,
              start: a.startDateTime ? new Date(a.startDateTime) : null,
              end: a.endDateTime ? new Date(a.endDateTime) : null,
              status: a.auctionStatusName || a.auctionStatusCode || null
            };
          });

        return cards;
      })
    )
    .subscribe({
      next: cards => { this.cards = cards; this.loading = false; },
      error: () => { this.error = 'Failed to load auctions.'; this.loading = false; }
    });
  }

  

  private buildImagesMap(files: InventoryDocumentFile[]): Map<number, string[]> {
    const m = new Map<number, string[]>();
    const isImage = (url?: string | null, name?: string | null) => {
      const s = (url || name || '').toLowerCase();
      return ['.jpg', '.jpeg', '.png', 'jpg', 'jpeg', 'png'].some(x => s.endsWith(x));
    };

    (files || [])
      .filter(f => (f.active ?? true) && !!f.inventoryId && !!f.documentUrl && isImage(f.documentUrl!, f.documentName))
      .forEach(f => {
        const list = m.get(f.inventoryId) || [];
        list.push(f.documentUrl!);
        m.set(f.inventoryId, list);
      });

    return m;
  }

  private pickRandom(arr: string[]): string | undefined {
    if (!arr?.length) return undefined;
    const i = Math.floor(Math.random() * arr.length);
    return arr[i];
    }

  private dateDesc(a?: string | null, b?: string | null): number {
    const ta = a ? Date.parse(a) : 0;
    const tb = b ? Date.parse(b) : 0;
    return tb - ta;
  }

  formatRange(s?: Date | null, e?: Date | null): string {
    const a = s ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(s) : '—';
    const b = e ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(e) : '—';
    return `${a} → ${b}`;
  }
}
