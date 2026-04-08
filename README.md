# 🥔 Spud Buds Cookbook

A children's potato cookbook web application with printable recipes, user submissions, and premium features.

## Features

### Core Features
- **Recipe Discovery Quiz**: Kids select their potato type and answer 5 fun questions to find the perfect recipe
- **Printable Recipe Cards**: Beautiful 1/2 sheet recipe cards with foldable shopping lists
- **Step-by-Step Instructions**: Kid-friendly recipes with tips and ingredient alternatives
- **PWA Support**: Works offline with service worker, installable on mobile devices

### User Features
- Email/password authentication (Google OAuth coming soon)
- 3 user roles: Admin, Premium, Regular User
- Recipe submission system with admin approval
- Save favorites and rate recipes
- Age-appropriate difficulty levels (4-6, 7-10, 11+)

### Premium Features ($10/year)
- Upload success photos of completed recipes
- Points and leaderboard system
- Featured on recipe pages
- Future: Weekly "Potato Recipe of the Week" newsletter

## Tech Stack

- **Framework**: [Hono](https://hono.dev) - Ultra-fast web framework for Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (images)
- **Hosting**: Cloudflare Workers
- **Auth**: JWT with bcrypt
- **Payments**: Stripe
- **Validation**: Zod
- **Language**: TypeScript

## Project Structure

```
spud-buds-cookbook/
├── src/
│   ├── index.ts              # Main Hono app entry
│   ├── types.ts              # TypeScript types
│   ├── middleware/
│   │   └── auth.ts           # JWT auth & role middleware
│   └── routes/
│       ├── auth.ts           # Login/register
│       ├── recipes.ts        # Recipe CRUD & listing
│       ├── quiz.ts           # Recipe discovery quiz
│       ├── users.ts          # User profile & favorites
│       ├── admin.ts          # Admin dashboard & approvals
│       ├── uploads.ts        # Image uploads (premium)
│       └── stripe.ts         # Subscription payments
├── migrations/
│   └── 0001_initial.sql      # Database schema
├── wrangler.toml             # Cloudflare config
├── package.json
└── tsconfig.json
```

## Setup Instructions

### Prerequisites
- Node.js 20+
- Cloudflare account
- Stripe account
- Resend account (optional, for emails)

### 1. Create D1 Database

```bash
wrangler d1 create spud-buds-db
```

Update `wrangler.toml` with the database ID from the output.

### 2. Apply Migrations

```bash
npm run db:migrate
```

### 3. Create R2 Bucket

```bash
wrangler r2 bucket create spud-buds-images
```

### 4. Set Secrets

```bash
# JWT secret for auth tokens
wrangler secret put JWT_SECRET

# Stripe configuration
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET

# Admin email for notifications
wrangler secret put ADMIN_EMAIL

# Optional: Email service
wrangler secret put RESEND_API_KEY
```

### 5. Configure Stripe

1. Create a product in Stripe Dashboard
2. Create a yearly price ($10/year)
3. Update `PREMIUM_PRICE_ID` in `wrangler.toml`
4. Set up webhook endpoint: `https://your-domain.com/api/stripe/webhook`

### 6. Install & Run Locally

```bash
npm install
npm run dev
```

### 7. Deploy

```bash
npm run deploy
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/forgot-password` - Request password reset

### Recipes
- `GET /api/recipes` - List all approved recipes
- `GET /api/recipes/:slug` - Get single recipe with details
- `GET /api/recipes/meta/potato-types` - List potato types
- `GET /api/recipes/meta/categories` - List categories
- `POST /api/recipes/submit` - Submit new recipe (auth required)

### Quiz
- `POST /api/quiz/discover` - Submit quiz, get recipe suggestions
- `GET /api/quiz/history` - Get user's quiz history (auth required)

### Users
- `GET /api/users/me` - Get current user profile
- `PATCH /api/users/me` - Update profile
- `GET /api/users/favorites` - List favorite recipes
- `POST /api/users/favorites/:recipeId` - Add to favorites
- `DELETE /api/users/favorites/:recipeId` - Remove from favorites

### Admin (admin only)
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/submissions` - Pending recipe submissions
- `POST /api/admin/submissions/:id/review` - Approve/reject submission
- `POST /api/admin/recipes` - Create recipe directly

### Uploads (premium only)
- `POST /api/uploads/recipe-photo` - Upload success photo
- `GET /api/uploads/my-photos` - List user's uploads
- `GET /api/uploads/leaderboard` - View points leaderboard

### Stripe
- `POST /api/stripe/checkout` - Create checkout session
- `GET /api/stripe/status` - Check subscription status
- `POST /api/stripe/cancel` - Cancel subscription
- `POST /api/stripe/webhook` - Stripe webhook handler

## User Roles

| Role | Permissions |
|------|-------------|
| **admin** | Full access, approve recipes, create recipes, view stats |
| **premium** | Upload photos, view leaderboard, earn points, all user features |
| **user** | Browse recipes, submit recipes, save favorites, rate recipes |

## Recipe Discovery Algorithm

The quiz matches users to recipes based on:
1. Selected potato type (russet, red, yukon gold, etc.)
2. Flavor preferences (savory, sweet, spicy, mild)
3. Texture preferences (crispy, soft, creamy, crunchy)
4. Taste preferences (sweet, savory, sour, umami)
5. Preparation time (quick, elaborate, simple, fancy)
6. Meal type (breakfast, lunch, dinner, snack)

Results are sorted by relevance and date.

## Database Schema Highlights

### Key Tables
- **users**: User accounts with roles
- **recipes**: Recipe content with status (draft/pending/approved/rejected)
- **ingredients**: Recipe ingredients with alternatives for allergies
- **recipe_steps**: Step-by-step instructions with tips
- **recipe_submissions**: User submissions awaiting approval
- **subscriptions**: Stripe subscription tracking
- **user_uploads**: Premium user success photos
- **user_points**: Points and leaderboard data
- **discovery_quizzes**: Quiz responses and suggested recipes
- **newsletter_subscribers**: Email list management

## PWA Features

- **Service Worker**: Caches core assets for offline access
- **Manifest**: Installable app with theme colors
- **Offline Support**: View saved recipes without internet

## Security Considerations

- JWT tokens expire after 7 days
- Passwords hashed with bcrypt (12 rounds)
- Role-based access control on all sensitive endpoints
- Stripe signature verification on webhooks
- File upload size limits (5MB) and type validation
- SQL injection prevention via parameterized queries

## Future Enhancements

- [ ] Google OAuth integration
- [ ] Full-text search with AI assistance
- [ ] Weekly newsletter system
- [ ] Video tutorials for recipes
- [ ] Mobile app (React Native)
- [ ] Recipe ratings and reviews
- [ ] Social sharing features
- [ ] Shopping list generation
- [ ] Meal planning calendar

## License

MIT License - Made with 🥔 for little chefs everywhere!

## Contributing

Recipe submissions welcome! Submit through the app or open an issue.

---

**Made with love for spuds and kids!** 👩‍🍳👨‍🍳
