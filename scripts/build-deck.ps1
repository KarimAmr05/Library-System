# Builds Library_System_Presentation_Draft.pptx via pptcli.
# Canvas: 960 x 540 points (16:9). All shape coordinates in points.
# ASCII-only source: Windows PowerShell 5.1 misreads UTF-8 .ps1 files without BOM.
# Hardened: per-call retry, merged bullet text boxes, fully captured pipeline output.

$ErrorActionPreference = 'Stop'
$OUT = "D:\VS Code\Projects\Library-System\presentation\output"
$ASSETS = "D:\VS Code\Projects\Library-System\presentation\assets"
$BULLET = [char]0x2022
$MID = [char]0x00B7
$ARROW = [char]0x2192

function Invoke-Ppt {
  param([string[]]$ArgsList)
  $last = ''
  for ($a = 0; $a -lt 3; $a++) {
    $out = & pptcli @ArgsList 2>&1 | Out-String
    $last = $out
    if ($out -match '"success":true') { return ($out | ConvertFrom-Json) }
    if ($a -lt 2) { Start-Sleep -Seconds 2 }
  }
  throw "pptcli failed: $($last.Substring(0, [Math]::Min(300, $last.Length)))"
}

function Convert-Hex {
  param([string]$Hex)
  $h = $Hex.TrimStart('#')
  return @{
    red   = [int]::Parse($h.Substring(0, 2), 'HexNumber')
    green = [int]::Parse($h.Substring(2, 2), 'HexNumber')
    blue  = [int]::Parse($h.Substring(4, 2), 'HexNumber')
  }
}

function Add-Slide {
  param([string]$Session)
  return (Invoke-Ppt @('slide','add-blank','-s',$Session)).slideIndex
}

function Add-Rect {
  param([string]$Session,[int]$Slide,[double]$X,[double]$Y,[double]$W,[double]$H,[string]$FillHex)
  $r = Invoke-Ppt @('shape','add-rectangle','-s',$Session,'--slide-index',"$Slide",'--left',"$X",'--top',"$Y",'--width',"$W",'--height',"$H")
  $idx = $r.shapeIndex
  $c = Convert-Hex $FillHex
  Invoke-Ppt @('shape','set-fill','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--red',$c.red,'--green',$c.green,'--blue',$c.blue) | Out-Null
  return $idx
}

function Add-RectL {
  # rectangle with border
  param([string]$Session,[int]$Slide,[double]$X,[double]$Y,[double]$W,[double]$H,[string]$FillHex)
  $r = Invoke-Ppt @('shape','add-rectangle','-s',$Session,'--slide-index',"$Slide",'--left',"$X",'--top',"$Y",'--width',"$W",'--height',"$H")
  $idx = $r.shapeIndex
  $c = Convert-Hex $FillHex
  Invoke-Ppt @('shape','set-fill','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--red',$c.red,'--green',$c.green,'--blue',$c.blue) | Out-Null
  Invoke-Ppt @('shape','set-line','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--red','203','--green','213','--blue','225','--weight','1') | Out-Null
  return $idx
}

function Add-Text {
  param([string]$Session,[int]$Slide,[double]$X,[double]$Y,[double]$W,[double]$H,[string]$Text,
        [double]$Size,[string]$Color,[switch]$Bold,[string]$Align,[string]$Font = 'Segoe UI')
  $r = Invoke-Ppt @('shape','add-text-box','-s',$Session,'--slide-index',"$Slide",'--left',"$X",'--top',"$Y",'--width',"$W",'--height',"$H",'--text',$Text)
  $idx = $r.shapeIndex
  $c = Convert-Hex $Color
  Invoke-Ppt @('textframe','set-font-name','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--font-name',$Font) | Out-Null
  Invoke-Ppt @('textframe','set-font-size','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--font-size',"$Size") | Out-Null
  Invoke-Ppt @('textframe','set-font-color','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--red',$c.red,'--green',$c.green,'--blue',$c.blue) | Out-Null
  if ($Bold) { Invoke-Ppt @('textframe','set-bold','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--bold','true') | Out-Null }
  if ($Align) {
    $alignMap = @{ center = 'ppAlignCenter'; right = 'ppAlignRight'; left = 'ppAlignLeft' }
    Invoke-Ppt @('textframe','set-alignment','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--alignment',$alignMap[$Align.ToLowerInvariant()]) | Out-Null
  }
  return $idx
}

