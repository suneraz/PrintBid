import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { AdminService } from '../../core/services/admin.service';
import { AdminUser } from '../../core/models/admin.model';

type RoleFilter = 'all' | 'customer' | 'print_shop' | 'admin';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<AdminUser[]>([]);
  isLoading = signal(true);
  roleFilter = signal<RoleFilter>('all');
  processingId = signal<number | null>(null);
  actionError = signal<string | null>(null);

  filteredUsers = computed(() => {
    const filter = this.roleFilter();
    if (filter === 'all') return this.users();
    return this.users().filter((u) => u.role === filter);
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  private loadUsers(): void {
    this.adminService.listUsers().subscribe({
      next: (data) => {
        this.users.set(data);
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false),
    });
  }

  setFilter(filter: RoleFilter): void {
    this.roleFilter.set(filter);
  }

  toggleStatus(user: AdminUser): void {
    const goingActive = !user.is_active;
    if (!goingActive && !confirm(`Suspend ${user.full_name}? They won't be able to log in until reactivated.`)) {
      return;
    }

    this.processingId.set(user.id);
    this.actionError.set(null);

    this.adminService.updateUserStatus(user.id, goingActive).subscribe({
      next: () => {
        this.processingId.set(null);
        this.loadUsers();
      },
      error: (err) => {
        this.processingId.set(null);
        this.actionError.set(err.error?.error ?? 'Could not update this user.');
      },
    });
  }
}
