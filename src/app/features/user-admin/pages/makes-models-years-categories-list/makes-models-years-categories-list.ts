import { Component, ViewChild, inject } from '@angular/core';
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
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { AuthService } from '../../../../services/auth';
import { MakesService } from '../../../../services/makes.service';
import { ModelsService } from '../../../../services/models.service';
import { YearsService } from '../../../../services/years.service';
import { CategorysService } from '../../../../services/categories.service';

import { Make } from '../../../../models/make.model';
import { Model } from '../../../../models/model.model';
import { Year } from '../../../../models/year.model';
import { Category } from '../../../../models/category.model';

/* Forms (standalone dialogs) */
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
    MatButtonToggleModule
  ],
  templateUrl: './makes-models-years-categories-list.html',
  styleUrls: ['./makes-models-years-categories-list.scss']
})
export class MakesModelsYearsCategoriesList {
  private makesSvc = inject(MakesService);
  private modelsSvc = inject(ModelsService);
  private yearsSvc = inject(YearsService);
  private catsSvc  = inject(CategorysService);

  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private auth   = inject(AuthService);

  section: Section = 'make';

  // Data sources for each table
  makes   = new MatTableDataSource<Make>([]);
  models  = new MatTableDataSource<Model>([]);
  years   = new MatTableDataSource<Year>([]);
  cats    = new MatTableDataSource<Category>([]);

  // Columns per table
  colsMake     = ['name', 'status', 'actions'];
  colsModel    = ['make', 'name', 'status', 'actions'];
  colsYear     = ['model', 'name', 'status', 'actions'];
  colsCategory = ['year', 'name', 'status', 'actions'];

  // Search + pagination
  searchTerm = '';
  pageSize = 10;
  pageIndex = 0;
  totalItems = 0;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  ngOnInit(): void {
    this.loadAll();
    this.attachFilters();
  }

  ngAfterViewInit(): void {
    this.applyPaginatorToActive();
    this.updateTotals();
  }

  // ---- Loaders ----
  private loadAll(): void {
    this.reloadMakes();
    this.reloadModels();
    this.reloadYears();
    this.reloadCats();
  }

  private reloadMakes(): void {
    this.makesSvc.getList().subscribe({
      next: list => { this.makes.data = list ?? []; this.updateTotalsIfActive('make'); },
      error: () => this.snack.open('Failed to load makes.', 'Dismiss', { duration: 2500 })
    });
  }

  private reloadModels(): void {
    this.modelsSvc.getList().subscribe({
      next: list => { this.models.data = list ?? []; this.updateTotalsIfActive('model'); },
      error: () => this.snack.open('Failed to load models.', 'Dismiss', { duration: 2500 })
    });
  }

  private reloadYears(): void {
    this.yearsSvc.getList().subscribe({
      next: list => { this.years.data = list ?? []; this.updateTotalsIfActive('year'); },
      error: () => this.snack.open('Failed to load years.', 'Dismiss', { duration: 2500 })
    });
  }

  private reloadCats(): void {
    this.catsSvc.getList().subscribe({
      next: list => { this.cats.data = list ?? []; this.updateTotalsIfActive('category'); },
      error: () => this.snack.open('Failed to load categories.', 'Dismiss', { duration: 2500 })
    });
  }

  private attachFilters(): void {
    this.makes.filterPredicate  = (e, f) => (e.makeName ?? '').toLowerCase().includes(f);
    this.models.filterPredicate = (e, f) => {
      const hay = [e.modelName ?? '', (e as any).makeName ?? ''].join(' ').toLowerCase();
      return hay.includes(f);
    };
    this.years.filterPredicate = (e, f) => {
      const hay = [e.yearName ?? '', (e as any).modelName ?? ''].join(' ').toLowerCase();
      return hay.includes(f);
    };
    this.cats.filterPredicate = (e, f) => {
      const hay = [e.categoryName ?? '', (e as any).yearName ?? ''].join(' ').toLowerCase();
      return hay.includes(f);
    };
  }