function Add-Picture {
  param([string]$Session,[int]$Slide,[string]$Path,[double]$X,[double]$Y,[double]$W,[double]$H)
  $r = Invoke-Ppt @('image','add-picture','-s',$Session,'--slide-index',"$Slide",'--image-path',$Path,'--left',"$X",'--top',"$Y",'--width',"$W",'--height',"$H")
  return $r.shapeIndex
}

function Add-Header {
  param([string]$Session,[int]$Slide,[string]$Kicker,[string]$Title)
  Add-Rect $Session $Slide 48 46 7 50 '4F46E5' | Out-Null
  Add-Text $Session $Slide 68 44 760 20 $Kicker 11 '4F46E5' -Bold | Out-Null
  Add-Text $Session $Slide 68 63 820 44 $Title 27 '0F172A' -Bold | Out-Null
  Add-Rect $Session $Slide 48 122 864 1.5 'E2E8F0' | Out-Null
}

function Add-Footer {
  param([string]$Session,[int]$Slide,[int]$Number)
  Add-Text $Session $Slide 48 514 400 16 'Library System - University Project' 9 '94A3B8' | Out-Null
  Add-Text $Session $Slide 812 514 100 16 "$Number / 18" 9 '94A3B8' -Align 'right' | Out-Null
}

function Add-BulletCard {
  # Card with heading and ONE merged bullet text box (native bullets).
  param([string]$Session,[int]$Slide,[double]$X,[double]$Y,[double]$W,[double]$H,[string]$Heading,[string]$Color,[string[]]$Items,[double]$ItemSize = 12)
  Add-RectL $Session $Slide $X $Y $W $H 'FFFFFF' | Out-Null
  Add-Rect $Session $Slide $X $Y $W 4 $Color | Out-Null
  Add-Text $Session $Slide ($X + 16) ($Y + 12) ($W - 32) 22 $Heading 14 '0F172A' -Bold | Out-Null
  $lines = $Items -join "`r"
  $r = Invoke-Ppt @('shape','add-text-box','-s',$Session,'--slide-index',"$Slide",'--left',($X + 16),'--top',($Y + 42),'--width',($W - 30),'--height',($H - 54),'--text',$lines)
  $idx = $r.shapeIndex
  $c = Convert-Hex '475569'
  Invoke-Ppt @('textframe','set-font-name','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--font-name','Segoe UI') | Out-Null
  Invoke-Ppt @('textframe','set-font-size','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--font-size',"$ItemSize") | Out-Null
  Invoke-Ppt @('textframe','set-font-color','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--red',$c.red,'--green',$c.green,'--blue',$c.blue) | Out-Null
  Invoke-Ppt @('textframe','set-bullet','-s',$Session,'--slide-index',"$Slide",'--shape-index',"$idx",'--enabled','true','--character',"$BULLET") | Out-Null
}

# ---------- start ----------
$deck = Join-Path $OUT 'Library_System_Presentation_Draft.pptx'

$listJson = & pptcli session list 2>&1 | Out-String
try {
  $list = $listJson | ConvertFrom-Json
  foreach ($sess in $list.sessions) {
    Write-Host "closing orphan session $($sess.sessionId)"
    & pptcli session close $sess.sessionId | Out-Null
  }
} catch { }
if (Test-Path $deck) {
  $deleted = $false
  for ($attempt = 0; $attempt -lt 20 -and -not $deleted; $attempt++) {
    try { Remove-Item $deck -Force -ErrorAction Stop; $deleted = $true }
    catch { Write-Host "file locked, retry $attempt..."; Start-Sleep -Seconds 3 }
  }
  if (-not $deleted) { throw "Could not delete $deck" }
}

