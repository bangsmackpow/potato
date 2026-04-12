import type {
  D1Database,
  R2Bucket,
  KVNamespace,
  Queue,
} from "@cloudflare/workers-types";

// Environment bindings from wrangler.toml
export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Bucket for image storage
  IMAGES_BUCKET: R2Bucket;

  // KV for caching
  CACHE: KVNamespace;

  // Queue for async tasks
  TASK_QUEUE: Queue;

  // Environment variables
  APP_NAME: string;
  PREMIUM_PRICE_ID: string;

  // Secrets (set via wrangler secret)
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  ADMIN_EMAIL: string;
  UNSPLASH_ACCESS_KEY?: string;
  RESEND_API_KEY?: string;
}

// User types
export type UserRole = "admin" | "premium" | "user";

export interface User {
  id: number;
  email: string;
  display_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// Recipe types
export type RecipeStatus = "draft" | "pending" | "approved" | "rejected";
export type Difficulty = "easy" | "medium" | "hard";
export type AgeGroup = "4-6" | "7-10" | "11+" | "all";

export interface PotatoType {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  sort_order: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
}

export interface Ingredient {
  id: number;
  name: string;
  amount: string | null;
  unit: string | null;
  is_main_ingredient: boolean;
  alternatives?: IngredientAlternative[];
}

export interface IngredientAlternative {
  id: number;
  alternative_name: string;
  reason: string | null;
  notes: string | null;
}

export interface RecipeStep {
  id: number;
  step_number: number;
  instruction: string;
  tip: string | null;
  image_url: string | null;
}

export interface Recipe {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  potato_type_id: number | null;
  difficulty: Difficulty | null;
  age_group: AgeGroup | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number | null;
  image_url: string | null;
  status: RecipeStatus;
  created_by: number | null;
  created_at: string;
  updated_at: string;

  // Joined fields
  category?: Category;
  potato_type?: PotatoType;
  ingredients?: Ingredient[];
  steps?: RecipeStep[];
  author?: User;
  is_favorite?: boolean;
  rating?: number;
}

// Quiz types
export interface DiscoveryQuiz {
  id: number;
  user_id: number | null;
  session_id: string | null;
  potato_type_id: number;
  question_1: string;
  question_2: string;
  question_3: string;
  question_4: string;
  question_5: string;
  suggested_recipe_id: number | null;
  created_at: string;
}

// JWT payload
export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}
