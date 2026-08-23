import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminService } from '../../core/services/admin.service';
import { PlatformStats, AdminUser } from '../../core/models/admin.model';
import { StatCardComponent } from '../../shared/components/stat-card/stat-card.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, StatCardComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);

  stats = signal<PlatformStats | null>(null);
  users = signal<AdminUser[]>([]);
  processingId = signal<number | null>(null);

  // Deliberately excludes admin accounts - suspending another admin
  // is a rarer, more deliberate action better handled from the full
  // Users page, not a one-click dashboard shortcut. This list is
  // customers and print shops only, most recent first.
  manageableUsers = computed(() =>
    this.users()
      .filter((u) => u.role !== 'admin')
      .slice(0, 8),
  );

  ngOnInit(): void {
    this.adminService.getStats().subscribe((data) => this.stats.set(data));
    this.loadUsers();
  }

  private loadUsers(): void {
    this.adminService.listUsers().subscribe((data) => this.users.set(data));
  }

  toggleStatus(user: AdminUser): void {
    const goingActive = !user.is_active;
    if (!goingActive && !confirm(`Suspend ${user.full_name}? They won't be able to log in until reactivated.`)) {
      return;
    }

    this.processingId.set(user.id);

    this.adminService.updateUserStatus(user.id, goingActive).subscribe({
      next: () => {
        this.processingId.set(null);
        this.loadUsers();
      },
      error: () => this.processingId.set(null),
    });
  }
}