$s = (Invoke-Ppt @('session','create',$deck)).sessionId
Write-Host "session: $s"
Invoke-Ppt @('pagesetup','set-size','-s',$s,'--width','960','--height','540') | Out-Null

$shot = Join-Path $ASSETS 'screenshots'
$diag = Join-Path $ASSETS 'diagrams'

# ================= Slide 1 (index 2) - Title =================
$i = Add-Slide $s
Add-Rect $s $i 0 0 380 540 '4F46E5' | Out-Null
Add-Text $s $i 44 96 300 22 'UNIVERSITY  PROJECT' 12 'C7D2FE' -Bold | Out-Null
Add-Text $s $i 44 128 300 130 'Library System' 40 'FFFFFF' -Bold | Out-Null
Add-Text $s $i 44 252 300 60 'Full-Stack Library Management Platform' 16 'E0E7FF' | Out-Null
Add-Rect $s $i 44 322 60 3 'C7D2FE' | Out-Null
$stackLine = "Angular 21  $MID  .NET 10  $MID  SQL Server`nRabbitMQ  $MID  SignalR  $MID  JWT Security"
Add-Text $s $i 44 344 320 90 $stackLine 12.5 'C7D2FE' | Out-Null
Add-Text $s $i 44 480 300 20 'Presented by:  [Your Name]' 11 'E0E7FF' | Out-Null
Add-Picture $s $i (Join-Path $shot '04-catalog.png') 428 88 492 277 | Out-Null
Add-Text $s $i 428 376 492 20 'The actual application - live catalog with search, filters and pagination' 10.5 '64748B' -Align 'center' | Out-Null
Add-Text $s $i 428 500 492 18 'Supervisor:  [Supervisor Name]        Academic Year 2025 / 2026' 10 '94A3B8' -Align 'center' | Out-Null
Add-Footer $s $i 1

# ================= Slide 2 - Agenda =================
$i = Add-Slide $s
Add-Header $s $i 'AGENDA' 'What We Will Cover'
$agenda = @(
  @('01','Project Overview','Problem, objectives and user roles'),
  @('02','Technology Stack','Angular 21, .NET 10, SQL Server, RabbitMQ'),
  @('03','System Architecture','Frontend, backend and database design'),
  @('04','Security','JWT authentication and role authorization'),
  @('05','Integration','How the SPA talks to the API in real time'),
  @('06','Screens & Conclusions','Live UI, challenges, testing, roadmap')
)
$cols = @(@($agenda[0], $agenda[1], $agenda[2]), @($agenda[3], $agenda[4], $agenda[5]))
$cx = @(48, 492)
for ($c = 0; $c -lt 2; $c++) {
  $y = 160
  foreach ($a in $cols[$c]) {
    Add-RectL $s $i $cx[$c] $y 420 92 'FFFFFF' | Out-Null
    Add-Rect $s $i $cx[$c] $y 6 92 '4F46E5' | Out-Null
    Add-Text $s $i ($cx[$c] + 24) ($y + 14) 60 40 $a[0] 24 'C7D2FE' -Bold | Out-Null
    Add-Text $s $i ($cx[$c] + 92) ($y + 16) 310 26 $a[1] 15 '0F172A' -Bold | Out-Null
    Add-Text $s $i ($cx[$c] + 92) ($y + 44) 310 34 $a[2] 11 '64748B' | Out-Null
    $y += 116
  }
}
Add-Footer $s $i 2

