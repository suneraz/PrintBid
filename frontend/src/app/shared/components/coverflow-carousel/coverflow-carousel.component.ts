/**
 * A 3D "coverflow" style carousel: the centre card sits flat and full
 * size, cards further from centre tilt away and recede into the
 * distance. Drag left/right to rotate through them.
 *
 * This is a straight port of the maths from a React reference version
 * of this effect - React and Angular render differently, but the
 * actual visual effect is just CSS 3D transforms driven by pointer
 * events, which has nothing framework-specific about it. The one
 * meaningful difference: instead of React refs, this uses a plain
 * class property (`pos`) and writes directly to each card's
 * `nativeElement.style` on every animation frame - deliberately
 * bypassing Angular's change detection for this, the same way the
 * original bypassed React's re-render cycle, since neither framework
 * needs to know about 60-times-a-second transform updates.
 */

import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';

export interface CoverflowSlide {
  image: string;
  name: string;
}

@Component({
  selector: 'app-coverflow-carousel',
  standalone: true,
  imports: [],
  templateUrl: './coverflow-carousel.component.html',
  styleUrl: './coverflow-carousel.component.scss',
})
export class CoverflowCarouselComponent implements AfterViewInit, OnDestroy {
  @Input() slides: CoverflowSlide[] = [];
  @Input() rotate = 42;
  @Input() depth = 0.6;
  @Input() falloff = 0.56;
  @Input() fade = 0.12;
  @Input() gap = 0.18;

  @ViewChild('frame') frameRef!: ElementRef<HTMLDivElement>;
  @ViewChildren('card') cardRefs!: QueryList<ElementRef<HTMLDivElement>>;

  private pos = 0;
  private target = 0;
  private width = 0;
  private rafId: number | null = null;
  private drag: { x: number; pos: number } | null = null;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    this.measure();
    this.resizeObserver = new ResizeObserver(() => this.measure());
    this.resizeObserver.observe(this.frameRef.nativeElement);
  }

  ngOnDestroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
  }

  private measure(): void {
    const first = this.cardRefs.first?.nativeElement;
    if (!first) return;
    this.width = first.offsetWidth;
    this.paint();
  }

  private paint(): void {
    const count = this.slides.length;
    if (!this.width || count === 0) return;

    const pitch = this.width * (1 + this.gap);

    this.cardRefs.forEach((cardElRef, index) => {
      const card = cardElRef.nativeElement;
      let offset = index - this.pos;
      offset = ((offset % count) + count) % count;
      if (offset > count / 2) offset -= count;

      const distance = Math.abs(offset);
      const ramp = Math.pow(distance, this.falloff);
      const tilt = Math.min(this.rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-this.depth * this.width * ramp}px) rotateY(${-tilt}deg)`;

      const edge = Math.min(1, Math.max(0, count / 2 - distance));
      card.style.opacity = String(Math.max(0, 1 - this.fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
    });
  }

  private settle(target: number): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.target = target;

    const step = () => {
      const remaining = this.target - this.pos;
      if (Math.abs(remaining) < 0.0004) {
        this.pos = this.target;
        this.paint();
        this.rafId = null;
        return;
      }
      this.pos += remaining * 0.16;
      this.paint();
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  nudge(by: number): void {
    this.settle(Math.round(this.target) + by);
  }

  /** Click any card (not just the arrows) to bring it to the centre,
      always taking the shorter way round the ring rather than
      unwinding all the way past the other cards. */
  goTo(index: number): void {
    const count = this.slides.length;
    const target = index + Math.round((this.target - index) / count) * count;
    this.settle(target);
  }

  private dragMoved = false;

  onCardClick(index: number): void {
    // A drag that ends without much movement still fires a click -
    // only treat it as "pick this card" if the pointer barely moved.
    if (this.dragMoved) return;
    this.goTo(index);
  }

  onPointerDown(event: PointerEvent): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.target = this.pos;
    this.drag = { x: event.clientX, pos: this.pos };
    this.dragMoved = false;
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.drag || !this.width) return;
    const pitch = this.width * (1 + this.gap);
    if (Math.abs(event.clientX - this.drag.x) > 4) this.dragMoved = true;
    this.pos = this.drag.pos - (event.clientX - this.drag.x) / pitch;
    this.paint();
  }

  onPointerUp(): void {
    if (!this.drag) return;
    this.drag = null;
    this.settle(Math.round(this.pos));
  }
}
