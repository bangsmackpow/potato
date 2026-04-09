import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import type { Env, User } from "./types";

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

// Shared styles and scripts for all pages
const sharedStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@300;400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
  
  :root {
    --color-bg: #F4F1DE;
    --color-text: #3D405B;
    --color-primary: #D4A373;
    --color-secondary: #E07A5F;
    --color-accent: #81B29A;
    --color-accent-dark: #6A9B83;
    --color-cream: #FEFAE0;
    --color-brown: #BC6C25;
    --color-tan: #DDA15E;
    --shadow-soft: 0 4px 20px rgba(61, 64, 91, 0.1);
    --shadow-hover: 0 8px 30px rgba(61, 64, 91, 0.15);
    --radius-sm: 12px;
    --radius-md: 20px;
    --radius-lg: 28px;
    --radius-full: 50px;
  }
  
  * { margin: 0; padding: 0; box-sizing: border-box; }
  
  body {
    font-family: 'Nunito', sans-serif;
    background: var(--color-bg);
    color: var(--color-text);
    line-height: 1.6;
    min-height: 100vh;
    overflow-x: hidden;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Fredoka', sans-serif;
    font-weight: 600;
  }
  
  /* Floating potato decorations */
  .floating-potatoes {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
    overflow: hidden;
  }
  
  .potato-float {
    position: absolute;
    font-size: 2rem;
    opacity: 0.08;
    animation: float 20s infinite ease-in-out;
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-30px) rotate(10deg); }
  }
  
  /* Navigation */
  .navbar {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: var(--shadow-soft);
    position: sticky;
    top: 0;
    z-index: 100;
  }
  
  .logo {
    font-family: 'Fredoka', sans-serif;
    font-size: 1.8rem;
    font-weight: 700;
    color: white;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .nav-links {
    display: flex;
    gap: 1.5rem;
    list-style: none;
  }
  
  .nav-links a {
    color: white;
    text-decoration: none;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: var(--radius-full);
    transition: all 0.3s ease;
  }
  
  .nav-links a:hover {
    background: rgba(255,255,255,0.2);
    transform: translateY(-2px);
  }
  
  /* Container */
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  /* Hero Section */
  .hero {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, var(--color-cream) 0%, var(--color-bg) 100%);
    border-radius: var(--radius-lg);
    margin: 2rem auto;
    position: relative;
    overflow: hidden;
  }
  
  .hero::before {
    content: '🥔';
    position: absolute;
    font-size: 15rem;
    opacity: 0.05;
    top: -20%;
    right: -5%;
    transform: rotate(15deg);
  }
  
  .hero h1 {
    font-size: 4rem;
    margin-bottom: 1rem;
    color: var(--color-text);
  }
  
  .hero .emoji {
    display: inline-block;
    animation: bounce 2s infinite;
  }
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  .tagline {
    font-size: 1.4rem;
    color: var(--color-brown);
    font-weight: 600;
    max-width: 600px;
    margin: 0 auto 2rem;
  }
  
  /* Buttons */
  .btn {
    display: inline-block;
    padding: 1rem 2rem;
    background: var(--color-accent);
    color: white;
    text-decoration: none;
    border-radius: var(--radius-full);
    font-weight: 700;
    font-size: 1.1rem;
    transition: all 0.3s ease;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(129, 178, 154, 0.3);
  }
  
  .btn:hover {
    background: var(--color-accent-dark);
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(129, 178, 154, 0.4);
  }
  
  .btn-secondary {
    background: var(--color-secondary);
    box-shadow: 0 4px 15px rgba(224, 122, 95, 0.3);
  }
  
  .btn-secondary:hover {
    background: #c96a52;
    box-shadow: 0 6px 20px rgba(224, 122, 95, 0.4);
  }
  
  .btn-premium {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    box-shadow: 0 4px 15px rgba(212, 163, 115, 0.4);
  }
  
  /* Feature Cards */
  .features {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    margin: 3rem 0;
  }
  
  .card {
    background: white;
    padding: 2.5rem;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-soft);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
    overflow: hidden;
  }
  
  .card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 5px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }
  
  .card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: var(--shadow-hover);
  }
  
  .card:hover::before {
    transform: scaleX(1);
  }
  
  .card-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    display: block;
  }
  
  .card h2 {
    color: var(--color-secondary);
    margin-bottom: 1rem;
    font-size: 1.8rem;
  }
  
  .card p {
    color: var(--color-text);
    opacity: 0.8;
    margin-bottom: 1.5rem;
    font-size: 1.1rem;
  }
  
  /* Quiz Page Styles */
  .quiz-container {
    max-width: 700px;
    margin: 2rem auto;
    background: white;
    padding: 3rem;
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-soft);
  }
  
  .quiz-question {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 2rem;
    color: var(--color-text);
  }
  
  .quiz-options {
    display: grid;
    gap: 1rem;
  }
  
  .quiz-option {
    padding: 1.5rem;
    background: var(--color-cream);
    border: 3px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1.1rem;
    font-weight: 600;
    text-align: left;
  }
  
  .quiz-option:hover {
    border-color: var(--color-accent);
    background: white;
    transform: translateX(10px);
  }
  
  .quiz-progress {
    width: 100%;
    height: 8px;
    background: var(--color-cream);
    border-radius: var(--radius-full);
    margin-bottom: 2rem;
    overflow: hidden;
  }
  
  .quiz-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
    transition: width 0.5s ease;
  }
  
  /* Recipe Grid */
  .recipe-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }
  
  .recipe-card {
    background: white;
    border-radius: var(--radius-md);
    overflow: hidden;
    box-shadow: var(--shadow-soft);
    transition: all 0.3s ease;
  }
  
  .recipe-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-hover);
  }
  
  .recipe-image {
    width: 100%;
    height: 200px;
    background: linear-gradient(135deg, var(--color-cream), var(--color-primary));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 4rem;
  }
  
  .recipe-content {
    padding: 1.5rem;
  }
  
  .recipe-title {
    font-size: 1.3rem;
    margin-bottom: 0.5rem;
    color: var(--color-text);
  }
  
  .recipe-meta {
    display: flex;
    gap: 1rem;
    color: var(--color-brown);
    font-size: 0.9rem;
    font-weight: 600;
  }
  
  /* Premium Page */
  .premium-hero {
    text-align: center;
    padding: 4rem 2rem;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%);
    color: white;
    border-radius: var(--radius-lg);
    margin-bottom: 3rem;
  }
  
  .premium-hero h1 {
    font-size: 3.5rem;
    margin-bottom: 1rem;
  }
  
  .price-tag {
    font-size: 4rem;
    font-weight: 700;
    margin: 1rem 0;
  }
  
  .price-tag span {
    font-size: 1.5rem;
    opacity: 0.8;
  }
  
  .features-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
    margin: 3rem 0;
  }
  
  .feature-item {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: var(--radius-md);
    box-shadow: var(--shadow-soft);
  }
  
  .feature-check {
    font-size: 1.5rem;
    color: var(--color-accent);
  }
  
  /* Footer */
  footer {
    text-align: center;
    padding: 3rem 2rem;
    margin-top: 4rem;
    background: var(--color-text);
    color: white;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  
  footer p {
    opacity: 0.8;
    margin: 0.5rem 0;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .hero h1 { font-size: 2.5rem; }
    .nav-links { display: none; }
    .features { grid-template-columns: 1fr; }
    .quiz-container { padding: 1.5rem; }
  }
  
  /* Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .animate-in {
    animation: fadeInUp 0.6s ease forwards;
  }
  
  .stagger-1 { animation-delay: 0.1s; }
  .stagger-2 { animation-delay: 0.2s; }
  .stagger-3 { animation-delay: 0.3s; }
  .stagger-4 { animation-delay: 0.4s; }
`;

const sharedScripts = `
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW failed', err));
  }
  
  // Add animation on scroll
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.card').forEach(card => {
    observer.observe(card);
  });
`;

// HOME PAGE - Landing page with stunning UI
app.get("/", async (c) => {
  const db = c.env.DB;

  // Get featured recipe
  const featuredRecipe = await db
    .prepare(
      `
    SELECT r.*, pt.name as potato_type_name, c.name as category_name
    FROM recipes r
    LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.status = 'approved'
    ORDER BY RANDOM()
    LIMIT 1
  `,
    )
    .first();

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Spud Buds Cookbook - Kids Potato Recipes</title>
      <link rel="manifest" href="/manifest.json">
      <style>${sharedStyles}</style>
    </head>
    <body>
      <div class="floating-potatoes">
        <div class="potato-float" style="top: 10%; left: 5%; animation-delay: 0s;">🥔</div>
        <div class="potato-float" style="top: 30%; right: 8%; animation-delay: 5s;">🥔</div>
        <div class="potato-float" style="top: 60%; left: 3%; animation-delay: 10s;">🥔</div>
        <div class="potato-float" style="top: 80%; right: 5%; animation-delay: 15s;">🥔</div>
      </div>
      
      <nav class="navbar">
        <a href="/" class="logo">
          <span>🥔</span> Spud Buds
        </a>
        <ul class="nav-links">
          <li><a href="/quiz">Recipe Quiz</a></li>
          <li><a href="/recipes">All Recipes</a></li>
          <li><a href="/print">Print Cards</a></li>
          <li><a href="/premium">Premium ⭐</a></li>
        </ul>
      </nav>
      
      <div class="container">
        <section class="hero">
          <h1><span class="emoji">🥔</span> Spud Buds <span class="emoji">👨‍🍳</span></h1>
          <p class="tagline">A magical cookbook teaching kids to cook with potatoes! Discover 50+ delicious recipes made just for little chefs.</p>
          <a href="/quiz" class="btn btn-secondary" style="font-size: 1.3rem; padding: 1.2rem 2.5rem;">🎯 Find Your Perfect Recipe</a>
        </section>
        
        <div class="features">
          <div class="card stagger-1">
            <span class="card-icon">🎯</span>
            <h2>Recipe Discovery Quiz</h2>
            <p>Tell us what potatoes you have and what flavors you love. Our magical quiz matches you with the perfect recipe!</p>
            <a href="/quiz" class="btn">Start Quiz</a>
          </div>
          
          <div class="card stagger-2">
            <span class="card-icon">📖</span>
            <h2>Browse All Recipes</h2>
            <p>Explore our growing collection of kid-tested, parent-approved potato recipes. Breakfast, lunch, dinner, snacks & desserts!</p>
            <a href="/recipes" class="btn">View Recipes</a>
          </div>
          
          <div class="card stagger-3">
            <span class="card-icon">🖨️</span>
            <h2>Printable Recipe Cards</h2>
            <p>Print beautiful 1/2 sheet recipe cards with shopping lists. Perfect for little hands to follow along in the kitchen!</p>
            <a href="/recipes/featured" class="btn">Print Cards</a>
          </div>
          
          <div class="card stagger-4">
            <span class="card-icon">⭐</span>
            <h2>Go Premium</h2>
            <p>Unlock photo sharing, earn points on the leaderboard, and get exclusive recipes. Just $10/year!</p>
            <a href="/premium" class="btn btn-premium">Learn More</a>
          </div>
        </div>
        
        ${
          featuredRecipe
            ? `
        <section class="hero" style="margin-top: 3rem; background: linear-gradient(135deg, #fff 0%, var(--color-cream) 100%);">
          <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">✨ Featured Recipe</h2>
          <div style="font-size: 5rem; margin: 1rem 0;">🍽️</div>
          <h3 style="font-size: 2rem; color: var(--color-secondary); margin-bottom: 0.5rem;">${featuredRecipe.title}</h3>
          <p style="font-size: 1.2rem; margin-bottom: 1.5rem; max-width: 600px; margin-left: auto; margin-right: auto;">${featuredRecipe.description}</p>
          <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 1.5rem;">
            <span style="background: var(--color-primary); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600;">${featuredRecipe.difficulty}</span>
            <span style="background: var(--color-accent); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600;">${featuredRecipe.prep_time + featuredRecipe.cook_time} min</span>
            <span style="background: var(--color-secondary); color: white; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 600;">Ages ${featuredRecipe.age_group}</span>
          </div>
          <a href="/recipes" class="btn">View Recipe</a>
        </section>
        `
            : ""
        }
        
        <section style="text-align: center; padding: 3rem; background: white; border-radius: var(--radius-lg); margin-top: 3rem;">
          <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">🥔 Why Potatoes?</h2>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-top: 2rem;">
            <div>
              <div style="font-size: 3rem; margin-bottom: 0.5rem;">🌟</div>
              <h3 style="color: var(--color-secondary);">Nutritious</h3>
              <p>Packed with vitamins, fiber, and energy for growing kids</p>
            </div>
            <div>
              <div style="font-size: 3rem; margin-bottom: 0.5rem;">💰</div>
              <h3 style="color: var(--color-secondary);">Affordable</h3>
              <p>Budget-friendly ingredient that feeds the whole family</p>
            </div>
            <div>
              <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎨</div>
              <h3 style="color: var(--color-secondary);">Versatile</h3>
              <p>Boil, bake, fry, mash - endless possibilities!</p>
            </div>
            <div>
              <div style="font-size: 3rem; margin-bottom: 0.5rem;">👶</div>
              <h3 style="color: var(--color-secondary);">Kid-Friendly</h3>
              <p>Mild flavor that even picky eaters love</p>
            </div>
          </div>
        </section>
      </div>
      
      <footer>
        <p style="font-size: 1.5rem; margin-bottom: 1rem;">Made with 🥔 for little chefs everywhere</p>
        <p>© 2024 Spud Buds Cookbook • <a href="/api/newsletter/subscribe" style="color: var(--color-primary);">Join Our Newsletter</a></p>
      </footer>
      
      <script>${sharedScripts}</script>
    </body>
    </html>
  `);
});

// QUIZ PAGE - Recipe Discovery
app.get("/quiz", async (c) => {
  const db = c.env.DB;

  // Get potato types and categories for quiz
  const potatoTypes = await db
    .prepare(`SELECT * FROM potato_types ORDER BY name`)
    .all();
  const categories = await db
    .prepare(`SELECT * FROM categories ORDER BY name`)
    .all();

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recipe Discovery Quiz - Spud Buds</title>
      <link rel="manifest" href="/manifest.json">
      <style>${sharedStyles}</style>
    </head>
    <body>
      <nav class="navbar">
        <a href="/" class="logo"><span>🥔</span> Spud Buds</a>
        <ul class="nav-links">
          <li><a href="/">Home</a></li>
          <li><a href="/recipes">Recipes</a></li>
          <li><a href="/premium">Premium</a></li>
        </ul>
      </nav>
      
      <div class="container">
        <div id="quiz-container" class="quiz-container">
          <h1 style="text-align: center; margin-bottom: 2rem; font-size: 2.5rem;">🎯 Recipe Discovery Quiz</h1>
          <div id="quiz-content">
            <div class="quiz-progress">
              <div class="quiz-progress-bar" style="width: 20%"></div>
            </div>
            <p class="quiz-question">1. What type of potatoes do you have?</p>
            <div class="quiz-options">
              ${
                potatoTypes.results
                  ?.map(
                    (pt) => `
                <button class="quiz-option" onclick="selectPotatoType(${pt.id}, '${pt.name}')">
                  <strong>${pt.name}</strong> ${pt.color ? `<span style="color: ${pt.color};">●</span>` : ""}
                  <br><small style="opacity: 0.7;">${pt.best_for || "All-purpose potato"}</small>
                </button>
              `,
                  )
                  .join("") || ""
              }
              <button class="quiz-option" onclick="selectPotatoType(0, 'Any')">
                <strong>🎲 Surprise Me!</strong>
                <br><small style="opacity: 0.7;">I'll use whatever potatoes I have</small>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <footer>
        <p>Made with 🥔 for little chefs everywhere</p>
        <p>© 2024 Spud Buds Cookbook</p>
      </footer>
      
      <script>
        ${sharedScripts}
        
        let quizData = { step: 1 };
        
        function selectPotatoType(id, name) {
          quizData.potato_type_id = id;
          quizData.potato_type_name = name;
          showMealTypeQuestion();
        }
        
        function showMealTypeQuestion() {
          quizData.step = 2;
          document.getElementById('quiz-content').innerHTML = \`
            <div class="quiz-progress">
              <div class="quiz-progress-bar" style="width: 40%"></div>
            </div>
            <p class="quiz-question">2. What meal are you making?</p>
            <div class="quiz-options">
              <button class="quiz-option" onclick="selectMealType(1, 'Breakfast')">
                <strong>🌅 Breakfast</strong>
                <br><small style="opacity: 0.7;">Start the day with something delicious</small>
              </button>
              <button class="quiz-option" onclick="selectMealType(2, 'Lunch/Dinner')">
                <strong>🍽️ Lunch or Dinner</strong>
                <br><small style="opacity: 0.7;">A hearty main meal</small>
              </button>
              <button class="quiz-option" onclick="selectMealType(3, 'Snack')">
                <strong>🥨 Snack Time</strong>
                <br><small style="opacity: 0.7;">Something to munch on</small>
              </button>
              <button class="quiz-option" onclick="selectMealType(4, 'Dessert')">
                <strong>🍰 Dessert</strong>
                <br><small style="opacity: 0.7;">Sweet potato treats!</small>
              </button>
            </div>
          \`;
        }
        
        function selectMealType(id, name) {
          quizData.category_id = id;
          quizData.category_name = name;
          showDifficultyQuestion();
        }
        
        function showDifficultyQuestion() {
          quizData.step = 3;
          document.getElementById('quiz-content').innerHTML = \`
            <div class="quiz-progress">
              <div class="quiz-progress-bar" style="width: 60%"></div>
            </div>
            <p class="quiz-question">3. How experienced is the chef?</p>
            <div class="quiz-options">
              <button class="quiz-option" onclick="selectDifficulty('easy', '5-8')">
                <strong>👶 Beginner (Ages 5-8)</strong>
                <br><small style="opacity: 0.7;">Simple steps, lots of help from grown-ups</small>
              </button>
              <button class="quiz-option" onclick="selectDifficulty('medium', '8-12')">
                <strong>👦 Intermediate (Ages 8-12)</strong>
                <br><small style="opacity: 0.7;">Ready for more challenges</small>
              </button>
              <button class="quiz-option" onclick="selectDifficulty('hard', '10-14')">
                <strong>👨‍🍳 Advanced (Ages 10-14)</strong>
                <br><small style="opacity: 0.7;">Complex recipes for experienced chefs</small>
              </button>
            </div>
          \`;
        }
        
        function selectDifficulty(level, ageGroup) {
          quizData.difficulty = level;
          quizData.age_group = ageGroup;
          submitQuiz();
        }
        
        async function submitQuiz() {
          quizData.step = 4;
          document.getElementById('quiz-content').innerHTML = \`
            <div class="quiz-progress">
              <div class="quiz-progress-bar" style="width: 100%"></div>
            </div>
            <p class="quiz-question" style="text-align: center;">🔍 Finding your perfect recipe...</p>
            <div style="text-align: center; font-size: 4rem; animation: bounce 1s infinite;">🥔</div>
          \`;
          
          try {
            const response = await fetch('/api/quiz/discover', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(quizData)
            });
            const result = await response.json();
            
            if (result.success && result.data?.recommendations?.length > 0) {
              const recipes = result.data.recommendations;
              let html = \`
                <div class="quiz-progress">
                  <div class="quiz-progress-bar" style="width: 100%"></div>
                </div>
                <h2 style="text-align: center; margin-bottom: 2rem; font-size: 2rem;">🎉 We Found Your Perfect Recipes!</h2>
                <div class="recipe-grid">
              \`;
              
              recipes.forEach(recipe => {
                html += \`
                  <div class="recipe-card">
                    <div class="recipe-image">🍽️</div>
                    <div class="recipe-content">
                      <h3 class="recipe-title">\${recipe.title}</h3>
                      <div class="recipe-meta">
                        <span>⏱️ \${recipe.prep_time + recipe.cook_time} min</span>
                        <span>📊 \${recipe.difficulty}</span>
                      </div>
                      <p style="margin: 0.5rem 0; font-size: 0.9rem; opacity: 0.8;">\${recipe.description.substring(0, 80)}...</p>
                      <a href="/print/\${recipe.slug}" class="btn" style="display: block; text-align: center; margin-top: 1rem;">View Recipe</a>
                    </div>
                  </div>
                \`;
              });
              
              html += \`
                </div>
                <div style="text-align: center; margin-top: 2rem;">
                  <a href="/quiz" class="btn btn-secondary">🔄 Take Quiz Again</a>
                  <a href="/recipes" class="btn" style="margin-left: 1rem;">📖 Browse All Recipes</a>
                </div>
              \`;
              
              document.getElementById('quiz-content').innerHTML = html;
            } else {
              document.getElementById('quiz-content').innerHTML = \`
                <div style="text-align: center;">
                  <div style="font-size: 4rem; margin-bottom: 1rem;">🔍</div>
                  <h2>No recipes found matching those criteria</h2>
                  <p style="margin: 1rem 0;">Try adjusting your quiz answers or browse all recipes!</p>
                  <a href="/quiz" class="btn btn-secondary">🔄 Try Again</a>
                  <a href="/recipes" class="btn" style="margin-left: 1rem;">📖 Browse All</a>
                </div>
              \`;
            }
          } catch (error) {
            document.getElementById('quiz-content').innerHTML = \`
              <div style="text-align: center; color: var(--color-secondary);">
                <h2>Oops! Something went wrong</h2>
                <p>Please try again or browse all recipes.</p>
                <a href="/quiz" class="btn btn-secondary">Try Again</a>
              </div>
            \`;
          }
        }
      </script>
    </body>
    </html>
  `);
});

// RECIPES PAGE - Browse all recipes
app.get("/recipes", async (c) => {
  const db = c.env.DB;

  // Get all approved recipes with their details
  const recipes = await db
    .prepare(
      `
    SELECT r.*, pt.name as potato_type_name, pt.color as potato_color, c.name as category_name
    FROM recipes r
    LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
    LEFT JOIN categories c ON r.category_id = c.id
    WHERE r.status = 'approved'
    ORDER BY r.category_id, r.difficulty
  `,
    )
    .all();

  const potatoTypes = await db
    .prepare(`SELECT * FROM potato_types ORDER BY name`)
    .all();
  const categories = await db
    .prepare(`SELECT * FROM categories ORDER BY name`)
    .all();

  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>All Recipes - Spud Buds Cookbook</title>
      <link rel="manifest" href="/manifest.json">
      <style>${sharedStyles}</style>
    </head>
    <body>
      <nav class="navbar">
        <a href="/" class="logo"><span>🥔</span> Spud Buds</a>
        <ul class="nav-links">
          <li><a href="/">Home</a></li>
          <li><a href="/quiz">Quiz</a></li>
          <li><a href="/print">Print</a></li>
          <li><a href="/premium">Premium</a></li>
        </ul>
      </nav>
      
      <div class="container">
        <div class="hero" style="padding: 2rem;">
          <h1>📖 Recipe Collection</h1>
          <p class="tagline">Browse ${recipes.results?.length || 0}+ kid-friendly potato recipes</p>
          
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 2rem;">
            <select id="filter-category" onchange="filterRecipes()" style="padding: 0.8rem 1.5rem; border-radius: 25px; border: 2px solid var(--color-accent); font-size: 1rem; font-family: inherit;">
              <option value="">All Categories</option>
              ${categories.results?.map((cat) => `<option value="${cat.id}">${cat.name}</option>`).join("") || ""}
            </select>
            
            <select id="filter-potato" onchange="filterRecipes()" style="padding: 0.8rem 1.5rem; border-radius: 25px; border: 2px solid var(--color-accent); font-size: 1rem; font-family: inherit;">
              <option value="">All Potato Types</option>
              ${potatoTypes.results?.map((pt) => `<option value="${pt.id}">${pt.name}</option>`).join("") || ""}
            </select>
            
            <select id="filter-difficulty" onchange="filterRecipes()" style="padding: 0.8rem 1.5rem; border-radius: 25px; border: 2px solid var(--color-accent); font-size: 1rem; font-family: inherit;">
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        
        <div class="recipe-grid" id="recipe-grid">
          ${
            recipes.results
              ?.map(
                (recipe) => `
            <div class="recipe-card" data-category="${recipe.category_id}" data-potato="${recipe.potato_type_id}" data-difficulty="${recipe.difficulty}">
              <div class="recipe-image">
                ${
                  recipe.image_url && recipe.image_url !== "/images/default.jpg"
                    ? `<img src="${recipe.image_url}" alt="${recipe.title}" style="width: 100%; height: 100%; object-fit: cover;">`
                    : `<span style="font-size: 4rem;">🍽️</span>`
                }
              </div>
              <div class="recipe-content">
                <span style="display: inline-block; background: var(--color-cream); padding: 0.3rem 0.8rem; border-radius: 15px; font-size: 0.8rem; font-weight: 600; color: var(--color-brown); margin-bottom: 0.5rem;">
                  ${recipe.category_name}
                </span>
                <h3 class="recipe-title">${recipe.title}</h3>
                <p style="font-size: 0.95rem; opacity: 0.7; margin-bottom: 0.5rem;">${recipe.description.substring(0, 60)}...</p>
                <div class="recipe-meta">
                  <span>⏱️ ${recipe.prep_time + recipe.cook_time}m</span>
                  <span>📊 ${recipe.difficulty}</span>
                  <span>👶 ${recipe.age_group}</span>
                </div>
                <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--color-brown);">
                  ${recipe.potato_type_name ? `🥔 ${recipe.potato_type_name}` : ""}
                </div>
                <a href="/print/${recipe.slug}" class="btn" style="display: block; text-align: center; margin-top: 1rem;">View Recipe</a>
              </div>
            </div>
          `,
              )
              .join("") ||
            `
            <div style="text-align: center; grid-column: 1 / -1; padding: 3rem;">
              <div style="font-size: 4rem; margin-bottom: 1rem;">🥔</div>
              <h2>No recipes found</h2>
              <p>Import some recipes to get started!</p>
            </div>
          `
          }
        </div>
      </div>
      
      <footer>
        <p>Made with 🥔 for little chefs everywhere</p>
        <p>© 2024 Spud Buds Cookbook</p>
      </footer>
      
      <script>
        ${sharedScripts}
        
        function filterRecipes() {
          const category = document.getElementById('filter-category').value;
          const potato = document.getElementById('filter-potato').value;
          const difficulty = document.getElementById('filter-difficulty').value;
          
          const cards = document.querySelectorAll('.recipe-card');
          
          cards.forEach(card => {
            const cardCategory = card.getAttribute('data-category');
            const cardPotato = card.getAttribute('data-potato');
            const cardDifficulty = card.getAttribute('data-difficulty');
            
            const matchCategory = !category || cardCategory === category;
            const matchPotato = !potato || cardPotato === potato;
            const matchDifficulty = !difficulty || cardDifficulty === difficulty;
            
            if (matchCategory && matchPotato && matchDifficulty) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });
        }
      </script>
    </body>
    </html>
  `);
});

// RECIPES/FEATURED - Redirect to a random featured recipe
app.get("/recipes/featured", async (c) => {
  const db = c.env.DB;

  const featured = await db
    .prepare(
      `
    SELECT slug FROM recipes WHERE status = 'approved' ORDER BY RANDOM() LIMIT 1
  `,
    )
    .first();

  if (featured) {
    return c.redirect(`/print/${featured.slug}`);
  }

  return c.redirect("/recipes");
});

// PREMIUM PAGE - Membership info
app.get("/premium", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Go Premium - Spud Buds Cookbook</title>
      <link rel="manifest" href="/manifest.json">
      <style>${sharedStyles}</style>
    </head>
    <body>
      <nav class="navbar">
        <a href="/" class="logo"><span>🥔</span> Spud Buds</a>
        <ul class="nav-links">
          <li><a href="/">Home</a></li>
          <li><a href="/quiz">Quiz</a></li>
          <li><a href="/recipes">Recipes</a></li>
        </ul>
      </nav>
      
      <div class="container">
        <div class="premium-hero">
          <div style="font-size: 5rem; margin-bottom: 1rem;">⭐</div>
          <h1>Go Premium</h1>
          <p style="font-size: 1.3rem; opacity: 0.9; max-width: 600px; margin: 0 auto;">
            Unlock exclusive features and become a Master Spud Chef!
          </p>
          <div class="price-tag">
            $10<span>/year</span>
          </div>
          <p style="font-size: 1.1rem; margin: 1rem 0;">That's less than $1/month! 🎉</p>
          <button class="btn" style="font-size: 1.3rem; padding: 1.2rem 3rem; background: white; color: var(--color-secondary);" onclick="startCheckout()">
            🚀 Get Premium Now
          </button>
        </div>
        
        <div class="features-list">
          <div class="feature-item">
            <span class="feature-check">✅</span>
            <div>
              <h3>📸 Photo Sharing</h3>
              <p>Share photos of your culinary creations with the Spud Buds community</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-check">✅</span>
            <div>
              <h3>🏆 Points & Leaderboard</h3>
              <p>Earn points for cooking, sharing, and helping others. Climb the ranks!</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-check">✅</span>
            <div>
              <h3>🔓 Exclusive Recipes</h3>
              <p>Access premium recipes not available to free users</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-check">✅</span>
            <div>
              <h3>📧 Weekly Newsletter</h3>
              <p>Get "Potato Recipe of the Week" delivered to your inbox</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-check">✅</span>
            <div>
              <h3>👤 Profile Badge</h3>
              <p>Show off your Premium status with a special badge</p>
            </div>
          </div>
          
          <div class="feature-item">
            <span class="feature-check">✅</span>
            <div>
              <h3>🎯 Priority Support</h3>
              <p>Get help faster when you need it</p>
            </div>
          </div>
        </div>
        
        <div style="text-align: center; margin: 4rem 0; padding: 3rem; background: white; border-radius: var(--radius-lg); box-shadow: var(--shadow-soft);">
          <h2 style="font-size: 2rem; margin-bottom: 1rem;">🎁 Special Launch Offer!</h2>
          <p style="font-size: 1.2rem; margin-bottom: 2rem;">
            Join now and get a <strong>FREE printable Spud Buds apron design</strong>!
          </p>
          <div style="font-size: 4rem; margin-bottom: 1rem;">👨‍🍳</div>
          <button class="btn btn-secondary" style="font-size: 1.2rem; padding: 1rem 2rem;" onclick="startCheckout()">
            Claim Your Offer - $10/year
          </button>
          <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
            🔒 Secure payment via Stripe • Cancel anytime
          </p>
        </div>
        
        <div style="background: var(--color-cream); padding: 2rem; border-radius: var(--radius-md); margin: 2rem 0;">
          <h3 style="text-align: center; margin-bottom: 1.5rem;">❓ Frequently Asked Questions</h3>
          <div style="display: grid; gap: 1.5rem;">
            <div>
              <strong>What happens after I subscribe?</strong>
              <p style="opacity: 0.8; margin-top: 0.3rem;">You'll immediately get access to all premium features! Check your email for confirmation.</p>
            </div>
            <div>
              <strong>Can I cancel my subscription?</strong>
              <p style="opacity: 0.8; margin-top: 0.3rem;">Yes, you can cancel anytime from your account settings. You'll keep access until your year ends.</p>
            </div>
            <div>
              <strong>Is my payment secure?</strong>
              <p style="opacity: 0.8; margin-top: 0.3rem;">Absolutely! We use Stripe, the same payment processor used by millions of businesses.</p>
            </div>
          </div>
        </div>
      </div>
      
      <footer>
        <p>Made with 🥔 for little chefs everywhere</p>
        <p>© 2024 Spud Buds Cookbook</p>
      </footer>
      
      <script>
        ${sharedScripts}
        
        async function startCheckout() {
          try {
            const response = await fetch('/api/stripe/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            const result = await response.json();
            
            if (result.success && result.data?.url) {
              window.location.href = result.data.url;
            } else {
              alert('Something went wrong. Please try again!');
            }
          } catch (error) {
            console.error('Checkout error:', error);
            alert('Unable to start checkout. Please try again later.');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// 404 handler
app.notFound((c) => {
  // Check if it's a frontend route that should show HTML
  const path = c.req.path;
  if (
    path.startsWith("/quiz") ||
    path.startsWith("/recipes") ||
    path.startsWith("/premium") ||
    path.startsWith("/print")
  ) {
    return c.html(
      `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Not Found - Spud Buds</title>
        <style>${sharedStyles}</style>
      </head>
      <body>
        <nav class="navbar">
          <a href="/" class="logo"><span>🥔</span> Spud Buds</a>
        </nav>
        <div class="container" style="text-align: center; padding: 4rem 2rem;">
          <div style="font-size: 6rem; margin-bottom: 1rem;">🔍</div>
          <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Page Not Found</h1>
          <p style="font-size: 1.2rem; margin-bottom: 2rem;">Oops! We couldn't find what you're looking for.</p>
          <a href="/" class="btn">🏠 Go Home</a>
          <a href="/recipes" class="btn" style="margin-left: 1rem;">📖 Browse Recipes</a>
        </div>
      </body>
      </html>
    `,
      404,
    );
  }

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

export default app;
