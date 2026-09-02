import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthStore } from '../../../core/auth/auth.store';
import { UserRole } from '../../../core/auth/auth.models';
import { ButtonComponent } from '../../../shared/ui/button.component';
import { CardComponent } from '../../../shared/ui/card.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state.component';
import { PaginationComponent } from '../../../shared/ui/pagination.component';
import { SpinnerComponent } from '../../../shared/ui/spinner.component';
import { ManagedUser } from '../data/user.model';
import { UsersStore } from '../data/users.store';

const ROLE_OPTIONS: UserRole[] = ['User', 'Admin'];

/**
 * Admin-only user management: list users, create additional admin accounts,
 * change roles and toggle account status. All changes go through the
 * admin-authorized backend endpoints; the backend enforces the business rules
 * (e.g. the last remaining admin can never be removed).
 */
@Component({
  selector: 'app-users-management-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    PaginationComponent,
    SpinnerComponent,
  ],
  providers: [UsersStore],
  template: `
    <section class="users" aria-labelledby="users-heading">
      <header class="users__header">
        <div>
          <h1 id="users-heading" class="users__title">User Management</h1>
          <p class="users__subtitle">
            Manage accounts, roles and access for the library system.
          </p>
        </div>
      </header>

      <!-- Toasts -->
      @if (store.successMessage(); as message) {
        <div class="toast toast--success" role="status">
          <span>{{ message }}</span>
          <button
            type="button"
            class="toast__close"
            (click)="store.dismissSuccess()"
            aria-label="Dismiss message"
          >
            ×
          </button>
        </div>
      }
      @if (store.actionError(); as message) {
        <div class="toast toast--error" role="alert">
          <span>{{ message }}</span>
          <button
            type="button"
            class="toast__close"
            (click)="store.dismissActionError()"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      }

      <!-- Create admin account -->
      <app-card class="users__create">
        <h2 class="users__section-title">Create admin account</h2>
        <p class="users__section-hint">
          New admins can manage books, review requests and other users.
        </p>
        <form
          class="create-form"
          [formGroup]="createForm"
          (ngSubmit)="submitCreate()"
          novalidate
        >
          <div class="create-form__grid">
            <div class="field">
              <label class="field__label" for="create-name">Name</label>
              <input
                id="create-name"
                class="field__input"
                type="text"
                formControlName="name"
                autocomplete="name"
              />
              @if (nameInvalid) {
                <p class="field__error">Please enter a name (max 200 characters).</p>
              }
            </div>

            <div class="field">
              <label class="field__label" for="create-email">Email</label>
              <input
                id="create-email"
                class="field__input"
                type="email"
                formControlName="email"
                autocomplete="email"
              />
              @if (emailInvalid) {
                <p class="field__error">Please enter a valid email address.</p>
              }
            </div>

            <div class="field">
              <label class="field__label" for="create-password">Password</label>
              <input
                id="create-password"
                class="field__input"
                type="password"
                formControlName="password"
                autocomplete="new-password"
              />
              @if (passwordInvalid) {
                <p class="field__error">At least 8 characters.</p>
              }
            </div>

            <div class="field">
              <label class="field__label" for="create-confirm">Confirm password</label>
              <input
                id="create-confirm"
                class="field__input"
                type="password"
                formControlName="confirmPassword"
                autocomplete="new-password"
              />
              @if (confirmInvalid) {
                <p class="field__error">Passwords do not match.</p>
              }
            </div>
          </div>

          <app-button
            type="submit"
            [disabled]="createForm.invalid"
            [loading]="store.creating()"
          >
            Create admin
          </app-button>
        </form>
      </app-card>

      <!-- Search + user list -->
      <app-card class="users__list" [flat]="true">
        <div class="users__toolbar">
          <label class="sr-only" for="user-search">Search users</label>
          <input
            id="user-search"
            class="field__input users__search"
            type="search"
            placeholder="Search by name or email…"
            [value]="store.search()"
            (input)="onSearch($event)"
          />
        </div>

        @if (store.loading()) {
          <div class="users__loading">
            <app-spinner label="Loading users" />
          </div>
        } @else if (store.error(); as error) {
          <app-empty-state
            icon="⚠️"
            title="Users could not be loaded"
            [message]="error.message"
          >
            <app-button variant="secondary" (click)="store.retry()">Try again</app-button>
          </app-empty-state>
        } @else if (store.isEmpty()) {
          <app-empty-state
            icon="👤"
            title="No users found"
            [message]="
              store.search() ? 'No users match your search.' : 'No accounts exist yet.'
            "
          />
        } @else {
          <div class="table-wrap" role="region" aria-label="User list" tabindex="0">
            <table class="users-table">
              <caption class="sr-only">
                Registered users with role and status management
              </caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Email</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (user of store.items(); track user.id) {
                  <tr>
                    <td data-label="Name" class="users-table__name">
                      {{ user.name }}
                      @if (user.id === currentUserId()) {
                        <span class="users-table__you">(you)</span>
                      }
                    </td>
                    <td data-label="Email">{{ user.email }}</td>
                    <td data-label="Role">
                      <div class="role-cell">
                        <select
                          class="field__input role-cell__select"
                          [attr.aria-label]="'Role for ' + user.name"
                          [value]="pendingRoles().get(user.id) ?? user.role"
                          [disabled]="isBusy(user.id)"
                          (change)="onRoleSelect(user, $event)"
                        >
                          @for (role of roleOptions; track role) {
                            <option [value]="role">{{ role }}</option>
                          }
                        </select>
                        @if (pendingRoles().get(user.id) !== undefined) {
                          <app-button
                            size="sm"
                            [disabled]="isBusy(user.id)"
                            (click)="applyRole(user)"
                          >
                            Save
                          </app-button>
                          <button
                            type="button"
                            class="role-cell__cancel"
                            (click)="cancelRole(user.id)"
                            [attr.aria-label]="'Cancel role change for ' + user.name"
                          >
                            ×
                          </button>
                        }
                      </div>
                    </td>
                    <td data-label="Status">
                      <span class="status" [class.status--active]="user.isActive">
                        {{ user.isActive ? 'Active' : 'Deactivated' }}
                      </span>
                    </td>
                    <td data-label="Created">{{ user.createdAt | date: 'mediumDate' }}</td>
                    <td data-label="Actions">
                      <div class="actions-cell">
                        @if (user.isActive) {
                          <app-button
                            variant="secondary"
                            size="sm"
                            [disabled]="user.id === currentUserId() || isBusy(user.id)"
                            (click)="store.updateUserStatus(user.id, false)"
                          >
                            Deactivate
                          </app-button>
                        } @else {
                          <app-button
                            variant="secondary"
                            size="sm"
                            [disabled]="isBusy(user.id)"
                            (click)="store.updateUserStatus(user.id, true)"
                          >
                            Activate
                          </app-button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <app-pagination
            [currentPage]="store.page()"
            [totalPages]="store.totalPages()"
            [totalItems]="store.totalItems()"
            [pageSize]="store.pageSize()"
            (pageChange)="store.setPage($event)"
          />
        }
      </app-card>
    </section>
  `,
  styles: `
    .users {
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .users__title {
      font-size: var(--fs-xl);
    }

    .users__subtitle {
      color: var(--color-neutral-500);
      font-size: var(--fs-sm);
    }

    .users__section-title {
      font-size: var(--fs-md);
      margin-bottom: var(--space-1);
    }

    .users__section-hint {
      color: var(--color-neutral-500);
      font-size: var(--fs-sm);
      margin-bottom: var(--space-4);
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      align-items: flex-start;
    }

    .create-form__grid {
      display: grid;
      gap: var(--space-4);
      width: 100%;

      @media (min-width: 48em) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .field__label {
      font-size: var(--fs-sm);
      font-weight: var(--fw-semibold);
    }

    .field__input {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-neutral-300);
      border-radius: var(--radius-md);
      font-size: var(--fs-sm);
      background: var(--color-neutral-0);
      color: inherit;
    }

    .field__input:focus-visible {
      outline: 2px solid var(--color-primary-600);
      outline-offset: 1px;
    }

    .field__error {
      color: var(--color-danger-600, #b91c1c);
      font-size: var(--fs-xs);
    }

    .users__toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: var(--space-4);
    }

    .users__search {
      max-width: 20rem;
      width: 100%;
    }

    .users__loading {
      display: grid;
      place-items: center;
      padding: var(--space-10);
    }

    .table-wrap {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--fs-sm);
    }

    .users-table th,
    .users-table td {
      padding: var(--space-3);
      border-bottom: 1px solid var(--color-neutral-200);
      text-align: start;
      vertical-align: middle;
    }

    .users-table th {
      font-size: var(--fs-xs);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-neutral-500);
    }

    .users-table__name {
      font-weight: var(--fw-semibold);
    }

    .users-table__you {
      color: var(--color-neutral-500);
      font-weight: var(--fw-normal);
      font-size: var(--fs-xs);
    }

    .role-cell {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      min-width: 11rem;
    }

    .role-cell__select {
      padding-block: var(--space-1);
    }

    .role-cell__cancel {
      border: none;
      background: none;
      color: var(--color-neutral-500);
      font-size: var(--fs-lg);
      line-height: 1;
      cursor: pointer;
      padding: var(--space-1);
    }

    .role-cell__cancel:hover {
      color: var(--color-neutral-800);
    }

    .status {
      display: inline-block;
      padding: var(--space-1) var(--space-3);
      border-radius: var(--radius-full);
      font-size: var(--fs-xs);
      font-weight: var(--fw-semibold);
      background: var(--color-neutral-200);
      color: var(--color-neutral-600);
    }

    .status--active {
      background: var(--color-success-50, #ecfdf5);
      color: var(--color-success-700, #047857);
    }

    .actions-cell {
      display: flex;
      gap: var(--space-2);
    }

    .toast {
      position: fixed;
      inset-block-end: var(--space-5);
      inset-inline-end: var(--space-5);
      z-index: 60;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));
      font-size: var(--fs-sm);
      max-width: 24rem;
    }

    .toast--success {
      background: var(--color-success-700, #047857);
      color: white;
    }

    .toast--error {
      background: var(--color-danger-600, #b91c1c);
      color: white;
    }

    .toast__close {
      border: none;
      background: none;
      color: inherit;
      font-size: var(--fs-lg);
      cursor: pointer;
      line-height: 1;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  `,
})
export class UsersManagementPageComponent implements OnInit {
  protected readonly store = inject(UsersStore);
  private readonly authStore = inject(AuthStore);
  private readonly fb = inject(FormBuilder);

