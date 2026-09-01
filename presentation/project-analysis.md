# Library System — Project Analysis

> Every statement in this document is verified from the actual source code in:
> - Frontend: `D:\VS Code\Projects\Library-System`
> - Backend: `D:\Drivers\Visual Studio Community\Projects\Library-System-API\Library-System-API`

---

## 1. Project Title
**Library System** — a full-stack web application for managing book borrowing in a library, with role-based workflows, asynchronous request processing, and real-time notifications.

## 2. Project Overview
The Library System lets **Users** browse a book catalog and request to borrow books for 1–30 days. Requests are processed **asynchronously via RabbitMQ**, and **Admins** approve or deny them. Both roles receive **real-time notifications** (SignalR) plus persisted notification history, and a **background job** reminds users and admins when a borrowing period is about to expire. The Angular SPA communicates with a .NET Web API over REST + SignalR, secured by JWT Bearer authentication.

## 3. Problem Statement
Manual library borrowing workflows (paper forms, verbal approvals) are slow, untraceable, and provide no notification when items are due. There is no single source of truth for request status, and reviewers have no real-time awareness of new requests.

## 4. Objectives
- Digitalize the borrow → review → return lifecycle with full auditability (`requestedAt`, `reviewedAt`, `reviewedBy`, `denyReason`).
- Enforce business rules consistently on both client and server (borrowing period 1–30 days; denial reason required).
- Decouple request submission from processing using message-queue-based asynchronous processing.
- Notify admins and users in real time (SignalR) and persist notification history (REST).
- Protect all endpoints with JWT authentication and role-based authorization.

## 5. Target Users
- **Library members (Users)** — browse and borrow books, track their requests.
- **Librarians (Admins)** — review and decide borrowing requests, monitor due dates.

## 6. User Roles
| Role | Capabilities (verified) |
|---|---|
| `User` | Browse/search catalog, submit borrow requests, view own request history, receive notifications |
| `Admin` | Everything a User sees, plus: review all requests, approve/deny with required reason, receive new-request notifications |

Roles are stored on `User.Role` (`User`/`Admin` enum), embedded in the JWT `role` claim, and enforced with `[Authorize(Roles = "…")]` on the backend and route guards on the frontend.

## 7. Main Features (all verified in code)
### User features
1. **Registration** — `POST /api/auth/register` creates a `User`-role account (hashed password) and signs the user in immediately (JWT returned).
2. **Authentication** — `POST /api/auth/login` (email/password, generic failure message against account enumeration).
3. **Password reset via email** — `POST /api/auth/forgot-password` issues a single-use, 30-minute, SHA-256-hashed token stored in `PasswordResetTokens`; `POST /api/auth/reset-password` consumes it. Email delivery via SMTP (`SmtpEmailSender`; content logged when SMTP host is unconfigured).
4. **Account deletion** — `DELETE /api/auth/account` requires the current password; deletes the user plus their borrowing requests, notifications, and reset tokens inside one transaction.
5. **Catalog browsing** — `GET /api/books` with server-side `search` (title/author/category), `availableOnly`, `sortBy` (title/author/createdAt), `sortOrder`, and pagination (default 20, max 100).
6. **Book details** — `GET /api/books/{id}`.
7. **Borrow request** — `POST /api/borrow` (`bookId`, `userId`, `borrowingPeriodDays` 1–30). Published to a RabbitMQ queue; a background consumer persists the request.
8. **My request history** — `GET /api/requests/my` (paged, status-filterable), including status badges (Pending/Approved/Denied/Returned/Expired) and Cairo-timezone timestamps in the UI.
9. **Notifications inbox** — `GET /api/notifications`, `PUT /api/notifications/{id}/read`; real-time pushes via SignalR; unread badge count.

