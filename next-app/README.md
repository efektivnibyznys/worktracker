# Work Tracker - Next.js Edition

Modern time tracking and project management application built with Next.js 15.

## 🚀 Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase (PostgreSQL)
- **State Management:** Zustand
- **Data Fetching:** TanStack Query (React Query)
- **Forms:** React Hook Form + Zod
- **Charts:** Recharts
- **Date Handling:** date-fns

## 📁 Project Structure

```
next-app/
├── app/                    # Next.js App Router
├── components/             # Shared components
│   ├── ui/                # shadcn/ui components
│   ├── forms/             # Form components
│   ├── charts/            # Chart components
│   └── layout/            # Layout components
├── features/              # Feature modules
│   └── time-tracking/    # Time tracking feature
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── types/
│       └── utils/
├── lib/                   # Shared libraries
│   ├── supabase/         # Supabase client & services
│   ├── hooks/            # Global hooks
│   ├── stores/           # Zustand stores
│   └── utils/            # Utility functions
├── types/                 # TypeScript types
└── config/               # App configuration
```

## 🛠️ Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run type-check

# Lint
npm run lint
```

## 📝 Environment Variables

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🎯 Migration Status

This is the Next.js migration of the original Work Tracker application.

**Current Phase:** Phase 1 - Next.js Setup ✅
**Next Phase:** Phase 2 - Core Infrastructure

See `../MODERNIZATION_PLAN.md` and `../MIGRATION_LOG.md` for details.

## 📦 Installed Packages

### Core
- next@^15.1.0
- react@^19.0.0
- typescript@^5

### UI & Styling
- tailwindcss@^3.4.1
- shadcn/ui components
- lucide-react (icons)

### State & Data
- @supabase/supabase-js
- @supabase/ssr
- zustand
- @tanstack/react-query

### Forms & Validation
- react-hook-form
- zod
- @hookform/resolvers

### Utils
- date-fns
- recharts

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Supabase](https://supabase.com/docs)

---

**Version:** 2.0.0 (Next.js Migration)
**Status:** In Development