# ================= Slide 3 - Problem & Objectives =================
$i = Add-Slide $s
Add-Header $s $i 'MOTIVATION' 'Problem Statement & Objectives'
Add-BulletCard $s $i 48 150 424 330 'The Problem' 'B91C1C' @(
  'Paper-based borrowing is slow and untraceable',
  'No shared source of truth for request status',
  'Librarians get no real-time awareness of new requests',
  'No automatic reminders before due dates',
  'Decisions lack an audit trail'
) 12.5
Add-BulletCard $s $i 492 150 420 330 'Objectives' '15803D' @(
  "Digitalize the borrow $ARROW review $ARROW return lifecycle",
  'Enforce rules on client and server (1-30 days, reason required)',
  'Decouple submission from processing with RabbitMQ',
  'Deliver real-time + persisted notifications (SignalR)',
  'Protect every endpoint with JWT and roles',
  'Full audit trail: requestedAt / reviewedAt / reviewedBy'
) 12.5
Add-Footer $s $i 3

# ================= Slide 4 - Users & Roles =================
$i = Add-Slide $s
Add-Header $s $i 'ACTORS' 'Target Users & Roles'
Add-BulletCard $s $i 48 150 424 290 'User - library member' '4F46E5' @(
  'Register and sign in with email / password',
  'Browse, search, filter and sort the catalog',
  'Request to borrow a book for 1-30 days',
  'Track own borrowing history and statuses',
  'Receive real-time notifications and reminders'
) 12.5
Add-BulletCard $s $i 492 150 420 290 'Admin - librarian' 'B45309' @(
  'Review the full borrowing-request queue',
  'Approve requests (optional approval note)',
  'Deny requests - reason is mandatory',
  'Get notified the moment a request arrives',
  'Monitor upcoming due dates (expiration job)'
) 12.5
Add-Rect $s $i 48 460 864 40 'EEF2FF' | Out-Null
Add-Text $s $i 64 468 830 26 'Roles live on User.Role, are embedded in the JWT role claim, and are enforced with [Authorize(Roles=...)] on the API plus route guards in Angular.' 11 '3730A3' | Out-Null
Add-Footer $s $i 4

# ================= Slide 5 - Feature Overview =================
$i = Add-Slide $s
Add-Header $s $i 'SCOPE' 'Implemented Features'
Add-BulletCard $s $i 48 148 424 348 'User features' '4F46E5' @(
  'Account registration with instant sign-in',
  'Email + password login (JWT)',
  'Password reset via single-use emailed token',
  'Catalog search, sorting, availability filter, paging',
  'Borrow requests (1-30 days) via RabbitMQ',
  'My Requests history with status badges',
  'Notifications inbox - mark as read, unread badge',
  'Self-service account deletion (password-confirmed)'
) 12
Add-BulletCard $s $i 492 148 420 348 'Admin features' 'B45309' @(
  'Review queue with status filtering and paging',
  'Approve with optional audit note',
  'Deny with required reason (shown to the user)',
  'Real-time alert on every new borrow request',
  'Due-date reminders for users and admins',
  'Role-scoped data: users only ever see their own rows'
) 12
Add-Footer $s $i 5

# ================= Slide 6 - Technology Stack =================
$i = Add-Slide $s
Add-Header $s $i 'STACK' 'Technology Stack'
Add-BulletCard $s $i 48 148 276 336 'Frontend' '4F46E5' @(
  'Angular 21 (standalone, zoneless)',
  'TypeScript 5.9 strict',
  'Signals state management',
  'RxJS + @microsoft/signalr',
  'Reactive forms + validators',
  'SCSS design tokens',
  'Vitest tests, Vite dev server'
) 12
Add-BulletCard $s $i 336 148 276 336 'Backend' '0F172A' @(
  '.NET 10 ASP.NET Core Web API',
  'Entity Framework Core 10',
  'JWT Bearer authentication',
  'RabbitMQ.Client 7.2 messaging',
  'SignalR real-time hub',
  'Swashbuckle (Swagger) docs',
  'MSTest + Moq unit tests'
) 12
Add-BulletCard $s $i 624 148 288 336 'Data & Infrastructure' 'B45309' @(
  'SQL Server - code-first migrations',
  '5 entities, seeded dev data',
  'RabbitMQ broker (async queue)',
  'SMTP email delivery',
  'Angular dev proxy (no CORS)',
  'Git version control'
) 12
Add-Footer $s $i 6

