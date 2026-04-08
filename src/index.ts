import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { Env, User } from "./types";
import type { MessageBatch } from "@cloudflare/workers-types";

// Import routes
import authRoutes from "./routes/auth";
import recipeRoutes from "./routes/recipes";
import userRoutes from "./routes/users";
import adminRoutes from "./routes/admin";
import quizRoutes from "./routes/quiz";
import uploadRoutes from "./routes/uploads";
import stripeRoutes from "./routes/stripe";
import searchRoutes from "./routes/search";
import printRoutes from "./routes/print";
import newsletterRoutes from "./routes/newsletter";

// Import middleware
import { authMiddleware } from "./middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Global middleware
app.use("*", logger());
app.use(
  "*",
  cors({
    origin: [
      "http://localhost:8787",
      "https://spud-buds.pages.dev",
      "https://spudbuds.cooking",
    ],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400,
  }),
);
app.use("*", secureHeaders());

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    app: c.env.APP_NAME,
    timestamp: new Date().toISOString(),
  });
});

// Printable recipe cards (public)
app.route("/print", printRoutes);

// Newsletter (public subscribe/unsubscribe, protected admin routes)
app.route("/api/newsletter", newsletterRoutes);

// API routes
app.route("/api/auth", authRoutes);
app.route("/api/recipes", recipeRoutes);
app.route("/api/quiz", quizRoutes);
app.route("/api/search", searchRoutes);

// Protected routes (require authentication)
app.use("/api/users/*", authMiddleware);
app.route("/api/users", userRoutes);

app.use("/api/uploads/*", authMiddleware);
app.route("/api/uploads", uploadRoutes);

app.use("/api/admin/*", authMiddleware);
app.route("/api/admin", adminRoutes);

// Stripe webhooks (no auth, uses signature verification)
app.route("/api/stripe", stripeRoutes);

// Static files for PWA
app.get("/manifest.json", (c) => {
  return c.json({
    name: "Spud Buds Cookbook",
    short_name: "Spud Buds",
    description: "A children's potato cookbook with printable recipes",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F1DE",
    theme_color: "#D4A373",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
});

// Service Worker
app.get("/sw.js", (c) => {
  c.header("Content-Type", "application/javascript");
  return c.text(`
    const CACHE_NAME = 'spud-buds-v1';
    const urlsToCache = [
      '/',
      '/styles.css',
      '/app.js',
      '/icon-192.png',
      '/icon-512.png'
    ];

    self.addEventListener('install', (event) => {
      event.waitUntil(
        caches.open(CACHE_NAME)
          .then((cache) => cache.addAll(urlsToCache))
      );
    });

    self.addEventListener('fetch', (event) => {
      event.respondWith(
        caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            return fetch(event.request);
          })
      );
    });
  `);
});

// Frontend HTML (for now, will be enhanced with proper templates later)
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Spud Buds Cookbook</title>
      <link rel="manifest" href="/manifest.json">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Georgia', serif;
          background: #F4F1DE;
          color: #3D405B;
          line-height: 1.6;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }
        header {
          text-align: center;
          padding: 3rem 0;
          background: linear-gradient(135deg, #D4A373 0%, #E07A5F 100%);
          color: white;
          border-radius: 20px;
          margin-bottom: 2rem;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        h1 {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          text-shadow: 2px 2px 0 rgba(0,0,0,0.1);
        }
        .tagline {
          font-size: 1.2rem;
          opacity: 0.95;
        }
        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-top: 2rem;
        }
        .card {
          background: white;
          padding: 2rem;
          border-radius: 15px;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 15px rgba(0,0,0,0.15);
        }
        .card h2 {
          color: #E07A5F;
          margin-bottom: 1rem;
          font-size: 1.5rem;
        }
        .btn {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          background: #81B29A;
          color: white;
          text-decoration: none;
          border-radius: 25px;
          font-weight: bold;
          transition: background 0.2s;
          margin-top: 1rem;
        }
        .btn:hover {
          background: #6A9B83;
        }
        footer {
          text-align: center;
          padding: 3rem 0;
          margin-top: 3rem;
          color: #3D405B;
          opacity: 0.7;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🥔 Spud Buds</h1>
          <p class="tagline">A cookbook teaching kids to cook with potatoes!</p>
        </header>
        
        <div class="features">
          <div class="card">
            <h2>🎯 Recipe Discovery</h2>
            <p>Tell us what potatoes you have and what you like, we'll find the perfect recipe!</p>
            <a href="/quiz" class="btn">Start Quiz</a>
          </div>
          
          <div class="card">
            <h2>📖 Browse Recipes</h2>
            <p>Explore our collection of kid-friendly potato recipes with step-by-step instructions.</p>
            <a href="/recipes" class="btn">View Recipes</a>
          </div>
          
          <div class="card">
            <h2>🖨️ Printable Cards</h2>
            <p>Print beautiful recipe cards on 1/2 sheet paper - perfect for little chefs!</p>
            <a href="/recipes/featured" class="btn">Featured Recipe</a>
          </div>
          
          <div class="card">
            <h2>⭐ Premium</h2>
            <p>Share your cooking success photos and earn points on the leaderboard!</p>
            <a href="/premium" class="btn">Learn More</a>
          </div>
        </div>
        
        <footer>
          <p>Made with 🥔 for little chefs everywhere</p>
          <p>© 2024 Spud Buds Cookbook</p>
        </footer>
      </div>
      
      <script>
        // Register Service Worker for PWA
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('SW registered:', reg))
            .catch((err) => console.log('SW registration failed:', err));
        }
      </script>
    </body>
    </html>
  `);
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
      path: c.req.path,
    },
    404,
  );
});

// Error handler
app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      success: false,
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    500,
  );
});

// Queue handler for async tasks (newsletter, etc.)
export const queueHandler = async (batch: MessageBatch, env: Env) => {
  for (const message of batch.messages) {
    try {
      const body = message.body as { type: string; issue_id?: number };

      switch (body.type) {
        case "send_newsletter":
          // TODO: Implement newsletter sending logic
          console.log(`Sending newsletter issue ${body.issue_id}`);
          // Mark as sent in database
          await env.DB.prepare(
            `
            UPDATE newsletter_issues 
            SET sent_at = CURRENT_TIMESTAMP 
            WHERE id = ?
          `,
          )
            .bind(body.issue_id)
            .run();
          break;

        default:
          console.log(`Unknown queue message type: ${body.type}`);
      }

      message.ack();
    } catch (error) {
      console.error("Queue message error:", error);
      message.retry();
    }
  }
};

export default app;
