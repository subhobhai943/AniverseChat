# AniVerse AI - Manga & Anime Chatbot

## Overview

AniVerse AI is a full-stack Progressive Web App (PWA) featuring an intelligent chatbot specialized in anime and manga discussions. The application provides real-time chat functionality powered by the Perplexity API, designed with an anime-themed dark UI and glassmorphism effects. The system is built as a modern web application that can be installed on mobile devices like a native app.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript for type safety and modern development
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom anime-themed design system and Shadcn UI components
- **State Management**: TanStack Query for server state management and data fetching
- **UI Components**: Comprehensive Radix UI component library through Shadcn for accessible, customizable components
- **PWA Support**: Service worker implementation for offline capabilities and app-like experience

### Backend Architecture
- **Runtime**: Node.js with Express.js for RESTful API endpoints
- **Language**: TypeScript throughout for consistency and type safety
- **Storage**: In-memory storage system using Map data structures for chat sessions and messages
- **API Design**: RESTful endpoints for chat session management and message handling

### Data Storage Solutions
- **Primary Storage**: PostgreSQL database using Drizzle ORM
- **Database Provider**: Replit PostgreSQL (Neon-backed serverless database)
- **Session Management**: UUID-based session and message identification with express-session
- **Data Models**: Structured chat sessions, messages, and users with timestamps and role-based messaging
- **Schema Management**: Database schema pushed and ready using `npm run db:push`

### Authentication and Authorization
- **Current State**: Replit Auth integration for user authentication
- **Session Handling**: Express session middleware with PostgreSQL session store
- **User Management**: Automatic user creation on first access with unique session identifiers

### UI/UX Design Patterns
- **Theme**: Dark mode with anime-inspired color palette (orange/red gradients)
- **Typography**: Multiple font families including Inter, Orbitron, and JetBrains Mono
- **Responsive Design**: Mobile-first approach with comprehensive breakpoint handling
- **Animations**: CSS animations for message appearance and loading states
- **Accessibility**: Radix UI components provide built-in accessibility features

### Development Tooling
- **Build System**: Vite for fast development and optimized production builds
- **Type Checking**: TypeScript with strict configuration
- **Code Quality**: ESBuild for production bundling
- **Development Server**: Hot module replacement and error overlay for development experience

## External Dependencies

### Core AI Integration
- **Perplexity API**: Primary AI service for generating anime/manga-specialized responses
- **API Configuration**: Environment-based API key management with fallback support

### Database and ORM
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL schema management
- **Replit PostgreSQL**: Serverless PostgreSQL database (Neon-backed) provisioned and configured
- **Migration System**: Database schema versioning using `npm run db:push` command
- **Environment Variables**: DATABASE_URL, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, PGHOST configured

### UI and Styling
- **Radix UI**: Comprehensive accessible component primitives for complex UI elements
- **Tailwind CSS**: Utility-first CSS framework with custom design system extensions
- **Lucide React**: Icon library for consistent iconography
- **Google Fonts**: Web fonts for typography (Inter, Orbitron, JetBrains Mono)

### Development and Build Tools
- **Vite**: Modern build tool with plugin ecosystem for React and TypeScript
- **PostCSS**: CSS processing with Tailwind CSS and Autoprefixer
- **Replit Integration**: Development environment plugins for Replit-specific features

### Data Fetching and State
- **TanStack Query**: Server state management with caching, synchronization, and background updates
- **React Hook Form**: Form handling with validation support
- **Zod**: Runtime type validation and schema parsing

### PWA and Service Worker
- **Custom Service Worker**: Caching strategy for offline functionality
- **Web App Manifest**: PWA configuration for installation and native app experience
- **Workbox**: Service worker libraries for PWA features (potential future integration)

### Utility Libraries
- **Date-fns**: Date manipulation and formatting utilities
- **Class Variance Authority**: Utility for creating variant-based component APIs
- **CLSX**: Conditional className utility for dynamic styling

## Replit Environment Setup

### Current Status (Last Updated: October 3, 2025)
The application has been successfully configured to run in the Replit environment.

### Environment Configuration
- **Node.js**: Version 20 installed and configured
- **Package Manager**: npm (all dependencies installed)
- **Port Configuration**: Application serves on port 5000 (both frontend and backend)
- **Host Configuration**: 0.0.0.0 binding for Replit proxy compatibility
- **Vite Configuration**: Already configured with `allowedHosts: true` for Replit iframe proxy

### Database Setup
- **Database**: PostgreSQL database provisioned via Replit
- **Schema Status**: Database schema successfully pushed using `npm run db:push`
- **Tables Created**: users, sessions, chat_sessions, messages
- **Environment Variables**: All database connection variables configured (DATABASE_URL, PGPORT, PGUSER, PGPASSWORD, PGDATABASE, PGHOST)

### Integrations Installed
- **Replit Auth**: JavaScript login integration for user authentication
- **Perplexity API**: Blueprint for AI chat functionality (requires PERPLEXITY_API_KEY environment variable)
- **PostgreSQL Database**: Replit database integration

### Workflow Configuration
- **Workflow Name**: "Start application"
- **Command**: `npm run dev`
- **Output Type**: webview
- **Port**: 5000
- **Status**: Running successfully

### Required Environment Variables
To use the chat functionality, you need to set:
- **PERPLEXITY_API_KEY**: Your Perplexity API key for AI responses

### How to Run the Project
1. The application automatically starts via the "Start application" workflow
2. Access the application through the webview preview
3. The server serves both frontend (Vite) and backend (Express) on port 5000
4. Hot module replacement is enabled for development

### Build and Deployment
- **Development**: `npm run dev` (currently running)
- **Build**: `npm run build` (builds both frontend with Vite and backend with esbuild)
- **Production**: `npm run start` (runs the built application)
- **Database Migration**: `npm run db:push` (pushes schema changes to database)

### Recent Changes (October 3, 2025)
- Installed all npm dependencies
- Configured workflow for port 5000 with webview output
- Created PostgreSQL database
- Pushed database schema successfully
- Verified application running correctly with anime-themed UI
- Updated backend storage from in-memory to PostgreSQL database storage
- **Removed all authentication** - App now works without login/registration
- **Fixed Netlify serverless deployment** - Improved API error handling and session tracking
- Created NETLIFY_DEPLOYMENT.md guide for production deployment
- Both Replit (dev) and Netlify (production) deployments now fully functional

## Netlify Deployment

The app is fully configured for serverless deployment on Netlify:
- **Backend**: Serverless functions in `netlify/functions/api.mjs`
- **Frontend**: Static site built to `dist/public`
- **Storage**: In-memory (per function instance) - sessions persist during function lifetime
- **Authentication**: None required - works immediately without login

See `NETLIFY_DEPLOYMENT.md` for complete deployment instructions.