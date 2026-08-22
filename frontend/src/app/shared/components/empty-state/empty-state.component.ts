import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [IconComponent, RouterLink],
  template: `
    <div class="empty-state">
      <div class="empty-state__icon"><app-icon [name]="icon" [size]="26" /></div>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      @if (actionLabel && actionLink) {
        <a [routerLink]="actionLink" class="empty-state__action">{{ actionLabel }}</a>
      }
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-xl) var(--space-md);
    }
    .empty-state__icon {
      width: 56px;
      height: 56px;
      border-radius: var(--radius-md);
      background: var(--color-accent-soft);
      color: var(--color-accent);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: var(--space-md);
    }
    h3 {
      font-size: 1rem;
      margin: 0 0 0.3rem;
    }
    p {
      color: var(--color-text-muted);
      font-size: 0.88rem;
      max-width: 22rem;
      margin: 0 0 var(--space-md);
    }
    .empty-state__action {
      display: inline-block;
      background: var(--color-accent);
      color: white;
      font-weight: 600;
      font-size: 0.88rem;
      padding: 0.6rem 1.25rem;
      border-radius: var(--radius-sm);

      &:hover { background: var(--color-accent-hover); }
    }
  `],
})
export class EmptyStateComponent {
  @Input() icon = 'chat';
  @Input() title = 'Nothing here yet';
  @Input() description = '';
  @Input() actionLabel?: string;
  @Input() actionLink?: string;
}
