# Library System

Angular 21 application for managing a library workflow, including authentication, book browsing, borrow/request flows, and notifications.

## Overview

This frontend connects to a backend API and SignalR notification hub through a local proxy. The app is organized around a few primary features:

- `books` for catalog browsing and item discovery
- `requests` for user/library request workflows
- `notifications` for live updates and activity alerts
- auth pages for login, forgot password, and reset password flows

## Tech stack

- Angular 21
- TypeScript
- RxJS
- SignalR client for real-time notifications
- Vitest via Angular test runner

## Prerequisites

Before running the app locally, make sure you have:

- Node.js 20+ and npm
- A working backend service running at `https://localhost:7060`
- The app gateway configured as expected by the environment files in `src/environments/`

## Getting started

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm start
```

Then open:

```text
http://localhost:4200
```

The Angular dev server will run with the proxy configuration in `proxy.conf.json`, which forwards `/api` and `/hubs` traffic to the backend.

## Available scripts

```bash
npm start      # starts the Angular dev server
npm run build  # production build
npm run watch  # development watch build
npm test       # runs the unit tests
```



## Project notes

- API and realtime hub requests are proxied through `proxy.conf.json`
- Environment-specific URLs are defined in `src/environments/environment.ts`
- The project uses Angular standalone components and lazy-loaded feature routes

## Testing

Run the test suite with:

```bash
npm test
```

If you are using the backend or gateway locally, make sure it is running before testing flows that depend on API data or notifications.

## Contributing

Use the standard Angular CLI commands for feature generation when adding new components or routes, for example:

```bash
npx ng generate component component-name
```

More details are available in the Angular CLI documentation.
