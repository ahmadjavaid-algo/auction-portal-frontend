import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../../services/auth';
import { MakesService } from '../../../../services/makes.service';
import { ModelsService } from '../../../../services/models.service';
import { YearsService } from '../../../../services/years.service';
import { CategorysService } from '../../../../services/categories.service';

import { Make } from '../../../../models/make.model';
import { Model } from '../../../../models/model.model';
import { Year } from '../../../../models/year.model';
import { Category } from '../../../../models/category.model';

import { MakesForm, MakeFormResult } from '../makes-form/makes-form';
import { ModelsForm, ModelFormResult } from '../models-form/models-form';
import { YearsForm, YearFormResult } from '../years-form/years-form';
import { CategoriesForm, CategoryFormResult } from '../categories-form/categories-form';

type Section = 'make' | 'model' | 'year' | 'category';

@Component({
  selector: 'app-mmyc-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './makes-models-years-categories-list.html',
  styleUrls: ['./makes-models-years-categories-list.scss']
})
export class MakesModelsYearsCategoriesList implements OnInit, AfterViewInit, OnDestroy {
  private makesSvc = inject(MakesService);
  private modelsSvc = inject(ModelsService);
  private yearsSvc = inject(YearsService);
  private catsSvc = inject(CategorysService);

  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private auth = inject(AuthService);
  private host = inject(ElementRef<HTMLElement>);

  section: Section = 'make';

  makes = new MatTableDataSource<Make>([]);
  models = new MatTableDataSource<Model>([]);
  years = new MatTableDataSource<Year>([]);
  cats = new MatTableDataSource<Category>([]);

  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;
  searchTerm = '';

  // Stats
  stats = { total: 0, active: 0, inactive: 0, parentsDistinct: 0 };

  // Animated stats values (match UsersList behavior)
  animatedStats = {
    total: 0,
    active: 0,
    inactive: 0,
    parentsDistinct: 0
  };

