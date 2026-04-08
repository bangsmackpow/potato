import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, User } from '../types';

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Get current user profile
app.get('/me', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  
  try {
    // Get user with points
    const userWithPoints = await db.prepare(`
      SELECT 
        u.id, u.email, u.display_name, u.role, u.created_at, u.last_login_at,
        up.total_points, up.recipes_uploaded, up.photos_shared, up.weekly_streak
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE u.id = ?
    `).bind(user.id).first();
    
    // Get subscription status if premium
    let subscription = null;
    if (user.role === 'premium') {
      subscription = await db.prepare(`
        SELECT status, current_period_start, current_period_end
        FROM subscriptions
        WHERE user_id = ? AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `).bind(user.id).first();
    }
    
    // Get favorite recipes count
    const favoritesCount = await db.prepare(`
      SELECT COUNT(*) as count FROM user_favorites WHERE user_id = ?
    `).bind(user.id).first<{ count: number }>();
    
    // Get user's submitted recipes
    const { results: submissions } = await db.prepare(`
      SELECT 
        rs.status, rs.submitted_at, rs.reviewed_at,
        r.id, r.title, r.slug, r.status as recipe_status
      FROM recipe_submissions rs
      JOIN recipes r ON rs.recipe_id = r.id
      WHERE rs.user_id = ?
      ORDER BY rs.submitted_at DESC
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: {
        ...userWithPoints,
        subscription,
        favorites_count: favoritesCount?.count || 0,
        submissions,
      },
    });
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    return c.json({ success: false, error: 'Failed to fetch profile' }, 500);
  }
});

// Update profile
const updateProfileSchema = z.object({
  display_name: z.string().min(2).max(50).optional(),
});

app.patch('/me', zValidator('json', updateProfileSchema), async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const data = c.req.valid('json');
  
  try {
    if (data.display_name) {
      await db.prepare(`
        UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(data.display_name, user.id).run();
    }
    
    return c.json({
      success: true,
      message: 'Profile updated successfully',
    });
    
  } catch (error) {
    console.error('Error updating profile:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

// Get user's favorite recipes
app.get('/favorites', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  
  try {
    const { results } = await db.prepare(`
      SELECT 
        r.id, r.title, r.slug, r.description, r.image_url,
        r.prep_time, r.cook_time, r.difficulty, r.age_group,
        c.name as category_name,
        uf.created_at as favorited_at
      FROM user_favorites uf
      JOIN recipes r ON uf.recipe_id = r.id
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE uf.user_id = ? AND r.status = 'approved'
      ORDER BY uf.created_at DESC
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return c.json({ success: false, error: 'Failed to fetch favorites' }, 500);
  }
});

// Add recipe to favorites
app.post('/favorites/:recipeId', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const recipeId = parseInt(c.req.param('recipeId'));
  
  try {
    await db.prepare(`
      INSERT OR IGNORE INTO user_favorites (user_id, recipe_id)
      VALUES (?, ?)
    `).bind(user.id, recipeId).run();
    
    return c.json({
      success: true,
      message: 'Added to favorites',
    });
    
  } catch (error) {
    console.error('Error adding favorite:', error);
    return c.json({ success: false, error: 'Failed to add favorite' }, 500);
  }
});

// Remove recipe from favorites
app.delete('/favorites/:recipeId', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  const recipeId = parseInt(c.req.param('recipeId'));
  
  try {
    await db.prepare(`
      DELETE FROM user_favorites WHERE user_id = ? AND recipe_id = ?
    `).bind(user.id, recipeId).run();
    
    return c.json({
      success: true,
      message: 'Removed from favorites',
    });
    
  } catch (error) {
    console.error('Error removing favorite:', error);
    return c.json({ success: false, error: 'Failed to remove favorite' }, 500);
  }
});

export default app;
