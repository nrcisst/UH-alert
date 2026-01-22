# UH Class Alert

Get instant email notifications when seats open up in your desired University of Houston classes. Stop refreshing the class browser — let us watch for you.

## Features

- **Magic Link Authentication** — No passwords, just enter your email
- **Real-time Class Tracking** — Monitor any UH class by subject and catalog number
- **Instant Email Alerts** — Get notified within minutes when a seat opens
- **Section Details** — View all sections with instructor, schedule, and seat availability
- **Unlimited Watchlist** — Track as many classes as you need

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL via Neon + Prisma ORM
- **Email**: Resend
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (recommend [Neon](https://neon.tech))
- [Resend](https://resend.com) account for emails

### Environment Variables

Create a `.env` file with the following:

```env
# Database
DATABASE_URL="postgresql://..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="Alert <alerts@yourdomain.com>"

# App URL
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"

# UH API
UH_API_URL="https://classbrowser.uh.edu/api/classes"

# Current Semester Term Code
UH_CURRENT_TERM="2280"

# Cron Security
CRON_SECRET="your-random-secret"
```

### Term Codes

UH uses numeric term codes. Update `UH_CURRENT_TERM` each semester:

| Semester | Code Pattern |
|----------|-------------|
| Spring 2028 | 2280 |
| Summer 2028 | 2290 |
| Fall 2028 | 2310 |

### Installation

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

### Cron Job Setup

The polling endpoint checks for class openings and sends alerts. Set up an external cron service (like [cron-job.org](https://cron-job.org)) to hit:

```
GET https://your-app.vercel.app/api/cron/poll?secret=YOUR_CRON_SECRET
```

Recommended schedule: Every 15 minutes (`*/15 * * * *`)

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # Login, logout, verify, unsubscribe
│   │   ├── classes/       # Search, sections, cached data
│   │   ├── cron/          # Polling job
│   │   └── subscriptions/ # User watchlist CRUD
│   ├── dashboard/         # User dashboard
│   ├── unsubscribe/       # Unsubscribe page
│   ├── verify/            # Magic link verification
│   └── page.tsx           # Landing page
├── lib/
│   ├── auth.ts            # JWT + token utilities
│   ├── db.ts              # Prisma client
│   ├── email.ts           # Resend email functions
│   └── uh-api.ts          # UH class browser API wrapper
└── prisma/
    └── schema.prisma      # Database schema
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Send magic link email |
| `/api/auth/verify` | GET | Verify magic link token |
| `/api/auth/logout` | POST | Clear auth cookie |
| `/api/auth/unsubscribe` | POST | Deactivate all subscriptions |
| `/api/subscriptions` | GET/POST | List/add subscriptions |
| `/api/subscriptions/[id]` | DELETE | Remove subscription |
| `/api/classes/search` | GET | Search for a class |
| `/api/classes/sections` | GET | Get live section data |
| `/api/cron/poll` | GET | Trigger class check (protected) |

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Add environment variables in Vercel dashboard
4. Set up external cron job for polling
5. Update `UH_CURRENT_TERM` each semester

## License

MIT

---

Made with ❤️ for UH Students. Not affiliated with the University of Houston.
