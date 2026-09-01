# Presentation Plan — Library System

Target: 20 slides, 16:9 widescreen, professional academic/technical style.
Design language: indigo (#4F46E5) primary + slate neutrals (matches the app's actual design tokens), Segoe UI, dark text on white, generous whitespace, one idea per slide.

| # | Title | Purpose | Main message | Content | Visuals | Speaker notes focus |
|---|---|---|---|---|---|---|
| 1 | Library System — Full-Stack Library Management | Title | Introduce the project | Title, subtitle (Angular 21 + .NET 10 + SQL Server), author line, hero screenshot | 04-catalog.png (right half) | Greet, one-sentence pitch, stack mention |
| 2 | Agenda | Orientation | What will be covered | 6 numbered sections | Numbered list layout | Fast walkthrough |
| 3 | Problem & Objectives | Motivation | Why this system exists | Manual-process pain points → objectives | Two-column: problem / objectives | Tie pain points to features |
| 4 | Users & Roles | Actors | Two roles, one system | User vs Admin capability table | Two role cards | Role enforcement exists on both tiers |
| 5 | Feature Overview | Scope | What was built | User features / Admin features lists | Two columns with icons | Emphasize everything shown is implemented |
| 6 | Technology Stack | Stack | Modern, strictly-typed stack | Frontend / Backend / Database table | Three-column table | Versions from package.json/csproj |
| 7 | System Architecture | Architecture | One integrated system | Browser → Angular SPA → REST + SignalR → .NET API → Business → Data → SQL Server; RabbitMQ + background job side-car | system-architecture.png | Full-width diagram |
| 8 | Frontend Architecture | Frontend | Core/Shared/Features layers | Folder map + patterns (signals stores, guards, interceptors) | frontend-architecture.png | Explain lazy features |
| 9 | Backend Architecture | Backend | Real N-tier layers | Controllers → Services → UnitOfWork → GenericRepository → EF Core → SQL Server; cross-cutting (middleware, validators, messaging) | backend-architecture.png | Result pattern + middleware |
| 10 | Database Design | Data | 5 entities, real relationships | ER-style diagram + status lifecycle | database-architecture.png | Explain FK behaviors + lifecycle |
| 11 | Authentication & Authorization | Security | JWT end-to-end | Login → JWT → store → interceptor → protected API → role checks | authentication-flow.png | Mention PBKDF2 + roles |
| 12 | Frontend ↔ Backend Integration | Integration | Trace a real request | Borrow action trace down and back; proxy; SignalR push | frontend-backend-flow.png | Follow the arrows |
| 13 | WSO2 + ngrok — One Secured Entry Point | Gateway | All traffic through the gateway | Angular → ngrok → WSO2 → .NET API flow; API base, token endpoint, gateway policies | Shape-built flow diagram + config rows | Never call the backend directly |
| 14 | Two Tokens, One Request | Gateway | Dual-token auth scheme | Code block (Authorization + user headers); 4 numbered steps; swap policy | Shape-built code panel + steps | Token caching, swap policy, verified results |
| 15 | Inside API Manager — Resources & Token Policy | Gateway | Resources + governance | Resources mirrored from backend contract (auth, books, borrowing, admin, notifications); integration vs backend token cards | Shape-built resource rows + policy cards | Policies standardize handling, no backend changes |
| 16 | Asynchronous Processing | Architecture | RabbitMQ decoupling | POST /api/borrow → queue → consumer → admin notified | main-user-workflow.png (borrow sequence) | Why async; single consumer |
| 17 | Key Screens — User | UI | User journey | Catalog + Book detail + My requests screenshots | 3 screenshots grid | Narrate borrow flow |
| 18 | Key Screens — Admin | UI | Review journey | Review queue + Notifications screenshots | 2 screenshots | Approve/deny, deny reason required |
| 19 | Security & Validation | Quality | Defense in depth | PBKDF2, JWT, roles, validation both sides, error envelope | Table/two columns | Anti-enumeration detail |
| 20 | Testing, Future Work & Conclusion | Close | Verified + roadmap | Test projects, verified flows, future list, thank-you | Summary + screenshot | End with demo invitation |

Assets required:
- Diagrams: system-architecture.png, frontend-architecture.png, backend-architecture.png, database-architecture.png, authentication-flow.png, frontend-backend-flow.png, borrow-workflow.png
- Screenshots: 01, 03, 04, 05, 07, 08, 10 (+02, 09 optional)

Every slide gets speaker notes (pptcli notes set-notes-text).
