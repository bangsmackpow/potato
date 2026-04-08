import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, User } from '../types';
import { adminOnly } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// All admin routes require admin role
app.use('*', adminOnly);

// Dashboard stats
app.get('/stats', async (c) => {
  const db = c.env.DB;
  
  try {
    // User stats
    const userStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_users,
        SUM(CASE WHEN role = 'premium' THEN 1 ELSE 0 END) as premium_users,
        SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as new_today
      FROM users
      WHERE is_active = 1
    `).first();
    
    // Recipe stats
    const recipeStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_recipes,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft
      FROM recipes
    `).first();
    
    // Submission stats
    const submissionStats = await db.prepare(`
      SELECT 
        COUNT(*) as total_submissions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_review
      FROM recipe_submissions
    `).first();
    
    // Recent activity
    const { results: recentActivity } = await db.prepare(`
      SELECT 
        'submission' as type,
        rs.submitted_at as timestamp,
        u.display_name as user_name,
        r.title as recipe_title,
        r.slug as recipe_slug
      FROM recipe_submissions rs
      JOIN users u ON rs.user_id = u.id
      JOIN recipes r ON rs.recipe_id = r.id
      WHERE rs.status = 'pending'
      ORDER BY rs.submitted_at DESC
      LIMIT 5
    `).all();
    
    return c.json({
      success: true,
      data: {
        users: userStats,
        recipes: recipeStats,
        submissions: submissionStats,
        recent_activity: recentActivity,
      },
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

// Get pending recipe submissions
app.get('/submissions', async (c) => {
  const db = c.env.DB;
  const query = c.req.query();
  const status = query.status || 'pending';
  
  try {
    const { results } = await db.prepare(`
      SELECT 
        rs.id as submission_id,
        rs.status,
        rs.submission_notes,
        rs.submitted_at,
        rs.reviewed_at,
        rs.admin_notes,
        r.id as recipe_id,
        r.title,
        r.slug,
        r.description,
        r.difficulty,
        r.age_group,
        r.prep_time,
        r.cook_time,
        r.servings,
        r.image_url,
        r.created_at,
        u.id as user_id,
        u.email as user_email,
        u.display_name as user_name,
        pt.name as potato_type_name,
        c.name as category_name
      FROM recipe_submissions rs
      JOIN recipes r ON rs.recipe_id = r.id
      JOIN users u ON rs.user_id = u.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE rs.status = ?
      ORDER BY rs.submitted_at DESC
    `).bind(status).all();
    
    return c.json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return c.json({ success: false, error: 'Failed to fetch submissions' }, 500);
  }
});

// Review/approve a submission
const reviewSchema = z.object({
  action: z.enum(['approve', 'reject']),
  admin_notes: z.string().optional(),
});

app.post('/submissions/:id/review', zValidator('json', reviewSchema), async (c) => {
  const db = c.env.DB;
  const adminUser = c.get('user');
  const submissionId = parseInt(c.req.param('id'));
  const { action, admin_notes } = c.req.valid('json');
  
  try {
    // Get submission details
    const submission = await db.prepare(`
      SELECT rs.*, r.id as recipe_id
      FROM recipe_submissions rs
      JOIN recipes r ON rs.recipe_id = r.id
      WHERE rs.id = ?
    `).bind(submissionId).first<{ 
      id: number; 
      recipe_id: number; 
      user_id: number;
      status: string;
    }>();
    
    if (!submission) {
      return c.json({ success: false, error: 'Submission not found' }, 404);
    }
    
    if (submission.status !== 'pending') {
      return c.json({ success: false, error: 'Submission already reviewed' }, 400);
    }
    
    // Update submission
    await db.prepare(`
      UPDATE recipe_submissions 
      SET status = ?, admin_notes = ?, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = ?
      WHERE id = ?
    `).bind(
      action === 'approve' ? 'approved' : 'rejected',
      admin_notes || null,
      adminUser.id,
      submissionId
    ).run();
    
    // Update recipe status
    await db.prepare(`
      UPDATE recipes 
      SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      action === 'approve' ? 'approved' : 'rejected',
      adminUser.id,
      submission.recipe_id
    ).run();
    
    // Award points to user for approved submission
    if (action === 'approve') {
      await db.prepare(`
        UPDATE user_points 
        SET total_points = total_points + 100, 
            recipes_uploaded = recipes_uploaded + 1,
            last_activity_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(submission.user_id).run();
    }
    
    return c.json({
      success: true,
      message: `Submission ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
    });
    
  } catch (error) {
    console.error('Error reviewing submission:', error);
    return c.json({ success: false, error: 'Failed to review submission' }, 500);
  }
});

// Create new recipe (admin bypasses approval)
const createRecipeSchema = z.object({
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
  })).min(1),
  steps: z.array(z.object({
    instruction: z.string().min(1),
    tip: z.string().optional(),
  })).min(1),
  publish: z.boolean().default(true),
});

app.post('/recipes', zValidator('json', createRecipeSchema), async (c) => {
  const db = c.env.DB;
  const adminUser = c.get('user');
  const data = c.req.valid('json');
  
  try {
    // Generate slug
    const baseSlug = data.title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
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
        status, created_by, approved_by, approved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      data.publish ? 'approved' : 'draft',
      adminUser.id,
      data.publish ? adminUser.id : null,
      data.publish ? new Date().toISOString() : null
    ).run();
    
    const recipeId = result.meta.last_row_id;
    
    // Insert ingredients
    for (let i = 0; i < data.ingredients.length; i++) {
      const ing = data.ingredients[i];
      await db.prepare(`
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
    }
    
    // Insert steps
    for (let i = 0; i < data.steps.length; i++) {
      const step = data.steps[i];
      await db.prepare(`
        INSERT INTO recipe_steps (recipe_id, step_number, instruction, tip)
        VALUES (?, ?, ?, ?)
      `).bind(recipeId, i + 1, step.instruction, step.tip || null).run();
    }
    
    return c.json({
      success: true,
      data: { id: recipeId, slug },
      message: data.publish ? 'Recipe published!' : 'Recipe saved as draft',
    }, 201);
    
  } catch (error) {
    console.error('Error creating recipe:', error);
    return c.json({ success: false, error: 'Failed to create recipe' }, 500);
  }
});

export default app;
