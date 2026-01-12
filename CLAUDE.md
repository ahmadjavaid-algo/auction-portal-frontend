# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Angular 20 application for an auction portal system with three distinct user roles:
- **Admin**: Manages auctions, inventory, bidders, inspectors, and system configuration
- **Bidder**: Participates in live auctions, views inventory, places bids
- **Inspector**: Performs vehicle inspections and submits inspection reports

The application uses Angular Material for UI components, SignalR for real-time bidding notifications, and communicates with a backend API at `http://localhost:5070/api`.

## Development Commands

```bash
# Start development server (runs on http://localhost:4200)
npm start
# or
ng serve

# Build for production
npm run build
# or
ng build

# Run tests
npm test
# or
ng test

# Watch mode for development builds
npm run watch
```

## Architecture

### Module Structure

The application uses lazy-loaded feature modules organized by user role:

```
src/app/
├── features/
│   ├── user-admin/          # Admin portal module
│   │   ├── pages/           # Admin-specific pages (dashboard, users, roles, etc.)
│   │   ├── layout/          # AdminLayout component
│   │   ├── user-admin-module.ts
│   │   └── user-admin-routing-module.ts
│   ├── bidder-portal/bidder/ # Bidder portal module
│   │   ├── pages/           # Bidder-specific pages (auctions, bids, favourites, etc.)
│   │   ├── bidder-layout/   # BidderLayout component
│   │   ├── bidder-module.ts
│   │   └── bidder-routing-module.ts
│   └── inspector/           # Inspector portal module
│       ├── pages/           # Inspector-specific pages (inspections, dashboard, etc.)
│       ├── inspector-layout/ # InspectorLayout component
│       ├── inspector-module.ts
│       └── inspector-routing-module.ts
├── services/                # Shared services (API clients, auth, SignalR hubs)
├── models/                  # TypeScript models/interfaces
├── guards/                  # Route guards (auth, bidderauth, inspectorauth)
├── app.routes.ts            # Root routing configuration
└── app.config.ts            # Application configuration
```

### Routing Structure

The root routes lazy-load feature modules by role:
- `/admin/*` → UserAdminModule
- `/bidder/*` → BidderModule
- `/inspector/*` → InspectorModule
- Default redirect: `/bidder`

Each module has its own authentication guard:
- Admin: `authGuard` (uses `AuthService`)
- Bidder: `bidderauthGuard` (uses `BidderAuthService`)
- Inspector: `inspectorauthGuard` (uses `InspectorAuthService`)

### Authentication Pattern

Each user role has a dedicated authentication service that manages:
- JWT token storage in localStorage (`ap_token`, `bp_token`, or `ip_token`)
- User information storage (`ap_user`, `bp_user`, or `ip_user`)
- Token expiration validation
- Login/logout operations

Services:
- `AuthService` (Admin): [src/app/services/auth.ts](src/app/services/auth.ts)
- `BidderAuthService` (Bidder): [src/app/services/bidderauth.ts](src/app/services/bidderauth.ts)
- `InspectorAuthService` (Inspector): [src/app/services/inspectorauth.ts](src/app/services/inspectorauth.ts)

### Real-time Features

The application uses SignalR for real-time notifications:

**Bidder Notifications** ([notification-hub.service.ts](src/app/services/notification-hub.service.ts)):
- Favourite added/removed
- Auction starting soon/started/ending soon/ended
- Bid winning/outbid status
- Auction won/lost results

**Admin Notifications** ([admin-notification-hub.service.ts](src/app/services/admin-notification-hub.service.ts)):
- System notifications for administrators

SignalR hubs connect to `http://localhost:5070/hubs/notifications` and `http://localhost:5070/hubs/adminnotifications`.

### Service Layer Pattern

All API communication follows a consistent pattern:
1. Services inject `HttpClient` and the appropriate auth service
2. Private `authHeaders()` method creates Authorization headers with Bearer token
3. CRUD methods (getList, getById, add, update, activate) follow standard conventions
4. Base URL: `http://localhost:5070/api`

Example services:
- Auctions: [src/app/services/auctions.service.ts](src/app/services/auctions.service.ts)
- Bidders: [src/app/services/bidders.service.ts](src/app/services/bidders.service.ts)
- Inventory: [src/app/services/inventory.service.ts](src/app/services/inventory.service.ts)
- AuctionBids: [src/app/services/auctionbids.service.ts](src/app/services/auctionbids.service.ts)

### Live Auction Bidding

The bidding page ([auctionbid.ts](src/app/features/bidder-portal/bidder/pages/auctionbid/auctionbid.ts)) is the most complex component:
- Real-time bid updates via SignalR
- Countdown timers for auction status
- Auto-bid functionality
- Related lots carousel
- Vehicle inspection report display
- Image gallery with multiple document types

## TypeScript Configuration

The project uses strict TypeScript settings:
- `strict: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`
- `strictTemplates: true` (Angular compiler)

When making changes, ensure code satisfies all strict mode requirements.

## Styling

- Primary styling: SCSS (configured in angular.json)
- UI framework: Angular Material 20
- Component styles: Co-located `.scss` files
- Global styles: [src/styles.scss](src/styles.scss)

## Important Patterns

### Component File Naming
- Component classes: PascalCase without "Component" suffix (e.g., `Dashboard`, `UsersList`)
- File names: kebab-case with extension (e.g., `dashboard.ts`, `users-list.html`)
- Templates: `.html` extension (not `.component.html`)
- Styles: `.scss` extension (not `.component.scss`)

### Model Files
Models are in [src/app/models/](src/app/models/) with `.model.ts` suffix. They represent DTOs from the backend API with properties in camelCase (though some API responses use PascalCase - services handle the mapping).

### Page Organization
Pages within feature modules follow a consistent structure:
- List pages: Display data tables/grids (e.g., `users-list`, `auctions-list`)
- Details pages: View/edit forms (e.g., `users-details`, `auctions-details`)
- Form pages: Create/update operations (e.g., `users-form`, `auctions-form`)

### Guards and Protected Routes
All authenticated routes must be wrapped in a layout component with the appropriate guard in the routing configuration. Each portal has its own layout component that typically includes navigation, header, and outlet for child routes.

## API Integration Notes

- Backend expects PascalCase in some endpoints and camelCase in others
- Services handle case conversion where needed
- File uploads use FormData for images/documents
- Query parameters use HttpParams builder
- Most responses return simple types (boolean for success, number for IDs, arrays for lists)
