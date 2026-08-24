import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';

import { InquiryService } from '../../core/services/inquiry.service';
import { BidService } from '../../core/services/bid.service';
import { InquiryDetail } from '../../core/models/inquiry.model';
import { Bid } from '../../core/models/bid.model';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'app-inquiry-detail',
  standalone: true,
  imports: [RouterLink, DecimalPipe, IconComponent],
  templateUrl: './inquiry-detail.component.html',
  styleUrl: './inquiry-detail.component.scss',
})
export class InquiryDetailComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private inquiryService = inject(InquiryService);
  private bidService = inject(BidService);

  inquiryId = Number(this.route.snapshot.paramMap.get('id'));

  inquiry = signal<InquiryDetail | null>(null);
  bids = signal<Bid[]>([]);
  isLoading = signal(true);
  isAccepting = signal<number | null>(null);

  // Once a bid is accepted, this holds the suggested advance amount
  // returned by the backend, and we move into the payment-simulation step.
  acceptedBid = signal<Bid | null>(null);
  suggestedAdvance = signal<number | null>(null);
  isSimulatingPayment = signal(false);
  paymentDone = signal(false);
  createdOrderId = signal<number | null>(null);

  specificationEntries = signal<[string, string | number][]>([]);

  // Maps a portfolio image ID to its loaded object URL, filled in
  // gradually as each thumbnail's blob arrives - kept outside the
  // Bid objects themselves since they load asynchronously and at
  // different times per image.
  portfolioThumbnails = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.inquiryService.getInquiry(this.inquiryId).subscribe((data) => {
      this.inquiry.set(data);
      const entries = Object.entries(data.specification).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      ) as [string, string | number][];
      this.specificationEntries.set(entries);
    });
    this.loadBids();
  }

  private loadBids(): void {
    this.bidService.listBidsForInquiry(this.inquiryId).subscribe({
      next: (data) => {
        this.bids.set(data);
        this.isLoading.set(false);

        const accepted = data.find((b) => b.status === 'accepted');
        if (accepted) {
          this.acceptedBid.set(accepted);
        }

        for (const bid of data) {
          for (const portfolioId of bid.portfolio_ids) {
            this.loadThumbnail(portfolioId);
          }
        }
      },
      error: () => this.isLoading.set(false),
    });
  }

  private loadThumbnail(portfolioId: number): void {
    if (this.portfolioThumbnails()[portfolioId]) return; // already loaded

    this.bidService.getPortfolioImageBlob(portfolioId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.portfolioThumbnails.update((current) => ({ ...current, [portfolioId]: url }));
      },
      error: () => {
        // A missing/broken thumbnail shouldn't block the rest of the
        // bid card from showing - it just silently has one fewer
        // sample image, no error state needed for something this minor.
      },
    });
  }

  acceptBid(bid: Bid): void {
    this.isAccepting.set(bid.id);
    this.bidService.acceptBid(bid.id).subscribe({
      next: (result) => {
        this.isAccepting.set(null);
        this.acceptedBid.set(bid);
        this.suggestedAdvance.set(result.suggested_advance_amount);
        this.loadBids();
      },
      error: () => this.isAccepting.set(null),
    });
  }

  simulatePayment(): void {
    const bid = this.acceptedBid();
    if (!bid) return;

    this.isSimulatingPayment.set(true);
    this.bidService.simulatePayment(bid.id).subscribe({
      next: (result) => {
        this.isSimulatingPayment.set(false);
        this.paymentDone.set(true);
        this.createdOrderId.set(result.order.id);
      },
      error: () => this.isSimulatingPayment.set(false),
    });
  }

  goToOrder(): void {
    this.router.navigate(['/customer/orders']);
  }

  downloadAttachment(file: { id: number; original_filename: string }): void {
    this.inquiryService.downloadAttachment(file.id, file.original_filename);
  }

  ngOnDestroy(): void {
    for (const url of Object.values(this.portfolioThumbnails())) {
      URL.revokeObjectURL(url);
    }
  }
}
