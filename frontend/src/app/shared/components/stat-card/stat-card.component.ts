import { Component, Input } from '@angular/core';

import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="stat-card card">
      <div class="stat-card__icon" [style.background]="iconBg" [style.color]="iconColor">
        <app-icon [name]="icon" [size]="18" />
      </div>
      <span class="stat-card__label">{{ label }}</span>
      <span class="stat-card__value">{{ value }}</span>
      @if (subtitle) {
        <span class="stat-card__subtitle">{{ subtitle }}</span>
      }
    </div>
  `,
  styles: [`
    .stat-card {
      padding: var(--space-md);
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(105, 82, 224, 0.1);
    }
    .stat-card__icon {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 0.2rem;
    }
    .stat-card__label {
      font-size: 0.85rem;
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .stat-card__value {
      font-size: 1.9rem;
      font-weight: 700;
      color: var(--color-text);
    }
    .stat-card__subtitle {
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
  `],
})
export class StatCardComponent {
  @Input() label = '';
  @Input() value: string | number = '';
  @Input() subtitle?: string;
  @Input() icon = 'grid';
  @Input() iconColor = 'var(--color-accent)';
  @Input() iconBg = 'var(--color-accent-soft)';
}