  private intersectionObserver?: IntersectionObserver;
  private animationFrames: number[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // Columns (match UsersList pattern)
  get displayedColumns(): string[] {
    // parent column only for model/year/category
    if (this.section === 'make') return ['name', 'status', 'actions'];
    return ['parent', 'name', 'status', 'actions'];
  }

  ngOnInit(): void {
    this.loadAll();
    this.attachFilters();
    this.updateTotalsAndStats(); // initial
  }

  ngAfterViewInit(): void {
    this.applyPaginatorToActive();
    this.initScrollReveal();
    this.updateTotalsAndStats();
  }

  ngOnDestroy(): void {
    this.intersectionObserver?.disconnect();
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
  }

  // ---------------------------
  // UI Copy (Hero)
  // ---------------------------
  get heroTitle(): string {
    return 'Taxonomy Management';
  }

  get heroDescription(): string {
    return 'Manage vehicle makes, models, years, and categories used across your auction inventory.';
  }

  get addBtnText(): string {
    return `Add New ${this.sectionSingular}`;
  }

  get sectionSingular(): string {
    switch (this.section) {
      case 'make': return 'Make';
      case 'model': return 'Model';
      case 'year': return 'Year';
      case 'category': return 'Category';
    }
  }

  get sectionTitle(): string {
    switch (this.section) {
      case 'make': return 'Makes';
      case 'model': return 'Models';
      case 'year': return 'Years';
      case 'category': return 'Categories';
    }
  }

  get sectionIcon(): string {
    switch (this.section) {
      case 'make': return 'directions_car';
      case 'model': return 'view_in_ar';
      case 'year': return 'calendar_today';
      case 'category': return 'category';
    }
  }

  get parentLabel(): string {
    switch (this.section) {
      case 'make': return 'Distinct Parents';
      case 'model': return 'Distinct Makes';
      case 'year': return 'Distinct Models';
      case 'category': return 'Distinct Years';
    }
  }

  get parentHeaderIcon(): string {
    switch (this.section) {
      case 'model': return 'directions_car';
      case 'year': return 'view_in_ar';
      case 'category': return 'calendar_today';
      default: return 'hub';
    }
  }

  get parentHeaderText(): string {
    switch (this.section) {
      case 'model': return 'Make';
      case 'year': return 'Model';
      case 'category': return 'Year';
      default: return 'Parent';
    }
  }

  get nameHeaderText(): string {
    switch (this.section) {
      case 'make': return 'Make';
      case 'model': return 'Model';
      case 'year': return 'Year';
      case 'category': return 'Category';
    }
  }

  // ---------------------------
  // Reveal Animations (same as UsersList)
  // ---------------------------
  private initScrollReveal(): void {
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            this.intersectionObserver?.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    setTimeout(() => {
      const elements = document.querySelectorAll('.reveal-on-scroll');
      elements.forEach((el) => this.intersectionObserver?.observe(el));
    }, 100);
  }

  // ---------------------------
  // Data loading
  // ---------------------------
  private loadAll(): void {
    this.reloadMakes();
    this.reloadModels();
    this.reloadYears();
    this.reloadCats();
  }

  private reloadMakes(): void {
    this.makesSvc.getList().subscribe({
      next: list => {
        this.makes.data = list ?? [];
        this.updateTotalsIfActive('make');
      },
      error: () => this.snack.open('Failed to load makes.', 'Dismiss', { duration: 2500 })
    });
  }

  private reloadModels(): void {
    this.modelsSvc.getList().subscribe({
      next: list => {
        this.models.data = list ?? [];
        this.updateTotalsIfActive('model');
      },
      error: () => this.snack.open('Failed to load models.', 'Dismiss', { duration: 2500 })
    });
  }

  private reloadYears(): void {
    this.yearsSvc.getList().subscribe({
      next: list => {
        this.years.data = list ?? [];
        this.updateTotalsIfActive('year');
      },
      error: () => this.snack.open('Failed to load years.', 'Dismiss', { duration: 2500 })
    });
  }

  private reloadCats(): void {
    this.catsSvc.getList().subscribe({
      next: list => {
        this.cats.data = list ?? [];
        this.updateTotalsIfActive('category');
      },
      error: () => this.snack.open('Failed to load categories.', 'Dismiss', { duration: 2500 })
    });
  }

  // ---------------------------
  // Filtering (safe: TS can use "as any", template will not)
  // ---------------------------
  private attachFilters(): void {
    this.makes.filterPredicate = (e, f) => ((e.makeName ?? '') + '').toLowerCase().includes(f);

    this.models.filterPredicate = (e, f) => {
      const anyE = e as any;
      const hay = [e.modelName ?? '', anyE.makeName ?? ''].join(' ').toLowerCase();
      return hay.includes(f);
    };

    this.years.filterPredicate = (e, f) => {
      const anyE = e as any;
      const hay = [e.yearName ?? '', anyE.modelName ?? ''].join(' ').toLowerCase();
      return hay.includes(f);
    };

    this.cats.filterPredicate = (e, f) => {
      const anyE = e as any;
      const hay = [e.categoryName ?? '', anyE.yearName ?? ''].join(' ').toLowerCase();
      return hay.includes(f);
    };
  }

  // ---------------------------
  // Active datasource helpers
  // ---------------------------
  get activeDS(): MatTableDataSource<any> {
    switch (this.section) {
      case 'make': return this.makes;
      case 'model': return this.models;
      case 'year': return this.years;
      case 'category': return this.cats;
    }
  }

  private applyPaginatorToActive(): void {
    if (this.paginator) this.activeDS.paginator = this.paginator;
  }

  onSectionChange(value: Section): void {
    this.section = value;
    this.applyPaginatorToActive();
    this.onSearch();
  }

  onSearch(): void {
    const f = this.searchTerm.trim().toLowerCase();
    this.activeDS.filter = f;
    this.paginator?.firstPage();
    this.pageIndex = 0;
    this.updateTotalsAndStats();
  }

  onPageChange(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.updateTotalsAndStats();
  }

  private updateTotalsIfActive(s: Section): void {
    if (this.section === s) this.updateTotalsAndStats();
  }

  private updateTotalsAndStats(): void {
    const src = this.activeDS.filter ? this.activeDS.filteredData : this.activeDS.data;

    const total = src.length;
    const active = src.filter((x: any) => x.active === true).length;
    const inactive = total - active;

    let parentsDistinct = 0;
    if (this.section === 'model') parentsDistinct = new Set(src.map((r: any) => r.makeId)).size;
    if (this.section === 'year') parentsDistinct = new Set(src.map((r: any) => r.modelId)).size;
    if (this.section === 'category') parentsDistinct = new Set(src.map((r: any) => r.yearId)).size;

    this.totalItems = total;
    this.stats = { total, active, inactive, parentsDistinct };
    this.animateStats();
  }

  private animateStats(): void {
    // cancel older animations
    this.animationFrames.forEach(id => cancelAnimationFrame(id));
    this.animationFrames = [];

    const duration = 1500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      this.animatedStats.total = Math.floor(this.stats.total * eased);
      this.animatedStats.active = Math.floor(this.stats.active * eased);
      this.animatedStats.inactive = Math.floor(this.stats.inactive * eased);
      this.animatedStats.parentsDistinct = Math.floor(this.stats.parentsDistinct * eased);

      if (progress < 1) {
        const frameId = requestAnimationFrame(animate);
        this.animationFrames.push(frameId);
      }
    };

    const frameId = requestAnimationFrame(animate);
    this.animationFrames.push(frameId);
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }

  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ---------------------------
  // Row rendering helpers (safe in TS, no template casting)
  // ---------------------------
  getEntityName(row: any): string {
    if (!row) return '—';
    switch (this.section) {
      case 'make': return row.makeName ?? '—';
      case 'model': return row.modelName ?? '—';
      case 'year': return row.yearName ?? '—';
      case 'category': return row.categoryName ?? '—';
    }
  }