# ================= Slides 7-12 - diagrams =================
$diagramSlides = @(
  @{ k='ARCHITECTURE';  t='System Architecture - One Integrated System'; img='system-architecture.png' },
  @{ k='FRONTEND';      t='Frontend Architecture (Angular 21)';          img='frontend-architecture.png' },
  @{ k='BACKEND';       t='Backend Architecture (.NET 10 N-Tier)';       img='backend-architecture.png' },
  @{ k='DATABASE';      t='Database Design - 5 Entities';                img='database-architecture.png' },
  @{ k='SECURITY FLOW'; t='Authentication & Authorization - JWT';        img='authentication-flow.png' },
  @{ k='INTEGRATION';   t='Frontend and Backend - a Real Request Trace'; img='frontend-backend-flow.png' }
)
$nIdx = 0
foreach ($d in $diagramSlides) {
  $nIdx++
  $i = Add-Slide $s
  Add-Header $s $i $d.k $d.t
  Add-Picture $s $i (Join-Path $diag $d.img) 48 136 864 486 | Out-Null
  Add-Footer $s $i (6 + $nIdx)
}

# ================= Slide 13 - main workflow =================
$i = Add-Slide $s
Add-Header $s $i 'MAIN WORKFLOW' 'Borrowing a Book - End to End'
Add-Picture $s $i (Join-Path $diag 'borrow-workflow.png') 48 140 864 441 | Out-Null
Add-Footer $s $i 13

# ================= Slide 14 - Screens: user =================
$i = Add-Slide $s
Add-Header $s $i 'USER EXPERIENCE' 'Key Screens - User Journey'
Add-Picture $s $i (Join-Path $shot '04-catalog.png') 48 148 280 158 | Out-Null
Add-Text $s $i 48 312 280 44 'Catalog - live search, sort by title/author/date, availability filter, deep-linkable filters' 10 '475569' | Out-Null
Add-Picture $s $i (Join-Path $shot '08-book-detail.png') 340 148 280 158 | Out-Null
Add-Text $s $i 340 312 280 44 'Book details - copies, ISBN, availability and the 1-30 day borrow form' 10 '475569' | Out-Null
Add-Picture $s $i (Join-Path $shot '10-my-requests.png') 632 148 280 158 | Out-Null
Add-Text $s $i 632 312 280 44 'My Requests - history with status badges and Cairo timestamps' 10 '475569' | Out-Null
Add-Rect $s $i 48 380 864 116 'EEF2FF' | Out-Null
Add-Text $s $i 64 392 830 96 "Registration and password reset are fully implemented: signing up issues a session immediately, and a forgotten password is recovered with a single-use emailed token that expires after 30 minutes. Users can also delete their account - it requires the current password and removes all their data in one transaction." 12 '3730A3' | Out-Null
Add-Footer $s $i 14

# ================= Slide 15 - Screens: admin =================
$i = Add-Slide $s
Add-Header $s $i 'ADMIN EXPERIENCE' 'Key Screens - Review & Notifications'
Add-Picture $s $i (Join-Path $shot '05-admin-review.png') 48 148 420 236 | Out-Null
Add-Text $s $i 48 392 420 44 'Review queue - approve or deny; denial requires a written reason; 409 conflicts refetch live state' 10.5 '475569' | Out-Null
Add-Picture $s $i (Join-Path $shot '07-notifications.png') 492 148 420 236 | Out-Null
Add-Text $s $i 492 392 420 44 'Notification inbox - real-time SignalR pushes merged with REST history, unread badge in the header' 10.5 '475569' | Out-Null
Add-Footer $s $i 15

