# LayoffTracker - Comprehensive Development Prompt

## Project Overview
Create a comprehensive layoff tracking and career resilience platform that provides real-time insights into workforce dynamics and job market trends, empowering professionals to navigate career uncertainties with advanced analytics and user-centric design.

## Core Mission
Build a tool that helps professionals stay informed about layoff activities at companies they care about, with personalized notifications, AI-powered risk analysis, and comprehensive data visualization - all while maintaining a beautiful, accessible user experience.

## Technical Architecture Requirements

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query v5 for server state management
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom gradient color scheme (purple, pink, orange, teal)
- **Build Tool**: Vite with hot module replacement for development
- **Form Handling**: React Hook Form with Zod validation

### Backend Stack
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe queries
- **Authentication**: Multi-provider system supporting:
  - Replit OpenID Connect authentication
  - Magic link passwordless authentication
  - Session management with PostgreSQL storage
- **Email Service**: Multi-provider email system (SendGrid, Gmail, Brevo, custom SMTP)

### Database Schema Design
```typescript
// Core entities with comprehensive fields
- Users: Profile data, subscription plans, notification preferences, admin roles
- Companies: Fortune 500 database with employee counts, financial data, headquarters
- LayoffEvents: Historical data with job titles, severity levels, source tracking
- Notifications: User alert system for layoff notifications
- CompanyActivities: Activity feed for company updates
- UserCompanySubscriptions: Track which companies users monitor
- MagicLinkTokens: Secure passwordless authentication tokens
- Sessions: PostgreSQL-backed session storage
```

## Key Features & Functionality

### 1. Public Company Database
- Fortune 500 companies with comprehensive employee data
- Real company logos using Clearbit API integration
- Interactive filtering by industry, country, funding stage, headcount
- Professional data visualization with color-coded status badges
- Comprehensive company profiles with financial information

### 2. Layoff Tracking System
- Historical layoff data with detailed analytics
- Real-time layoff event reporting and monitoring
- Data visualization using Recharts library
- Trends analysis by year, industry, state, and job titles
- Source tracking from multiple data providers (layoffs.fyi, warntracker.com, etc.)

### 3. User Authentication & Profiles
- Magic link passwordless authentication with 15-minute token expiration
- User profile management with job titles and notification preferences
- Subscription plan system (Free, Pro, Premium) with tiered access
- Company selection and monitoring based on subscription level

### 4. AI-Powered Risk Scanner
- Personalized job security analysis using Anthropic Claude
- Career protection recommendations
- Industry risk assessment
- Personalized insights based on user profile

### 5. Admin Dashboard
- Comprehensive content management system
- Company CRUD operations with form validation
- User management and role assignment
- System analytics and monitoring
- Layoff event management interface

### 6. Analytics & Visualization
- Historical layoff trends with interactive charts
- Geographic analysis by state and country
- Industry-specific insights and patterns
- Real-time dashboard with key metrics

## Design System & UI/UX

### Visual Design
- **Color Scheme**: Multi-color gradients (purple-to-pink, orange-to-teal)
- **Typography**: Clean, professional typography hierarchy
- **Components**: Consistent shadcn/ui component library
- **Responsive**: Mobile-first responsive design
- **Accessibility**: WCAG compliance with proper ARIA labels

### User Experience Principles
- **Simplicity**: Clean, intuitive navigation and interfaces
- **Performance**: Fast loading with optimized queries and caching
- **Reliability**: Robust error handling and user feedback
- **Personalization**: Tailored content based on user preferences and subscription

## Authentication Strategy

### Multi-Provider Authentication
```typescript
// Replit OAuth Integration
- OpenID Connect with automatic user creation
- Session management with PostgreSQL storage
- Role-based access control (user, admin)

// Magic Link Authentication
- Secure token generation with crypto.randomBytes
- 15-minute expiration with one-time use validation
- Automatic user account creation for new emails
- Email delivery through multiple service providers
```

