# Resumes the open draft session: applies speaker notes, saves, exports renders.
$ErrorActionPreference = 'Stop'
$s = "29df0df098154b05bbfdce872fb9347c"

function Invoke-Ppt {
  param([string[]]$ArgsList)
  $out = & pptcli @ArgsList 2>&1 | Out-String
  if ($out -match '"success":false') { throw "pptcli failed: $($out.Substring(0, [Math]::Min(300, $out.Length)))" }
  return ($out | ConvertFrom-Json)
}

$notes = @(
  'Welcome. This is our full-stack Library System: an Angular single-page application backed by a .NET Web API and SQL Server. On the right is the real application - a live catalog with search, sorting and availability filtering. Everything shown today is implemented and working, not mockups.',
  'Quick roadmap: we start with the problem and objectives, look at roles and features, then the technology stack and the architecture of all three tiers, followed by security, integration, real screens, the challenges we solved, and finally testing and future work.',
  'The problem: manual borrowing workflows are slow, easy to lose track of, and give librarians no live view. Our objectives map one-to-one to features: digitalize the lifecycle with an audit trail, enforce rules on both tiers, decouple processing through a message queue, and notify people in real time.',
  'Two roles only - deliberately simple. A User browses and borrows; an Admin reviews and decides. The key point: roles are not UI cosmetics. They are stored in the database, embedded in the JWT, enforced with Authorize attributes on the API, and mirrored by Angular route guards for UX.',
  'Every feature listed is implemented and verified. Highlight the engineering depth: password reset with single-use hashed tokens, borrow requests flowing through RabbitMQ, notifications merged from two sources (REST history plus real-time pushes), and password-confirmed account deletion that cleans up all user data transactionally.',
  'Stack choices: Angular 21 with standalone components and signals for state; .NET 10 with EF Core and JWT; SQL Server code-first; RabbitMQ for async; SignalR for real-time. The frontend never touches the database directly - everything goes through the REST API contract.',
  'The big picture. Top row: browser, Angular SPA, .NET API, SQL Server. Below: two supporting systems. RabbitMQ decouples submission from processing - the API acknowledges immediately and a consumer persists the request. The expiration job and the SignalR hub handle reminders and real-time delivery.',
  'Frontend architecture: Core contains singletons (auth store, interceptors, SignalR client, layout). Shared contains stateless reusable pieces - the UI kit, pipes, validators. Features are lazy-loaded domains, each owning its data stores, API services and pages. State is signals-based; the retry interceptor only ever retries GETs, so a borrow or an approval can never be duplicated by a network blip.',
  'Backend: a strict N-tier. Controllers receive DTOs and return the Result pattern; business services contain the rules; the unit of work coordinates generic repositories; EF Core talks to SQL Server. Cross-cutting: exception middleware returns one uniform error envelope, and the messaging, notification and job services sit beside the layers without polluting them.',
  'Database: five entities. User and Book both have Restrict FKs to borrowing requests - history cannot be orphaned. Reset tokens cascade with their user. The status lifecycle is enforced by an enum, and the Expired transition is driven by the background job. Note the unique indexes on email and reset-token hash, and composite indexes for inbox queries.',
  'Security flow. Left: sign-in verifies the password against its PBKDF2 hash and issues a signed 120-minute JWT containing the role claim; unknown users and wrong passwords get the same message so attackers cannot enumerate accounts. Right: every request carries the Bearer token; the API validates it and checks role attributes. SignalR accepts the same token via the access_token handshake.',
  'Integration trace of one real request - the borrow. Down the left: form validation, API service, interceptors, proxy, controller, RabbitMQ publisher. Up the right: the consumer persists the request as Pending, admins get a live push, the decision endpoints update the row, and the user is notified. All endpoints shown are the real ones from the API contract.',
  'The end-to-end user journey with the enforced rules summarized at the bottom: period validated 1-30 on both tiers, five statuses, two notification channels, and every decision audited with reviewer, timestamp and denial reason.',
  'User journey screens - real captures from the running app. The catalog supports deep-linkable filters (they survive refresh and sharing), the detail page exposes the borrow form with inline validation, and My Requests shows each status with a color-plus-icon badge and Cairo-local timestamps.',
  'Admin side: the review queue with status filtering, approve with an optional audit note, deny with a mandatory written reason that the user later sees. The notifications inbox merges live SignalR pushes with the REST history and keeps the unread badge in sync. Conflicts - for example two admins deciding simultaneously - surface a 409 and the list refreshes to authoritative state.',
  'Security and validation form defense in depth. Server-side: PBKDF2 hashing, signed JWTs, role attributes, DTO validation gates and business rules. Client-side: the same rules mirrored in reactive forms for fast feedback, and a normalized error model so users only ever see friendly messages. The uniform error envelope keeps the contract consistent.',
  'Four real challenges with their solutions. The two worth narrating: first, retries - blindly retrying a borrow or approval could duplicate decisions, so only GET requests retry and conflicts refetch. Second, SignalR gaps - while disconnected, pushes are lost, so after reconnecting we deliberately refetch the persisted notification history over REST.',
  'Testing: unit tests cover the borrowing create rules, the approve/deny decisions and notification behavior on the backend; the frontend has component tests; all major flows were verified end-to-end in automated browser sessions. Future work is scoping, not missing foundations. Close by inviting questions and offering a live demo.'
)

for ($n = 0; $n -lt 18; $n++) {
  Invoke-Ppt @('notes','set-notes-text','-s',$s,'--slide-index',"$(($n+1))",'--text',$notes[$n]) | Out-Null
  Write-Host "notes: slide $($n+1)"
}

Invoke-Ppt @('session','close',$s,'--save','true') | Out-Null
Write-Host 'SAVED AND CLOSED'
