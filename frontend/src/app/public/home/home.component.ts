/**
 * @Component's `standalone: true` means this component declares its
 * own dependencies (imports: [...]) directly, instead of needing to
 * be registered inside an NgModule - the proposal specifically asks
 * for standalone components, and it's also the modern default as of
 * recent Angular versions, so every component in this app follows
 * the same pattern.
 */

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import { AuthService } from '../../core/services/auth.service';
import { IconComponent } from '../../shared/components/icon/icon.component';
import { CoverflowCarouselComponent } from '../../shared/components/coverflow-carousel/coverflow-carousel.component';
import { HERO_BG_SVG, CMYK_DOTS_SVG } from './print-illustrations';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface CategoryCard {
  image: string;
  name: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, IconComponent, CoverflowCarouselComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private sanitizer = inject(DomSanitizer);

  constructor(public authService: AuthService) {}

  heroIllustration: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(HERO_BG_SVG);
  cmykIllustration: SafeHtml = this.sanitizer.bypassSecurityTrustHtml(CMYK_DOTS_SVG);

  liveBids = [
    { shop: 'Kandy Prints', turnaround: '4 day turnaround', price: 'LKR 3,200', best: false },
    { shop: 'Colombo Press', turnaround: '2 day turnaround', price: 'LKR 2,800', best: true },
    { shop: 'Galle Printing', turnaround: '5 day turnaround', price: 'LKR 3,500', best: false },
  ];

  servedBy = [
    { icon: 'shop', label: 'Local Print Shops' },
    { icon: 'grid', label: 'Design Studios' },
    { icon: 'users', label: 'Students & Universities' },
    { icon: 'package', label: 'Corporate Businesses' },
    { icon: 'tag', label: 'Freelancers' },
  ];

  categories: CategoryCard[] = [
    { image: '/category-images/business-card.jpg', name: 'Business Cards' },
    { image: '/category-images/flyer.jpg', name: 'Flyers' },
    { image: '/category-images/banner.jpg', name: 'Banners' },
    { image: '/category-images/brochure.jpg', name: 'Brochures' },
    { image: '/category-images/sticker.jpg', name: 'Stickers' },
    { image: '/category-images/package.jpg', name: 'Packaging' },
    { image: '/category-images/envelope.jpg', name: 'Invitations' },
    { image: '/category-images/award.jpg', name: 'Certificates' },
  ];

  features: Feature[] = [
    {
      icon: 'upload',
      title: 'Describe your job',
      description: 'Tell us what you need in plain language - quantity, size, paper, finish, deadline. No forms to fill in first.',
    },
    {
      icon: 'robot',
      title: 'AI smart extraction',
      description: 'Our model reads your message and pulls out the exact specifications automatically, asking only if something is missing.',
    },
    {
      icon: 'scale',
      title: 'Compare real bids',
      description: 'Registered local print shops compete for your job. Compare price, rating, and turnaround side by side.',
    },
    {
      icon: 'shield',
      title: 'Secure demo payment',
      description: 'Confirm your order with a simulated advance payment - a safe trust-based flow, clearly marked as a demo.',
    },
    {
      icon: 'package',
      title: 'Track to delivery',
      description: 'Follow your order from confirmation through production to your door, or collect it yourself.',
    },
  ];

  forShops = [
    {
      icon: 'users',
      title: 'Reach new customers',
      description: 'Get discovered by customers actively looking for exactly what you print, without spending on ads.',
    },
    {
      icon: 'tag',
      title: 'Bid on jobs that fit you',
      description: 'See structured job specifications upfront and only bid on work that matches your capabilities.',
    },
    {
      icon: 'award',
      title: 'Grow with verified reviews',
      description: 'Build a track record through completed orders and customer ratings that improve your ranking on future bids.',
    },
  ];

  logout(): void {
    this.authService.logout();
  }

  dashboardPath(): string {
    return this.authService.dashboardPath();
  }
}