### Security Measures
- Secure session storage in PostgreSQL
- Token-based authentication with expiration
- Admin role protection for sensitive endpoints
- Input validation using Zod schemas

## Data Integration & Sources

### External Data Sources
- **layoffs.fyi**: Primary layoff tracking data
- **warntracker.com**: Government WARN notice data
- **layoffdata.com**: Additional layoff tracking
- **Clearbit API**: Company logos and enrichment data
- **Fortune 500 Data**: Employee counts and financial information

### Email Service Integration
```typescript
// Multi-provider email system
- Primary: Brevo (300 emails/day free tier, GDPR compliant)
- Fallback: SendGrid, Gmail SMTP, Custom SMTP
- Automatic provider detection and failover
- Template-based magic link emails
```

## Performance & Scalability

### Frontend Optimization
- React Query caching with proper invalidation strategies
- Code splitting with lazy loading for routes
- Optimized bundle size with Vite tree shaking
- Image optimization and lazy loading

### Backend Optimization
- Database connection pooling with Neon serverless
- Efficient database queries with proper indexing
- API response caching where appropriate
- Pagination for large data sets

## Development Workflow

### Code Quality
- **Type Safety**: Full TypeScript coverage across frontend and backend
- **Schema Validation**: Zod schemas for runtime type checking
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Testing**: Component and API endpoint testing

### Development Environment
- **Hot Reload**: Vite dev server with instant updates
- **Database**: Drizzle push for schema synchronization
- **Environment**: Replit-optimized development setup
- **Debugging**: Comprehensive logging and error reporting

## Deployment & Production

### Build Process
- Frontend: Vite optimized production build to `dist/public`
- Backend: ESBuild bundle to `dist/index.js`
- Static serving: Express serves built frontend assets
- Database: Migration handling via Drizzle Kit

### Environment Configuration
```typescript
// Required environment variables
- DATABASE_URL: PostgreSQL connection string
- SESSION_SECRET: Session encryption key
- ANTHROPIC_API_KEY: AI-powered risk analysis
- Email service credentials (BREVO_API_KEY, etc.)
- Replit domain and OAuth configuration
```

## Feature Implementation Guidelines

### 1. Data-First Development
- Always implement database schema first in `shared/schema.ts`
- Use Drizzle relations for proper data modeling
- Implement storage interface before API routes
- Validate all inputs with Zod schemas

### 2. Component Architecture
- Use shadcn/ui components for consistency
- Implement proper loading and error states
- Use React Query for all server state management
- Follow responsive design principles

### 3. Authentication Flow
- Protect admin routes with role-based middleware
- Implement proper session management
- Handle authentication errors gracefully
- Provide clear user feedback for auth states

### 4. Admin Interface
- Role-based access control for all admin features
- Comprehensive CRUD operations with validation
- Real-time data updates with cache invalidation
- Professional admin dashboard with metrics

## Success Metrics

### User Experience
- Fast page load times (<2 seconds)
- Intuitive navigation and user flows
- Responsive design across all devices
- Accessible interface for all users

### Functionality
- Reliable layoff tracking and notifications
- Accurate company data and analytics
- Smooth authentication experience
- Comprehensive admin management tools

### Technical Excellence
- Type-safe codebase with minimal runtime errors
- Efficient database queries and caching
- Robust error handling and recovery
- Scalable architecture for future growth

## Implementation Priorities

1. **Core Infrastructure**: Database schema, authentication, basic CRUD operations
2. **Public Features**: Company database, layoff tracking, analytics dashboard
3. **User Features**: Profile management, notifications, subscription system
4. **AI Integration**: Risk scanner with Anthropic Claude integration
5. **Admin Tools**: Content management, user administration, system monitoring
6. **Performance**: Optimization, caching, and scalability improvements

This comprehensive prompt serves as the blueprint for building a professional-grade layoff tracking platform that combines real-time data, AI-powered insights, and exceptional user experience in a scalable, maintainable architecture.