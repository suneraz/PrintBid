/**
 * A tiny reusable component instead of pulling in an icon library
 * dependency - the proposal specifically says to avoid unnecessary
 * frontend libraries, and this app only needs a handful of icons.
 * Usage: <app-icon name="grid" />
 */

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

const ICON_PATHS: Record<string, string> = {
  grid: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  chat: 'M4 5h16v11H8l-4 4V5z',
  list: 'M4 6h16M4 12h16M4 18h10',
  package: 'M3 8l9-5 9 5-9 5-9-5zm0 0v9l9 5 9-5V8M12 13v9',
  tag: 'M12 3l8 8-8 8-8-8V3h8z M8 7h.01',
  users: 'M7 11a3 3 0 100-6 3 3 0 000 6zm10 0a3 3 0 100-6 3 3 0 000 6zM2 20c0-3 3-5 5-5s5 2 5 5M12 20c0-3 3-5 5-5s5 2 5 5',
  shop: 'M4 9l1-5h14l1 5M4 9h16M4 9v10h16V9M9 21v-6h6v6',
  flag: 'M5 3v18M5 4h12l-3 4 3 4H5',
  logout: 'M10 17l5-5-5-5M15 12H3M13 3h5a2 2 0 012 2v14a2 2 0 01-2 2h-5',
  bell: 'M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0',
  check: 'M20 6L9 17l-5-5',
  send: 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  shield: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z M9 12l2 2 4-4',
  robot: 'M7 8h10v9H7V8zm5-4v4M9.5 12v1M14.5 12v1M4 10h2v4H4zM18 10h2v4h-2z',
  scale: 'M12 3v18M5 21h14M5 7h14M4 7l3 6a3 3 0 006 0L10 7M14 7l3 6a3 3 0 006 0L20 7',
  upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  home: 'M3 10l9-7 9 7v10a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1V10z',
  card: 'M2 7h20v10H2V7zm3 3h6M5 13h4',
  flyer: 'M6 2h9l3 3v17H6V2zm9 0v3h3M9 11h6M9 15h6',
  banner: 'M5 3v17l3.5-2 3.5 2 3.5-2 3.5 2V3H5z',
  sticker: 'M4 4h16v16H4V4zm12 12l4-4v4h-4z',
  brochure: 'M4 4h16v16H4V4zm5 0v16m6-16v16',
  envelope: 'M3 6h18v12H3V6zm0 0l9 6 9-6',
  award: 'M12 2a5 5 0 100 10 5 5 0 000-10zM8.5 11L6 21l6-3 6 3-2.5-10',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 18l6-6-6-6',
};

@Component({
  selector: 'app-icon',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg
      [attr.width]="size"
      [attr.height]="size"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round">
      <path [attr.d]="path" />
    </svg>
  `,
})
export class IconComponent {
  @Input() name = 'grid';
  @Input() size = 20;

  get path(): string {
    return ICON_PATHS[this.name] ?? ICON_PATHS['grid'];
  }
}