  getEntityId(row: any): number | string {
    if (!row) return '—';
    switch (this.section) {
      case 'make': return row.makeId ?? '—';
      case 'model': return row.modelId ?? '—';
      case 'year': return row.yearId ?? '—';
      case 'category': return row.categoryId ?? '—';
    }
  }

  getParentName(row: any): string {
    if (!row) return '—';
    const anyRow = row as any;
    switch (this.section) {
      case 'model': return anyRow.makeName ?? '—';
      case 'year': return anyRow.modelName ?? '—';
      case 'category': return anyRow.yearName ?? '—';
      default: return '—';
    }
  }

  getParentId(row: any): number | string {
    if (!row) return '—';
    switch (this.section) {
      case 'model': return row.makeId ?? '—';
      case 'year': return row.modelId ?? '—';
      case 'category': return row.yearId ?? '—';
      default: return '—';
    }
  }

  // ---------------------------
  // CRUD actions (unchanged behavior, just polished messages)
  // ---------------------------
  openCreate(): void {
    if (this.section === 'make') {
      const ref = this.dialog.open<
        MakesForm,
        { mode: 'create'; initialData?: Make | null },
        MakeFormResult
      >(MakesForm, { width: '520px', data: { mode: 'create', initialData: null } });

      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.makesSvc.add(res.payload).subscribe({
          next: (newId) => {
            this.snack.open(`Make created successfully (ID ${newId}).`, 'OK', { duration: 2200 });
            this.reloadMakes();
          },
          error: () => this.snack.open('Failed to create Make.', 'Dismiss', { duration: 2800 })
        });
      });
      return;
    }

    if (this.section === 'model') {
      const ref = this.dialog.open<
        ModelsForm,
        { mode: 'create'; initialData?: Model | null },
        ModelFormResult
      >(ModelsForm, { width: '560px', data: { mode: 'create', initialData: null } });

      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.modelsSvc.add(res.payload).subscribe({
          next: (newId) => {
            this.snack.open(`Model created successfully (ID ${newId}).`, 'OK', { duration: 2200 });
            this.reloadModels();
          },
          error: () => this.snack.open('Failed to create Model.', 'Dismiss', { duration: 2800 })
        });
      });
      return;
    }

    if (this.section === 'year') {
      const ref = this.dialog.open<
        YearsForm,
        { mode: 'create'; initialData?: Year | null },
        YearFormResult
      >(YearsForm, { width: '560px', data: { mode: 'create', initialData: null } });

      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.yearsSvc.add(res.payload).subscribe({
          next: (newId) => {
            this.snack.open(`Year created successfully (ID ${newId}).`, 'OK', { duration: 2200 });
            this.reloadYears();
          },
          error: () => this.snack.open('Failed to create Year.', 'Dismiss', { duration: 2800 })
        });
      });
      return;
    }

    if (this.section === 'category') {
      const ref = this.dialog.open<
        CategoriesForm,
        { mode: 'create'; initialData?: Category | null },
        CategoryFormResult
      >(CategoriesForm, { width: '560px', data: { mode: 'create', initialData: null } });

      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.catsSvc.add(res.payload).subscribe({
          next: (newId) => {
            this.snack.open(`Category created successfully (ID ${newId}).`, 'OK', { duration: 2200 });
            this.reloadCats();
          },
          error: () => this.snack.open('Failed to create Category.', 'Dismiss', { duration: 2800 })
        });
      });
    }
  }

  editRow(row: any): void {
    if (this.section === 'make') {
      this.makesSvc.getById(row.makeId).subscribe({
        next: (full) => {
          const ref = this.dialog.open<
            MakesForm,
            { mode: 'edit'; initialData: Make },
            MakeFormResult
          >(MakesForm, { width: '520px', data: { mode: 'edit', initialData: full } });

          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.makesSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Make updated successfully.' : 'Update failed.', 'OK', { duration: 2200 });
                if (ok) this.reloadMakes();
              },
              error: () => this.snack.open('Failed to update Make.', 'Dismiss', { duration: 2800 })
            });
          });
        },
        error: () => this.snack.open('Failed to load Make for edit.', 'Dismiss', { duration: 2800 })
      });
      return;
    }

    if (this.section === 'model') {
      this.modelsSvc.getById(row.modelId).subscribe({
        next: (full) => {
          const ref = this.dialog.open<
            ModelsForm,
            { mode: 'edit'; initialData: Model },
            ModelFormResult
          >(ModelsForm, { width: '560px', data: { mode: 'edit', initialData: full } });

          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.modelsSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Model updated successfully.' : 'Update failed.', 'OK', { duration: 2200 });
                if (ok) this.reloadModels();
              },
              error: () => this.snack.open('Failed to update Model.', 'Dismiss', { duration: 2800 })
            });
          });
        },
        error: () => this.snack.open('Failed to load Model for edit.', 'Dismiss', { duration: 2800 })
      });
      return;
    }

    if (this.section === 'year') {
      this.yearsSvc.getById(row.yearId).subscribe({
        next: (full) => {
          const ref = this.dialog.open<
            YearsForm,
            { mode: 'edit'; initialData: Year },
            YearFormResult
          >(YearsForm, { width: '560px', data: { mode: 'edit', initialData: full } });

          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.yearsSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Year updated successfully.' : 'Update failed.', 'OK', { duration: 2200 });
                if (ok) this.reloadYears();
              },
              error: () => this.snack.open('Failed to update Year.', 'Dismiss', { duration: 2800 })
            });
          });
        },
        error: () => this.snack.open('Failed to load Year for edit.', 'Dismiss', { duration: 2800 })
      });
      return;
    }

    if (this.section === 'category') {
      this.catsSvc.getById(row.categoryId).subscribe({
        next: (full) => {
          const ref = this.dialog.open<
            CategoriesForm,
            { mode: 'edit'; initialData: Category },
            CategoryFormResult
          >(CategoriesForm, { width: '560px', data: { mode: 'edit', initialData: full } });

          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.catsSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Category updated successfully.' : 'Update failed.', 'OK', { duration: 2200 });
                if (ok) this.reloadCats();
              },
              error: () => this.snack.open('Failed to update Category.', 'Dismiss', { duration: 2800 })
            });
          });
        },
        error: () => this.snack.open('Failed to load Category for edit.', 'Dismiss', { duration: 2800 })
      });
    }
  }

  toggleActive(row: any): void {
    const newState = !(row.active ?? false);
    const modifiedById = this.auth.currentUser?.userId ?? null;

    switch (this.section) {
      case 'make':
        this.makesSvc.activate({ MakeId: row.makeId, Active: newState, ModifiedById: modifiedById }).subscribe({
          next: ok => this.afterToggle(ok, row, newState),
          error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 2500 })
        });
        break;

      case 'model':
        this.modelsSvc.activate({ ModelId: row.modelId, Active: newState, ModifiedById: modifiedById } as any).subscribe({
          next: ok => this.afterToggle(ok, row, newState),
          error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 2500 })
        });
        break;

      case 'year':
        this.yearsSvc.activate({ YearId: row.yearId, Active: newState, ModifiedById: modifiedById } as any).subscribe({
          next: ok => this.afterToggle(ok, row, newState),
          error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 2500 })
        });
        break;

      case 'category':
        this.catsSvc.activate({ CategoryId: row.categoryId, Active: newState, ModifiedById: modifiedById } as any).subscribe({
          next: ok => this.afterToggle(ok, row, newState),
          error: () => this.snack.open('Failed to change status.', 'Dismiss', { duration: 2500 })
        });
        break;
    }
  }

  private afterToggle(ok: boolean, row: any, newState: boolean): void {
    if (ok) {
      row.active = newState;
      this.snack.open(`Record ${newState ? 'activated' : 'deactivated'} successfully.`, 'OK', { duration: 1800 });
      this.updateTotalsAndStats();
    } else {
      this.snack.open('Failed to change status.', 'Dismiss', { duration: 2500 });
    }
  }
}
