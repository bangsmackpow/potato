-- D1 Database Schema for Spud Buds Cookbook
-- Run with: wrangler d1 migrations apply spud-buds-db

-- Users table with role-based access
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'premium', 'user')),
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
);

-- Premium subscriptions tracking
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT UNIQUE,
    status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due')),
    current_period_start DATETIME,
    current_period_end DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recipe categories
CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0
);

-- Potato types
CREATE TABLE IF NOT EXISTS potato_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    color TEXT, -- hex color for UI
    sort_order INTEGER DEFAULT 0
);

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    category_id INTEGER,
    potato_type_id INTEGER,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
    age_group TEXT CHECK (age_group IN ('4-6', '7-10', '11+', 'all')),
    prep_time INTEGER, -- minutes
    cook_time INTEGER, -- minutes
    servings INTEGER,
    image_url TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
    created_by INTEGER,
    approved_by INTEGER,
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id),
    FOREIGN KEY (potato_type_id) REFERENCES potato_types(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- Recipe ingredients
CREATE TABLE IF NOT EXISTS ingredients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    amount TEXT,
    unit TEXT,
    is_main_ingredient INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Recipe steps/instructions
CREATE TABLE IF NOT EXISTS recipe_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL,
    tip TEXT, -- helpful tip for kids
    image_url TEXT,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Alternative ingredients (for allergies/substitutions)
CREATE TABLE IF NOT EXISTS ingredient_alternatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ingredient_id INTEGER NOT NULL,
    alternative_name TEXT NOT NULL,
    reason TEXT, -- e.g., "allergy", "preference", "not available"
    notes TEXT,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- User recipe submissions (pending approval)
CREATE TABLE IF NOT EXISTS recipe_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    submission_notes TEXT,
    admin_notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME,
    reviewed_by INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

-- Premium user uploads (success photos)
CREATE TABLE IF NOT EXISTS user_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    caption TEXT,
    points_earned INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Points/leaderboard system
CREATE TABLE IF NOT EXISTS user_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    total_points INTEGER DEFAULT 0,
    recipes_uploaded INTEGER DEFAULT 0,
    photos_shared INTEGER DEFAULT 0,
    weekly_streak INTEGER DEFAULT 0,
    last_activity_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Recipe discovery quiz responses
CREATE TABLE IF NOT EXISTS discovery_quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    session_id TEXT, -- for anonymous users
    potato_type_id INTEGER,
    question_1 TEXT, -- What flavors do you like?
    question_2 TEXT, -- Crispy or soft?
    question_3 TEXT, -- Sweet or savory?
    question_4 TEXT, -- Quick or elaborate?
    question_5 TEXT, -- Breakfast, lunch, dinner, or snack?
    suggested_recipe_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (potato_type_id) REFERENCES potato_types(id),
    FOREIGN KEY (suggested_recipe_id) REFERENCES recipes(id)
);

-- Newsletter subscribers
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    user_id INTEGER,
    is_active INTEGER DEFAULT 1,
    subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at DATETIME,
    last_sent_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Newsletter issues
CREATE TABLE IF NOT EXISTS newsletter_issues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    featured_recipe_id INTEGER,
    sent_at DATETIME,
    recipients_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (featured_recipe_id) REFERENCES recipes(id)
);

-- User favorites/bookmarks
CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    recipe_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

-- Recipe ratings and reviews
CREATE TABLE IF NOT EXISTS recipe_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    recipe_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    is_verified INTEGER DEFAULT 0, -- verified they actually made it
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recipes_status ON recipes(status);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category_id);
CREATE INDEX IF NOT EXISTS idx_recipes_potato_type ON recipes(potato_type_id);
CREATE INDEX IF NOT EXISTS idx_recipes_age_group ON recipes(age_group);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON recipe_submissions(status);
CREATE INDEX IF NOT EXISTS idx_uploads_user ON user_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_uploads_recipe ON user_uploads(recipe_id);
CREATE INDEX IF NOT EXISTS idx_newsletter_email ON newsletter_subscribers(email);

-- Seed initial potato types
INSERT OR IGNORE INTO potato_types (name, slug, description, color, sort_order) VALUES
('Russet Potatoes', 'russet', 'Starchy, fluffy texture - perfect for baking and mashing', '#D4A373', 1),
('Red Potatoes', 'red', 'Waxy, hold their shape well - great for roasting', '#E07A5F', 2),
('Yukon Gold', 'yukon-gold', 'Buttery flavor, versatile for any recipe', '#F2CC8F', 3),
('White Potatoes', 'white', 'Creamy and mild - excellent for soups', '#F4F1DE', 4),
('Fingerling Potatoes', 'fingerling', 'Small and sweet - fun finger foods', '#E6B8A2', 5),
('Sweet Potatoes', 'sweet', 'Naturally sweet and packed with vitamins', '#D5896F', 6);

-- Seed initial categories
INSERT OR IGNORE INTO categories (name, slug, description, sort_order) VALUES
('Breakfast Spuds', 'breakfast', 'Start your day with potatoes!', 1),
('Lunch & Dinner', 'main-dishes', 'Hearty meals for growing kids', 2),
('Snacks & Sides', 'snacks', 'Perfect afternoon treats', 3),
('Potato Desserts', 'desserts', 'Yes, you can have potatoes for dessert!', 4);