  protected readonly roleOptions = ROLE_OPTIONS;

  /** Pending (unsaved) role selections keyed by user id. */
  protected readonly pendingRoles = signal<ReadonlyMap<string, UserRole>>(new Map());

  protected readonly currentUserId = computed(
    () => this.authStore.currentUser()?.id ?? null,
  );

  protected readonly createForm = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(200)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(320)]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(128)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: (group) => this.passwordsMatch(group) },
  );

  ngOnInit(): void {
    this.store.load(1);
  }

  protected get nameInvalid(): boolean {
    const control = this.createForm.controls.name;
    return control.invalid && (control.dirty || control.touched);
  }

  protected get emailInvalid(): boolean {
    const control = this.createForm.controls.email;
    return control.invalid && (control.dirty || control.touched);
  }

  protected get passwordInvalid(): boolean {
    const control = this.createForm.controls.password;
    return control.invalid && (control.dirty || control.touched);
  }

  protected get confirmInvalid(): boolean {
    const control = this.createForm.controls.confirmPassword;
    return control.invalid && (control.dirty || control.touched);
  }

  protected submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const value = this.createForm.getRawValue();
    this.store.createUser({
      name: value.name.trim(),
      email: value.email.trim(),
      password: value.password,
      role: 'Admin',
    });

    this.createForm.reset();
  }

  protected onSearch(event: Event): void {
    this.store.searchUsers((event.target as HTMLInputElement).value);
  }

  protected onRoleSelect(user: ManagedUser, event: Event): void {
    const selected = (event.target as HTMLSelectElement).value as UserRole;
    if (selected === user.role) {
      this.cancelRole(user.id);
      return;
    }

    this.pendingRoles.update((map) => new Map(map).set(user.id, selected));
  }

  protected applyRole(user: ManagedUser): void {
    const pending = this.pendingRoles().get(user.id);
    if (!pending || pending === user.role) {
      return;
    }

    this.store.updateUserRole(user.id, pending);
    this.cancelRole(user.id);
  }

  protected cancelRole(userId: string): void {
    this.pendingRoles.update((map) => {
      const next = new Map(map);
      next.delete(userId);
      return next;
    });
  }

  protected isBusy(userId: string): boolean {
    return this.store.busyIds().has(userId);
  }

  private passwordsMatch(group: {
    value: { password: string; confirmPassword: string };
  }): { passwordMismatch: true } | null {
    const { password, confirmPassword } = group.value;
    return password && confirmPassword && password !== confirmPassword
      ? { passwordMismatch: true }
      : null;
  }
}