# ================= Slide 16 - Security & Validation =================
$i = Add-Slide $s
Add-Header $s $i 'QUALITY' 'Security & Validation'
Add-BulletCard $s $i 48 148 424 340 'Security' '4F46E5' @(
  'PBKDF2-SHA256 hashing - 100k iterations, per-user salt',
  'JWT HMAC-SHA256, 120-min expiry, issuer/audience checks',
  'Role claims + [Authorize(Roles=...)] on every endpoint',
  'Reset tokens: SHA-256 stored, single-use, 30-min expiry',
  'Anti-enumeration: generic login / forgot-password replies',
  'Secrets from configuration - never committed to Git'
) 12
Add-BulletCard $s $i 492 148 420 340 'Validation' '15803D' @(
  'Server: DataAnnotations gate on every request DTO',
  'Server: 1-30 day period, deny reason 3+ chars',
  'Server: unique email = 409 CONFLICT',
  'Client: reactive forms mirror the same rules',
  'Client: normalized AppError = friendly inline messages',
  'Uniform error envelope: code, message, details, traceId'
) 12
Add-Footer $s $i 16

# ================= Slide 17 - Challenges & Solutions =================
$i = Add-Slide $s
Add-Header $s $i 'ENGINEERING' 'Technical Challenges & Solutions'
$chal = @(
  @('API had no CORS configuration', 'Angular dev proxy forwards /api and /hubs (WebSockets included)'),
  @('Retries could duplicate borrow/approve/deny', 'Retry interceptor restricted to GET only; 409 conflicts trigger an authoritative refetch'),
  @('SignalR misses events while disconnected', 'Automatic reconnect + debounced REST refetch of persisted notifications'),
  @('ASP.NET emits long-form JWT claim names', 'Frontend claim resolver accepts short and long claim URIs')
)
$y = 150
foreach ($c in $chal) {
  Add-RectL $s $i 48 $y 864 78 'FFFFFF' | Out-Null
  Add-Rect $s $i 48 $y 6 78 'B91C1C' | Out-Null
  Add-Text $s $i 70 ($y + 8) 350 24 $c[0] 13 'B91C1C' -Bold | Out-Null
  Add-Text $s $i 70 ($y + 40) 380 20 'CHALLENGE' 9 '94A3B8' | Out-Null
  Add-Text $s $i 470 ($y + 8) 420 20 'SOLUTION' 9 '94A3B8' | Out-Null
  Add-Text $s $i 470 ($y + 28) 424 46 $c[1] 11.5 '15803D' | Out-Null
  $y += 90
}
Add-Footer $s $i 17

# ================= Slide 18 - Testing, Future, Conclusion =================
$i = Add-Slide $s
Add-Header $s $i 'CLOSING' 'Testing, Future Work & Conclusion'
Add-BulletCard $s $i 48 148 276 306 'Testing' '4F46E5' @(
  'Backend unit tests (MSTest + Moq):',
  'BorrowingService create rules',
  'BorrowingService approve/deny',
  'NotificationService behavior',
  'Frontend: Vitest component tests',
  'Flows verified end-to-end in a browser'
) 11.5
Add-BulletCard $s $i 336 148 276 306 'Future work' 'B45309' @(
  'Admin CRUD for books',
  'Refresh tokens / sliding sessions',
  'Dedicated return-workflow endpoint',
  'Email notifications for all events',
  'Playwright E2E suite',
  'Docker Compose for the full stack'
) 11.5
Add-Rect $s $i 624 148 288 306 '4F46E5' | Out-Null
Add-Text $s $i 644 168 248 40 'Conclusion' 16 'FFFFFF' -Bold | Out-Null
$conclusion = "A production-style, contract-driven system: layered .NET API, modern Angular SPA, asynchronous messaging, real-time notifications and hardened security - all verified working end-to-end.`n`nThank you - questions welcome!"
Add-Text $s $i 644 210 248 230 $conclusion 12 'E0E7FF' | Out-Null
Add-Footer $s $i 18

# ================= finalize order =================
Invoke-Ppt @('slide','delete','-s',$s,'--slide-index','1') | Out-Null

# ================= speaker notes =================
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
}

Invoke-Ppt @('session','close',$s,'--save','true') | Out-Null
Write-Host 'DRAFT DECK CREATED'