### Admin features
10. **Request review queue** — `GET /api/requests` with status filter and pagination; approve `PUT /api/requests/{id}/approve` (optional `approvalNote`); deny `PUT /api/requests/{id}/deny` (reason **required**, min length 3). Conflicts surface `409` and the UI refetches authoritative state.
11. **Real-time awareness** — new borrow requests push `notificationReceived` to the `role-admins` SignalR group.
12. **Due-date awareness** — `BorrowingExpirationJob` periodically finds requests nearing expiry and notifies the borrowing user and admins.

## 8. Functional Requirements (implemented)
- FR1: Users register and authenticate with email/password.
- FR2: Users browse, search, filter, and sort the book catalog (paged).
- FR3: Users request to borrow an available book for 1–30 days.
- FR4: Requests are processed asynchronously (RabbitMQ consumer).
- FR5: Admins approve or deny pending requests; denial requires a reason.
- FR6: Users see their borrowing history and each request's status.
- FR7: Real-time notifications are delivered to users/admins (SignalR); history is persisted (REST).
- FR8: Reminders are sent before borrowing periods expire (background job).
- FR9: Users can reset their password via a single-use emailed token.
- FR10: Users can permanently delete their accounts (password-confirmed).
- FR11: All API endpoints require authentication except login/register/forgot/reset.

## 9. Non-Functional Requirements (verified characteristics)
- **Security**: JWT Bearer (HMAC-SHA256, 120-minute expiry, issuer/audience validation), PBKDF2-SHA256 password hashing (100k iterations, per-user salt), role-based authorization, no secrets in source (JWT secret from configuration).
- **Usability**: responsive UI (desktop/tablet/mobile), accessible components (aria attributes, focus rings, keyboard-closable dialogs), Cairo-timezone display.
- **Reliability**: GET-only HTTP retry with backoff; normalized error envelope; optimistic-concurrency handling for 409 conflicts via refetch.
- **Performance**: lazy-loaded feature routes, signals-based change detection (zoneless), paged lists (max 100), no full-page reloads.
- **Maintainability**: layered architecture on both sides, strongly-typed models, single source of truth stores.

## 10. Frontend Technology Stack
| Concern | Technology (verified) |
|---|---|
| Framework | Angular 21.2 (standalone components, zoneless change detection) |
| Language | TypeScript 5.9 (strict) |
| State | Angular Signals (`signal`/`computed`) in feature stores + auth store + badge store |
| Routing | Router with lazy `loadChildren`/`loadComponent`, functional guards, component-input binding |
| HTTP | `fetch`-independent `HttpClient` with functional interceptors (auth, error normalization, GET-only retry) |
| Real-time | `@microsoft/signalr` client (automatic reconnect, `access_token` handshake) |
| Forms | Reactive forms with custom validator (`borrowing-period.validator.ts`, 1–30 days) |
| Styling | SCSS design tokens (`_tokens.scss`) + mixins, CSS custom properties, no UI library |
| Testing | Vitest + jsdom (app shell spec) |
| Tooling | Angular CLI 21, Vite-based dev server, dev proxy to the API (`proxy.conf.json`), Prettier |

## 11. Backend Technology Stack
| Concern | Technology (verified) |
|---|---|
| Runtime/Framework | .NET 10, ASP.NET Core Web API (controllers) |
| ORM | Entity Framework Core 10 (SQL Server provider) |
| Database | SQL Server (`LibrarySystem`) |
| Auth | JWT Bearer (`Microsoft.AspNetCore.Authentication.JwtBearer`), `JwtService` issuing claims (`sub`, `email`, `nameidentifier`, `role`) |
| Messaging | RabbitMQ.Client 7.2 (`BorrowRequestPublisher`, `BorrowRequestConsumer`, `RabbitMqConnection`) |
| Real-time | SignalR (`NotificationsHub`, groups `role-admins` and `user-{id}`) |
| Email | `System.Net.Mail` SMTP (`SmtpEmailSender`) |
| Docs | Swashbuckle (Swagger UI in Development) |
| Testing | MSTest + Moq + FluentAssertions (BorrowingService create/decision tests, NotificationService tests) |
| Background processing | `BorrowingExpirationJob` (hosted service, configurable interval) |

