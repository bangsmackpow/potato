import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Discovery quiz schema
const quizSchema = z.object({
  potato_type_id: z.number(),
  q1_flavor: z.enum(['savory', 'sweet', 'spicy', 'mild']),
  q2_texture: z.enum(['crispy', 'soft', 'creamy', 'crunchy']),
  q3_taste: z.enum(['sweet', 'savory', 'sour', 'umami']),
  q4_preparation: z.enum(['quick', 'elaborate', 'simple', 'fancy']),
  q5_meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
});

// Submit quiz and get recipe suggestion
app.post('/discover', zValidator('json', quizSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid('json');
  
  // Try to get user from auth header if available
  let userId: number | null = null;
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      // We'll just use a simple session ID for anonymous users
      // Actual user linking would require JWT verification
    } catch {
      // Anonymous user
    }
  }
  
  const sessionId = crypto.randomUUID();
  
  try {
    // Save quiz response
    await db.prepare(`
      INSERT INTO discovery_quizzes (
        user_id, session_id, potato_type_id,
        question_1, question_2, question_3, question_4, question_5
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      sessionId,
      data.potato_type_id,
      data.q1_flavor,
      data.q2_texture,
      data.q3_taste,
      data.q4_preparation,
      data.q5_meal_type
    ).run();
    
    // Find matching recipe based on preferences
    // This is a simplified matching algorithm - we could make it more sophisticated
    let sql = `
      SELECT 
        r.id, r.title, r.slug, r.description, r.difficulty, r.age_group,
        r.prep_time, r.cook_time, r.servings, r.image_url,
        c.name as category_name,
        pt.name as potato_type_name, pt.color as potato_type_color,
        COUNT(DISTINCT i.id) as ingredient_count
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      LEFT JOIN ingredients i ON r.id = i.recipe_id
      WHERE r.status = 'approved'
        AND (r.potato_type_id = ? OR r.potato_type_id IS NULL)
    `;
    
    const params: (string | number)[] = [data.potato_type_id];
    
    // Meal type matching
    if (data.q5_meal_type === 'breakfast') {
      sql += ` AND (c.slug = 'breakfast' OR r.age_group = 'all')`;
    } else if (data.q5_meal_type === 'snack') {
      sql += ` AND (c.slug = 'snacks' OR r.prep_time < 20)`;
    }
    
    // Difficulty based on preparation preference
    if (data.q4_preparation === 'quick') {
      sql += ` AND (r.prep_time + r.cook_time < 30 OR r.difficulty = 'easy')`;
    } else if (data.q4_preparation === 'simple') {
      sql += ` AND r.difficulty IN ('easy', 'medium')`;
    }
    
    sql += `
      GROUP BY r.id
      ORDER BY 
        CASE 
          WHEN r.potato_type_id = ? THEN 2
          ELSE 1
        END DESC,
        r.created_at DESC
      LIMIT 3
    `;
    params.push(data.potato_type_id);
    
    const { results: recipes } = await db.prepare(sql).bind(...params).all();
    
    // If no recipes found with strict criteria, get any approved recipe with this potato
    if (!recipes || recipes.length === 0) {
      const { results: fallbackRecipes } = await db.prepare(`
        SELECT 
          r.id, r.title, r.slug, r.description, r.difficulty, r.age_group,
          r.prep_time, r.cook_time, r.servings, r.image_url,
          c.name as category_name,
          pt.name as potato_type_name, pt.color as potato_type_color
        FROM recipes r
        LEFT JOIN categories c ON r.category_id = c.id
        LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
        WHERE r.status = 'approved'
        ORDER BY r.created_at DESC
        LIMIT 3
      `).all();
      
      return c.json({
        success: true,
        data: {
          session_id: sessionId,
          recipes: fallbackRecipes || [],
          message: "We couldn't find an exact match, but here are some tasty options!",
        },
      });
    }
    
    // Update quiz with suggested recipe (first match)
    if (recipes && recipes.length > 0) {
      await db.prepare(`
        UPDATE discovery_quizzes 
        SET suggested_recipe_id = ? 
        WHERE session_id = ?
      `).bind(recipes[0].id, sessionId).run();
    }
    
    // Get the selected potato type info
    const potatoType = await db.prepare(`
      SELECT * FROM potato_types WHERE id = ?
    `).bind(data.potato_type_id).first();
    
    return c.json({
      success: true,
      data: {
        session_id: sessionId,
        potato_type: potatoType,
        preferences: {
          flavor: data.q1_flavor,
          texture: data.q2_texture,
          taste: data.q3_taste,
          preparation: data.q4_preparation,
          meal_type: data.q5_meal_type,
        },
        recipes: recipes,
        message: `Great choice! We found some ${potatoType?.name} recipes you'll love!`,
      },
    });
    
  } catch (error) {
    console.error('Error in quiz discovery:', error);
    return c.json({ success: false, error: 'Failed to find recipes' }, 500);
  }
});

// Get quiz history (requires auth)
app.use('/history', authMiddleware);
app.get('/history', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  
  try {
    const { results } = await db.prepare(`
      SELECT 
        dq.*,
        pt.name as potato_type_name,
        r.title as suggested_recipe_title,
        r.slug as suggested_recipe_slug
      FROM discovery_quizzes dq
      LEFT JOIN potato_types pt ON dq.potato_type_id = pt.id
      LEFT JOIN recipes r ON dq.suggested_recipe_id = r.id
      WHERE dq.user_id = ?
      ORDER BY dq.created_at DESC
      LIMIT 10
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    console.error('Error fetching quiz history:', error);
    return c.json({ success: false, error: 'Failed to fetch history' }, 500);
  }
});

export default app;
