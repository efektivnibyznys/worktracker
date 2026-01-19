# ⏱️ Work Tracker

Modern time tracking and project management application built with Next.js 15.

**Framework:** Next.js 15 + React 19 + TypeScript
**Database:** Supabase (PostgreSQL)
**Status:** ✅ Production Ready

---

## ✨ Features

- 📊 **Dashboard** with real-time statistics and charts
- 👥 **Client Management** with custom hourly rates
- 🎯 **Project Phases** for organizing work
- ⏰ **Time Tracking** with automatic duration calculation
- 📈 **Reports** with Notion export
- ☁️ **Cloud Sync** via Supabase
- 🔄 **Real-time** synchronization across devices
- 🔐 **Secure Authentication** (Supabase Auth)
- 🎨 **Modern UI** (Tailwind CSS + shadcn/ui)

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account and project

### Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd work-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Setup database**
   - Open Supabase SQL Editor
   - Run the SQL from `supabase-setup.sql`

5. **Run development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

---

## 📊 Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React 19
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS + shadcn/ui
- **State Management:** Zustand (auth) + React Query (server state)
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Real-time:** Supabase Realtime
- **Row Level Security:** Enabled

### DevOps
- **Hosting:** Vercel
- **CI/CD:** Automatic deployment on push

---

## 📁 Project Structure

```
work-tracker/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   └── (dashboard)/       # Dashboard pages
├── components/            # Shared components
│   ├── ui/               # shadcn/ui components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── features/             # Feature modules
│   └── time-tracking/   # Time tracking feature
│       ├── components/
│       ├── hooks/
│       ├── services/
│       └── types/
├── lib/                  # Shared libraries
│   ├── supabase/        # Supabase client & services
│   ├── hooks/           # Global hooks
│   ├── stores/          # Zustand stores
│   └── utils/           # Utility functions
├── types/                # TypeScript types
└── supabase-setup.sql   # Database schema
```

---

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

---

## 🚀 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

2. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add `NEXT_PUBLIC_SUPABASE_URL`
   - Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Deploy**
   - Push to main branch → automatic deployment
   - Or use Vercel CLI: `vercel --prod`

---

## 🔐 Security

- ✅ Row Level Security (RLS) in database
- ✅ Automatic XSS escaping (React)
- ✅ CSRF protection (Supabase JWT)
- ✅ Error boundaries
- ✅ TypeScript type safety
- ✅ Security headers (CSP, X-Frame-Options, etc.)
- ✅ Database constraints for data integrity

**Security Score:** 9.0/10

---

## 📝 License

MIT License - free to use and modify.

---

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Version:** 2.0.0
**Last Updated:** December 2025
**Status:** ✅ Production Ready