## 12. Database Technology
SQL Server via EF Core Code-First with migrations:
- `20260825164112_InitialCreate`
- `20260828111840_AddPasswordResetTokens`

Seed data (`DbSeeder`): one Admin (`admin@library.local`) and one User (`user@library.local`) with hashed passwords.

## 13. Frontend Architecture
Angular **Core / Shared / Features** architecture (actual folders):

```
src/app/
├── core/            # app-wide singletons
│   ├── auth/        # AuthService (JWT decode/persist), AuthStore (signals),
│   │                # guards (requireAuth/requireAdmin/requireUser/guestOnly),
│   │                # authInterceptor, login/forgot/reset pages, delete dialog
│   ├── http/        # APP_CONFIG token, api-error interceptor → AppError,
│   │                # retry interceptor (GET only, exponential backoff)
│   ├── realtime/    # NotificationHubService (SignalR), HubReconnectHandler
│   │                # (debounced REST refetch), NotificationsBadgeStore
│   ├── layout/      # AppHeader (unread badge), AppSidebar (role-aware, collapsible)
│   └── config/      # APP_CONFIG injection token
├── shared/          # SCSS tokens/mixins, UI kit (button, card, status-badge,
│                    # empty-state, spinner, pagination), pipes (relative-time,
│                    # cairo-time), autofocus directive, validators, toQueryParams util
└── features/        # lazy-loaded domains
    ├── books/       # data (model/api/store), pages (list, detail), ui (card, search bar)
    ├── requests/    # data (model/api/store), pages (my-requests, review), ui (row, borrow form, deny dialog)
    └── notifications/ # data (model/api/store), pages (inbox), ui (item)
```

Key patterns:
- **Stores** own list state (items/page/filters/loading/error) with stale-response protection.
- **Smart pages / presentational components** split; components talk via `input()`/`output()`.
- **Deep-linkable state**: books filters/pagination, request status filter, and notifications read-filter sync to query params.
- **Session lifecycle**: the app shell starts/stops the SignalR hub with authentication state; on hub reconnect, persisted notifications are refetched.

## 14. Backend Architecture
N-tier, verified from the solution structure:

```
Controllers (API layer)
   AuthController, BooksController, BorrowingRequestsController,
   AdminActionsController, NotificationsController
        ↓  (DTOs + Result pattern)
Business Layer
   Services: AuthService, BookService, BorrowingService, NotificationService
   Validators: DtoValidator (DataAnnotations gate)
   Messaging: BorrowRequestPublisher / BorrowRequestConsumer (RabbitMQ)
   Notifications: SignalRNotificationDispatcher, SmtpEmailSender
   BackgroundJobs: BorrowingExpirationJob
   Hubs: NotificationsHub
        ↓
Data Access (via IUnitOfWork)
   IGenericRepository<T> (+ IBookRepository, IBorrowingRequestRepository,
   INotificationRepository), GenericRepository<T> implementations
        ↓
EF Core (LibraryDBContext) → SQL Server
```

Cross-cutting:
- **Result pattern** (`Result`/`Result<T>`/`Error` + `ErrorCodes`) for expected failures; `ToProblemResult()` converts to the standard error envelope `{ code, message, details, traceId }`.
- **`ExceptionHandlingMiddleware`** converts unhandled exceptions to the same envelope (`INTERNAL_ERROR`, 500).
- **DI composition** in `ServiceCollectionExtensions` (options binding + validation on start).

