import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CategoryService } from '../../core/services/category.service';
import { AdminCategory } from '../../core/models/category.model';

@Component({
  selector: 'app-admin-categories',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './admin-categories.component.html',
  styleUrl: './admin-categories.component.scss',
})
export class AdminCategoriesComponent implements OnInit {
  private categoryService = inject(CategoryService);

  categories = signal<AdminCategory[]>([]);
  isLoading = signal(true);

  newName = signal('');
  newDescription = signal('');
  isCreating = signal(false);
  createError = signal<string | null>(null);

  editingId = signal<number | null>(null);
  editName = signal('');
  editDescription = signal('');
  isSaving = signal(false);
  editError = signal<string | null>(null);

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.isLoading.set(true);
    this.categoryService.adminListCategories().subscribe({
      next: (data) => {
        this.categories.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  createCategory(): void {
    const name = this.newName().trim();
    if (!name) return;

    this.isCreating.set(true);
    this.createError.set(null);

    this.categoryService.createCategory(name, this.newDescription().trim() || undefined).subscribe({
      next: () => {
        this.isCreating.set(false);
        this.newName.set('');
        this.newDescription.set('');
        this.loadCategories();
      },
      error: (err) => {
        this.isCreating.set(false);
        this.createError.set(err.error?.error ?? 'Could not create category.');
      },
    });
  }

  startEdit(category: AdminCategory): void {
    this.editingId.set(category.id);
    this.editName.set(category.name);
    this.editDescription.set(category.description ?? '');
    this.editError.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(id: number): void {
    const name = this.editName().trim();
    if (!name) return;

    this.isSaving.set(true);
    this.editError.set(null);

    this.categoryService.updateCategory(id, name, this.editDescription().trim() || undefined).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.editingId.set(null);
        this.loadCategories();
      },
      error: (err) => {
        this.isSaving.set(false);
        this.editError.set(err.error?.error ?? 'Could not save changes.');
      },
    });
  }

  deleteCategory(category: AdminCategory): void {
    const usageNote = category.inquiry_count > 0
      ? ` This category has ${category.inquiry_count} inquiry(ies) using it and cannot be deleted.`
      : category.shop_count > 0
        ? ` ${category.shop_count} print shop(s) currently offer this category and will lose it.`
        : '';

    if (!confirm(`Delete "${category.name}"?${usageNote}`)) return;

    this.categoryService.deleteCategory(category.id).subscribe({
      next: () => this.loadCategories(),
      error: (err) => alert(err.error?.error ?? 'Could not delete category.'),
    });
  }
}