  // ---- UI helpers ----
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
    this.updateTotals();
  }

  onPageChange(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.updateTotals();
  }

  get activeDS(): MatTableDataSource<any> {
    switch (this.section) {
      case 'make': return this.makes;
      case 'model': return this.models;
      case 'year': return this.years;
      case 'category': return this.cats;
    }
  }

  get activeColumns(): string[] {
    switch (this.section) {
      case 'make': return this.colsMake;
      case 'model': return this.colsModel;
      case 'year': return this.colsYear;
      case 'category': return this.colsCategory;
    }
  }

  private applyPaginatorToActive(): void {
    if (this.paginator) this.activeDS.paginator = this.paginator;
  }

  private updateTotals(): void {
    this.totalItems = this.activeDS.filter ? this.activeDS.filteredData.length : this.activeDS.data.length;
  }

  private updateTotalsIfActive(s: Section): void {
    if (this.section === s) this.updateTotals();
  }

  get rangeStart(): number {
    if (!this.totalItems) return 0;
    return this.pageIndex * this.pageSize + 1;
  }
  get rangeEnd(): number {
    return Math.min(this.totalItems, (this.pageIndex + 1) * this.pageSize);
  }

  // ---- Actions ----
  /** Open Create dialog for the current section (Make/Model/Year/Category wired). */
  openCreate(): void {
    if (this.section === 'make') {
      const ref = this.dialog.open<MakesForm, { mode: 'create'; initialData?: Make | null }, MakeFormResult>(
        MakesForm,
        { width: '520px', data: { mode: 'create', initialData: null } }
      );
      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.makesSvc.add(res.payload).subscribe({
          next: (newId) => { this.snack.open(`Make created (ID ${newId}).`, 'OK', { duration: 2200 }); this.reloadMakes(); },
          error: () => this.snack.open('Failed to create Make.', 'Dismiss', { duration: 2800 })
        });
      });
      return;
    }

    if (this.section === 'model') {
      const ref = this.dialog.open<ModelsForm, { mode: 'create'; initialData?: Model | null }, ModelFormResult>(
        ModelsForm,
        { width: '560px', data: { mode: 'create', initialData: null } }
      );
      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.modelsSvc.add(res.payload).subscribe({
          next: (newId) => { this.snack.open(`Model created (ID ${newId}).`, 'OK', { duration: 2200 }); this.reloadModels(); },
          error: () => this.snack.open('Failed to create Model.', 'Dismiss', { duration: 2800 })
        });
      });
      return;
    }

    if (this.section === 'year') {
      const ref = this.dialog.open<YearsForm, { mode: 'create'; initialData?: Year | null }, YearFormResult>(
        YearsForm,
        { width: '560px', data: { mode: 'create', initialData: null } }
      );
      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.yearsSvc.add(res.payload).subscribe({
          next: (newId) => { this.snack.open(`Year created (ID ${newId}).`, 'OK', { duration: 2200 }); this.reloadYears(); },
          error: () => this.snack.open('Failed to create Year.', 'Dismiss', { duration: 2800 })
        });
      });
      return;
    }

    if (this.section === 'category') {
      const ref = this.dialog.open<CategoriesForm, { mode: 'create'; initialData?: Category | null }, CategoryFormResult>(
        CategoriesForm,
        { width: '560px', data: { mode: 'create', initialData: null } }
      );
      ref.afterClosed().subscribe(res => {
        if (!res || res.action !== 'create') return;
        this.catsSvc.add(res.payload).subscribe({
          next: (newId) => { this.snack.open(`Category created (ID ${newId}).`, 'OK', { duration: 2200 }); this.reloadCats(); },
          error: () => this.snack.open('Failed to create Category.', 'Dismiss', { duration: 2800 })
        });
      });
      return;
    }
  }

  /** Open Edit dialog for the selected row (Make/Model/Year/Category wired). */
  editRow(row: any): void {
    if (this.section === 'make') {
      this.makesSvc.getById(row.makeId).subscribe({
        next: (full) => {
          const ref = this.dialog.open<MakesForm, { mode: 'edit'; initialData: Make }, MakeFormResult>(
            MakesForm,
            { width: '520px', data: { mode: 'edit', initialData: full } }
          );
          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.makesSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Make updated.' : 'Update failed.', 'OK', { duration: 2200 });
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
          const ref = this.dialog.open<ModelsForm, { mode: 'edit'; initialData: Model }, ModelFormResult>(
            ModelsForm,
            { width: '560px', data: { mode: 'edit', initialData: full } }
          );
          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.modelsSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Model updated.' : 'Update failed.', 'OK', { duration: 2200 });
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
          const ref = this.dialog.open<YearsForm, { mode: 'edit'; initialData: Year }, YearFormResult>(
            YearsForm,
            { width: '560px', data: { mode: 'edit', initialData: full } }
          );
          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.yearsSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Year updated.' : 'Update failed.', 'OK', { duration: 2200 });
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
          const ref = this.dialog.open<CategoriesForm, { mode: 'edit'; initialData: Category }, CategoryFormResult>(
            CategoriesForm,
            { width: '560px', data: { mode: 'edit', initialData: full } }
          );
          ref.afterClosed().subscribe(res => {
            if (!res || res.action !== 'edit') return;
            this.catsSvc.update(res.payload).subscribe({
              next: (ok) => {
                this.snack.open(ok ? 'Category updated.' : 'Update failed.', 'OK', { duration: 2200 });
                if (ok) this.reloadCats();
              },
              error: () => this.snack.open('Failed to update Category.', 'Dismiss', { duration: 2800 })
            });
          });
        },
        error: () => this.snack.open('Failed to load Category for edit.', 'Dismiss', { duration: 2800 })
      });
      return;
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
      this.snack.open(`Record ${newState ? 'activated' : 'deactivated'}.`, 'OK', { duration: 1800 });
      this.updateTotals();
    } else {
      this.snack.open('Failed to change status.', 'Dismiss', { duration: 2500 });
    }
  }
}