## 15. Database Architecture
Entities (actual):
| Entity | Key fields | Relationships |
|---|---|---|
| `User` | Id (PK), FullName, Email (unique index), PasswordHash, Role, IsActive, CreatedAt | 1→many BorrowingRequest (Restrict), 1→many PasswordResetToken (Cascade) |
| `Book` | Id (PK), Isbn, Title, Author, Category, IsAvailable, TotalCopies, AvailableCopies, CreatedAt, UpdatedAt | 1→many BorrowingRequest (Restrict) |
| `BorrowingRequest` | Id (PK), BookId (FK), UserId (FK), BookTitle (denormalized), Status, BorrowingPeriodDays, RequestedAt, ReviewedAt?, ReviewedBy?, DenyReason? | many→1 User, many→1 Book |
| `Notification` | Id (PK), RecipientUserId, RecipientRole, Type, Title, Message, IsRead, CreatedAt, RelatedRequestId? | Indexed by (RecipientUserId, IsRead) — no FK by design |
| `PasswordResetToken` | Id (PK), UserId (FK, cascade), TokenHash (unique index), ExpiresAtUtc, UsedAtUtc?, CreatedAtUtc | many→1 User |

Status lifecycle: `Pending → Approved | Denied → Returned | Expired` (enum `BorrowingRequestStatus`).

## 16. Frontend ↔ Backend Integration
- Dev-time: Angular dev-server proxy (`proxy.conf.json`) forwards `/api` and `/hubs` (with WebSockets) to the API — no CORS needed.
- REST calls flow: Component → feature Store → feature ApiService (`HttpClient`) → interceptors (Bearer attach → error normalize → GET retry) → proxy → Controller.
- Real-time: `NotificationHubService` negotiates `/hubs/notifications` with `access_token`; server pushes `notificationReceived` payloads; the notifications store merges pushes with REST history and updates the header badge store.
- Verified endpoints: `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `DELETE /api/auth/account`, `GET /api/books`, `GET /api/books/{id}`, `POST /api/borrow`, `GET /api/requests`, `GET /api/requests/my`, `GET /api/requests/{id}`, `PUT /api/requests/{id}/approve`, `PUT /api/requests/{id}/deny`, `GET /api/notifications`, `PUT /api/notifications/{id}/read`.

## 17. Authentication
- Backend: PBKDF2 hash verification → `JwtService.GenerateToken` (HMAC-SHA256, `JwtSettings` from config) → `LoginResponseDto { token, expiresAtUtc, userId, email, role }`.
- JWT validation: issuer/audience/lifetime, 30s clock skew; SignalR accepts `access_token` query string for `/hubs/notifications`.
- Frontend: token persisted in `localStorage`; `AuthService` decodes claims (including .NET long-form claim URIs) and enforces client-side expiry; `AuthStore` exposes `currentUser/role/isAuthenticated` signals; `authInterceptor` attaches `Authorization: Bearer`.

## 18. Authorization
- Backend: `[Authorize]` on all controllers except auth login/register/forgot/reset; `[Authorize(Roles = "User")]` on `POST /api/borrow` and `GET /api/requests/my`; `[Authorize(Roles = "Admin")]` on `GET /api/requests` and approve/deny. Users can only fetch their own requests/notifications (scoped by JWT claims).
- Frontend: functional route guards (`requireAuth`, `requireAdmin`, `requireUser`, `guestOnly`); role-aware navigation; UI checks are UX-only (backend is authoritative).

## 19. Important API Endpoints
See §16 list. Envelope: paginated responses are `{ items, page, pageSize, totalItems, totalPages }` (page 1-based, default size 20, max 100). Errors: `{ code, message, details[], traceId }` with stable codes (`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `BUSINESS_RULE_VIOLATION`, `INTERNAL_ERROR`).

## 20. Main Workflows
1. **Borrow workflow**: User submits `POST /api/borrow` → publisher enqueues to RabbitMQ (`borrow-requests`) → `BorrowRequestConsumer` persists the request (Pending) → admin notified in real time → admin approves/denies → user notified; status visible in history.
2. **Expiry workflow**: `BorrowingExpirationJob` periodically detects requests nearing expiry → notifies user + admins; expired requests become `Expired`.
3. **Password reset**: forgot-password → emailed single-use token → reset-password consumes token and rehashes the password.
4. **Account deletion**: password-confirmed transactional delete of user-owned rows + user.

