import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, Recipe, User } from '../types';
import { authMiddleware, premiumOrAdmin } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Get all published recipes (public)
app.get('/', async (c) => {
  const db = c.env.DB;
  const query = c.req.query();
  
  const page = parseInt(query.page || '1');
  const perPage = Math.min(parseInt(query.per_page || '12'), 50);
  const offset = (page - 1) * perPage;
  
  const category = query.category;
  const potatoType = query.potato_type;
  const ageGroup = query.age_group;
  const difficulty = query.difficulty;
  const search = query.search;
  
  try {
    let sql = `
      SELECT 
        r.id, r.title, r.slug, r.description, r.difficulty, r.age_group, 
        r.prep_time, r.cook_time, r.servings, r.image_url, r.status,
        c.name as category_name, c.slug as category_slug,
        pt.name as potato_type_name, pt.slug as potato_type_slug, pt.color as potato_type_color
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      WHERE r.status = 'approved'
    `;
    
    const params: (string | number)[] = [];
    
    if (category) {
      sql += ' AND c.slug = ?';
      params.push(category);
    }
    
    if (potatoType) {
      sql += ' AND pt.slug = ?';
      params.push(potatoType);
    }
    
    if (ageGroup) {
      sql += ' AND r.age_group = ?';
      params.push(ageGroup);
    }
    
    if (difficulty) {
      sql += ' AND r.difficulty = ?';
      params.push(difficulty);
    }
    
    if (search) {
      sql += ' AND (r.title LIKE ? OR r.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    sql += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(perPage, offset);
    
    const { results } = await db.prepare(sql).bind(...params).all();
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM recipes r LEFT JOIN categories c ON r.category_id = c.id LEFT JOIN potato_types pt ON r.potato_type_id = pt.id WHERE r.status = \'approved\'';
    const countParams: (string | number)[] = [];
    
    if (category) {
      countSql += ' AND c.slug = ?';
      countParams.push(category);
    }
    if (potatoType) {
      countSql += ' AND pt.slug = ?';
      countParams.push(potatoType);
    }
    if (ageGroup) {
      countSql += ' AND r.age_group = ?';
      countParams.push(ageGroup);
    }
    if (difficulty) {
      countSql += ' AND r.difficulty = ?';
      countParams.push(difficulty);
    }
    if (search) {
      countSql += ' AND (r.title LIKE ? OR r.description LIKE ?)';
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const countResult = await db.prepare(countSql).bind(...countParams).first<{ total: number }>();
    const total = countResult?.total || 0;
    
    return c.json({
      success: true,
      data: results,
      pagination: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    });
    
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return c.json({ success: false, error: 'Failed to fetch recipes' }, 500);
  }
});

// Get single recipe with full details
app.get('/:slug', async (c) => {
  const db = c.env.DB;
  const slug = c.req.param('slug');
  
  try {
    // Get recipe
    const { results } = await db.prepare(`
      SELECT 
        r.*,
        c.name as category_name, c.slug as category_slug,
        pt.name as potato_type_name, pt.slug as potato_type_slug, pt.color as potato_type_color,
        u.display_name as author_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.slug = ? AND r.status = 'approved'
    `).bind(slug).all<Recipe>();
    
    if (!results || results.length === 0) {
      return c.json({ success: false, error: 'Recipe not found' }, 404);
    }
    
    const recipe = results[0];
    
    // Get ingredients with alternatives
    const { results: ingredients } = await db.prepare(`
      SELECT i.*, 
        GROUP_CONCAT(
          json_object(
            'id', ia.id, 
            'alternative_name', ia.alternative_name,
            'reason', ia.reason,
            'notes', ia.notes
          )
        ) as alternatives_json
      FROM ingredients i
      LEFT JOIN ingredient_alternatives ia ON i.id = ia.ingredient_id
      WHERE i.recipe_id = ?
      GROUP BY i.id
      ORDER BY i.sort_order, i.id
    `).bind(recipe.id).all<{
      id: number;
      name: string;
      amount: string | null;
      unit: string | null;
      is_main_ingredient: number;
      alternatives_json: string | null;
    }>();
    
    recipe.ingredients = ingredients.map(i => ({
      ...i,
      is_main_redient: Boolean(i.is_main_ingredient),
      alternatives: i.alternatives_json ? JSON.parse(`[${i.alternatives_json}]`) : [],
    }));
    
    // Get steps
    const { results: steps } = await db.prepare(`
      SELECT * FROM recipe_steps
      WHERE recipe_id = ?
      ORDER BY step_number
    `).bind(recipe.id).all();
    
    recipe.steps = steps;
    
    // Get average rating
    const ratingResult = await db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as review_count
      FROM recipe_reviews
      WHERE recipe_id = ?
    `).bind(recipe.id).first<{ avg_rating: number | null; review_count: number }>();
    
    recipe.rating = ratingResult?.avg_rating ? Math.round(ratingResult.avg_rating * 10) / 10 : undefined;
    
    return c.json({
      success: true,
      data: recipe,
    });
    
  } catch (error) {
    console.error('Error fetching recipe:', error);
    return c.json({ success: false, error: 'Failed to fetch recipe' }, 500);
  }
});

// Get all potato types
app.get('/meta/potato-types', async (c) => {
  const db = c.env.DB;
  
  const { results } = await db.prepare(`
    SELECT * FROM potato_types
    ORDER BY sort_order
  `).all();
  
  return c.json({ success: true, data: results });
});

// Get all categories
app.get('/meta/categories', async (c) => {
  const db = c.env.DB;
  
  const { results } = await db.prepare(`
    SELECT * FROM categories
    ORDER BY sort_order
  `).all();
  
  return c.json({ success: true, data: results });
});

// Submit new recipe (requires auth)
const submitRecipeSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().optional(),
  category_id: z.number().optional(),
  potato_type_id: z.number().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  age_group: z.enum(['4-6', '7-10', '11+', 'all']).optional(),
  prep_time: z.number().min(1).optional(),
  cook_time: z.number().min(1).optional(),
  servings: z.number().min(1).optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1),
    amount: z.string().optional(),
    unit: z.string().optional(),
    is_main_ingredient: z.boolean().default(false),
    alternatives: z.array(z.object({
      alternative_name: z.string(),
      reason: z.string().optional(),
      notes: z.string().optional(),
    })).optional(),
  })).min(1),
  steps: z.array(z.object({
    instruction: z.string().min(1),
    tip: z.string().optional(),
  })).min(1),
});

app.use('/submit', authMiddleware);
app.post('/submit', zValidator('json', submitRecipeSchema), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const data = c.req.valid('json');
  
  try {
    // Generate slug from title
    const baseSlug = data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    // Check for duplicate slugs and append number if needed
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await db.prepare('SELECT id FROM recipes WHERE slug = ?').bind(slug).first();
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Insert recipe
    const result = await db.prepare(`
      INSERT INTO recipes (
        title, slug, description, category_id, potato_type_id,
        difficulty, age_group, prep_time, cook_time, servings,
        status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    `).bind(
      data.title,
      slug,
      data.description || null,
      data.category_id || null,
      data.potato_type_id || null,
      data.difficulty || null,
      data.age_group || null,
      data.prep_time || null,
      data.cook_time || null,
      data.servings || null,
      user.id
    ).run();
    
    const recipeId = result.meta.last_row_id;
    
    // Insert ingredients
    for (let i = 0; i < data.ingredients.length; i++) {
      const ing = data.ingredients[i];
      const ingResult = await db.prepare(`
        INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        recipeId,
        ing.name,
        ing.amount || null,
        ing.unit || null,
        ing.is_main_ingredient ? 1 : 0,
        i
      ).run();
      
      const ingredientId = ingResult.meta.last_row_id;
      
      // Insert alternatives
      if (ing.alternatives && ing.alternatives.length > 0) {
        for (const alt of ing.alternatives) {
          await db.prepare(`
            INSERT INTO ingredient_alternatives (ingredient_id, alternative_name, reason, notes)
            VALUES (?, ?, ?, ?)
          `).bind(ingredientId, alt.alternative_name, alt.reason || null, alt.notes || null).run();
        }
      }
    }
    
    // Insert steps
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      await db.prepare(`
        INSERT INTO recipe_steps (recipe_id, step_number, instruction, tip)
        VALUES (?, ?, ?, ?)
      `).bind(recipeId, i + 1, step.instruction, step.tip || null).run();
    }
    
    // Create submission record
    await db.prepare(`
      INSERT INTO recipe_submissions (user_id, recipe_id, status)
      VALUES (?, ?, 'pending')
    `).bind(user.id, recipeId).run();
    
    return c.json({
      success: true,
      data: { id: recipeId, slug },
      message: 'Recipe submitted for approval! It will appear after admin review.',
    }, 201);
    
  } catch (error) {
    console.error('Error submitting recipe:', error);
    return c.json({ success: false, error: 'Failed to submit recipe' }, 500);
  }
});

export default app;
