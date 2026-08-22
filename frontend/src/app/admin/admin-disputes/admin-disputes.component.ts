import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { AdminService } from '../../core/services/admin.service';
import { AdminDispute } from '../../core/models/admin.model';

type StatusFilter = 'open' | 'resolved' | 'rejected' | 'all';

@Component({
  selector: 'app-admin-disputes',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-disputes.component.html',
  styleUrl: './admin-disputes.component.scss',
})
export class AdminDisputesComponent implements OnInit {
  private adminService = inject(AdminService);

  disputes = signal<AdminDispute[]>([]);
  isLoading = signal(true);
  statusFilter = signal<StatusFilter>('open');
  processingId = signal<number | null>(null);
  noteDrafts = signal<Record<number, string>>({});

  ngOnInit(): void {
    this.loadDisputes();
  }

  setFilter(filter: StatusFilter): void {
    this.statusFilter.set(filter);
    this.loadDisputes();
  }

  noteFor(disputeId: number): string {
    return this.noteDrafts()[disputeId] ?? '';
  }

  setNote(disputeId: number, value: string): void {
    this.noteDrafts.update((drafts) => ({ ...drafts, [disputeId]: value }));
  }

  private loadDisputes(): void {
    this.isLoading.set(true);
    const filter = this.statusFilter();
    this.adminService.listDisputes(filter === 'all' ? undefined : filter).subscribe({
      next: (data) => {
        this.disputes.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  resolve(dispute: AdminDispute, status: 'resolved' | 'rejected'): void {
    this.processingId.set(dispute.id);
    this.adminService.resolveDispute(dispute.id, status, this.noteFor(dispute.id) || undefined).subscribe({
      next: () => {
        this.processingId.set(null);
        this.loadDisputes();
      },
      error: () => this.processingId.set(null),
    });
  }
}