## 21. Important UI Screens (screenshots captured in `presentation/assets/screenshots/`)
| # | Screen | File |
|---|---|---|
| 1 | Login (with demo-accounts hint) | 01-login.png |
| 2 | Forgot password | 02-forgot-password.png |
| 3 | Sign up (registration) | 03-sign-up.png |
| 4 | Catalog (search/sort/filter, paged) | 04-catalog.png |
| 5 | Admin review queue | 05-admin-review.png |
| 6 | Notifications inbox | 07-notifications.png |
| 7 | Book detail | 08-book-detail.png |
| 8 | User home | 09-user-home.png |
| 9 | My requests | 10-my-requests.png |

## 22. Security
- Passwords: PBKDF2 (HMAC-SHA256, 100,000 iterations, 16-byte salt, 32-byte key) — `PasswordHasher`.
- JWT: signed HMAC-SHA256; secret supplied via configuration (Development value only, not committed).
- No secrets displayed in UI; tokens in `localStorage` with expiry checks; error messages avoid leaking account existence (login and forgot-password are intentionally generic).
- Backend authorization is authoritative; frontend checks only improve UX.
- Reset tokens stored as SHA-256 hashes, single-use, 30-minute expiry.

## 23. Validation
- Backend: `DtoValidator` (DataAnnotations) gates every request DTO; business rules in services (period 1–30, deny reason ≥3 chars, unique email → `CONFLICT`).
- Frontend: reactive-forms validators mirror the rules (email format, password ≥8 on signup/reset, borrowing period 1–30 custom validator); normalized `AppError` messages surfaced inline; denial reason required by the dialog.

## 24. Testing
- Backend unit tests (MSTest + Moq + FluentAssertions): `BorrowingServiceCreateTests`, `BorrowingServiceDecisionTests`, `NotificationServiceTests`.
- Frontend: Vitest component test for the app shell.
- Manual end-to-end verification was performed during development (auth, borrow, approve/deny, notifications, password reset, account deletion) using automated browser sessions.

## 25. Technical Challenges
1. **No CORS on the API** → solved with an Angular dev proxy for `/api` and `/hubs` (WebSockets included).
2. **Duplicate-prone mutations** → retry interceptor restricted to GET only; approve/deny/borrow never retried; 409 conflicts trigger authoritative refetch instead of blind retries.
3. **SignalR gaps during disconnects** → automatic reconnect + debounced REST refetch of persisted notifications (`HubReconnectHandler`).
4. **ASP.NET long-form JWT claim names** (role under `http://schemas.microsoft.com/...`) → frontend claim resolver accepts both short and long forms.
5. **Real-time + REST dual sources** → notifications store merges pushed events with paged REST history and keeps the header unread badge in sync.
6. **Restrict FK on user deletion** → transactional deletion of user-owned rows before removing the user.
7. **Timezone display consistency** → UI formats all timestamps in `Africa/Cairo` via `Intl.DateTimeFormat`, independent of device settings.

## 26. Solutions Summary
See §25 — each challenge lists its implemented solution. Additional design solutions: Result pattern + middleware for uniform errors; action-dispatch domain services; generic repository + unit-of-work for transactional consistency; design-token SCSS system for a consistent responsive UI.

## 27. Future Improvements
- Admin CRUD for books (backend endpoints not yet implemented — listed in docs as "Admins can manage books").
- Refresh tokens / sliding sessions (currently single 120-minute JWT).
- Return workflow UI (status `Returned` exists in the model but no dedicated endpoint is exposed).
- Email notifications in addition to in-app/SignalR for all event types (SMTP infrastructure already present).
- Automated E2E test suite (Playwright) covering the verified manual flows.
