import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ShopProfileService } from '../../core/services/shop-profile.service';
import { CategoryService } from '../../core/services/category.service';
import { PrintCategory } from '../../core/models/category.model';
import { ShopServiceEntry, PortfolioItem, ShopReview } from '../../core/models/shop-profile.model';

interface PortfolioDisplayItem extends PortfolioItem {
  objectUrl: string | null;
}

@Component({
  selector: 'app-my-shop',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  templateUrl: './my-shop.component.html',
  styleUrl: './my-shop.component.scss',
})
export class MyShopComponent implements OnInit, OnDestroy {
  private shopProfileService = inject(ShopProfileService);
  private categoryService = inject(CategoryService);

  // --- Services (categories offered) ---
  allCategories = signal<PrintCategory[]>([]);
  selectedCategoryIds = signal<Set<number>>(new Set());
  isSavingServices = signal(false);
  servicesSaved = signal(false);

  // --- Portfolio ---
  portfolioItems = signal<PortfolioDisplayItem[]>([]);
  isUploadingPortfolio = signal(false);
  portfolioError = signal<string | null>(null);

  // --- Reviews ---
  reviews = signal<ShopReview[]>([]);
  averageRating = computed(() => {
    const list = this.reviews();
    if (list.length === 0) return null;
    return list.reduce((sum, r) => sum + r.rating, 0) / list.length;
  });

  categoriesError = signal<string | null>(null);

  ngOnInit(): void {
    this.categoryService.listCategories().subscribe({
      next: (categories) => this.allCategories.set(categories),
      error: (err) => {
        this.categoriesError.set(
          `Could not load categories (${err.status || 'network error'}). ${err.error?.error ?? err.message ?? ''}`,
        );
      },
    });
    this.shopProfileService.listMyServices().subscribe((services) => {
      this.selectedCategoryIds.set(new Set(services.map((s) => s.category_id)));
    });
    this.loadPortfolio();
    this.shopProfileService.listMyReviews().subscribe((data) => this.reviews.set(data));
  }

  ngOnDestroy(): void {
    // Object URLs are only valid for the life of the page - freeing
    // them here avoids leaking memory as the user navigates around.
    for (const item of this.portfolioItems()) {
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
    }
  }

  toggleCategory(categoryId: number): void {
    this.selectedCategoryIds.update((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  isSelected(categoryId: number): boolean {
    return this.selectedCategoryIds().has(categoryId);
  }

  saveServices(): void {
    this.isSavingServices.set(true);
    this.servicesSaved.set(false);

    this.shopProfileService.updateMyServices(Array.from(this.selectedCategoryIds())).subscribe({
      next: () => {
        this.isSavingServices.set(false);
        this.servicesSaved.set(true);
      },
      error: () => this.isSavingServices.set(false),
    });
  }

  private loadPortfolio(): void {
    this.shopProfileService.listMyPortfolio().subscribe((items) => {
      const display = items.map((item) => ({ ...item, objectUrl: null as string | null }));
      this.portfolioItems.set(display);
      display.forEach((item) => this.loadImageBlob(item.id));
    });
  }

  private loadImageBlob(id: number): void {
    this.shopProfileService.getPortfolioImageBlob(id).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      this.portfolioItems.update((items) =>
        items.map((item) => (item.id === id ? { ...item, objectUrl: url } : item)),
      );
    });
  }

  onPortfolioFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this.portfolioError.set(null);

    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['jpg', 'jpeg', 'png'].includes(extension)) {
      this.portfolioError.set('Only JPG and PNG images are accepted.');
      return;
    }
    if (this.portfolioItems().length >= 8) {
      this.portfolioError.set('Maximum of 8 portfolio images.');
      return;
    }

    this.isUploadingPortfolio.set(true);
    this.shopProfileService.uploadPortfolioItem(file).subscribe({
      next: () => {
        this.isUploadingPortfolio.set(false);
        this.loadPortfolio();
      },
      error: (err) => {
        this.isUploadingPortfolio.set(false);
        this.portfolioError.set(
          `Upload failed (${err.status || 'network error'}). ${err.error?.error ?? err.message ?? 'Unknown error.'}`,
        );
      },
    });
  }

  deletePortfolioItem(id: number): void {
    if (!confirm('Remove this portfolio image?')) return;

    this.shopProfileService.deletePortfolioItem(id).subscribe(() => {
      const item = this.portfolioItems().find((p) => p.id === id);
      if (item?.objectUrl) URL.revokeObjectURL(item.objectUrl);
      this.portfolioItems.update((items) => items.filter((p) => p.id !== id));
    });
  }
}
