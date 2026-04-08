import { Hono } from 'hono';
import type { Env, User } from '../types';
import { premiumOrAdmin } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Upload image (premium feature)
app.use('*', premiumOrAdmin);

app.post('/recipe-photo', async (c) => {
  const bucket = c.env.IMAGES_BUCKET;
  const db = c.env.DB;
  const user = c.get('user');
  
  try {
    const formData = await c.req.formData();
    const file = formData.get('image') as File | null;
    const recipeId = formData.get('recipe_id');
    const caption = formData.get('caption') as string | null;
    
    if (!file) {
      return c.json({ success: false, error: 'No image provided' }, 400);
    }
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ success: false, error: 'File must be an image' }, 400);
    }
    
    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'Image must be under 5MB' }, 400);
    }
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `uploads/${user.id}/${Date.now()}.${ext}`;
    
    // Upload to R2
    await bucket.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });
    
    // Get public URL (in production, you'd have a custom domain)
    const imageUrl = `/images/${filename}`;
    
    // Save to database
    if (recipeId) {
      const result = await db.prepare(`
        INSERT INTO user_uploads (user_id, recipe_id, image_url, caption, points_earned)
        VALUES (?, ?, ?, ?, 50)
      `).bind(user.id, parseInt(recipeId as string), imageUrl, caption).run();
      
      // Update user points
      await db.prepare(`
        UPDATE user_points 
        SET total_points = total_points + 50, 
            photos_shared = photos_shared + 1,
            last_activity_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).bind(user.id).run();
      
      return c.json({
        success: true,
        data: {
          upload_id: result.meta.last_row_id,
          image_url: imageUrl,
          points_earned: 50,
        },
        message: 'Photo uploaded successfully! +50 points!',
      }, 201);
    }
    
    return c.json({
      success: true,
      data: { image_url: imageUrl },
      message: 'Image uploaded successfully',
    });
    
  } catch (error) {
    console.error('Error uploading image:', error);
    return c.json({ success: false, error: 'Failed to upload image' }, 500);
  }
});

// Get user's uploaded photos
app.get('/my-photos', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  
  try {
    const { results } = await db.prepare(`
      SELECT 
        uu.*,
        r.title as recipe_title,
        r.slug as recipe_slug
      FROM user_uploads uu
      LEFT JOIN recipes r ON uu.recipe_id = r.id
      WHERE uu.user_id = ?
      ORDER BY uu.created_at DESC
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    console.error('Error fetching uploads:', error);
    return c.json({ success: false, error: 'Failed to fetch uploads' }, 500);
  }
});

// Get leaderboard
app.get('/leaderboard', async (c) => {
  const db = c.env.DB;
  
  try {
    const { results } = await db.prepare(`
      SELECT 
        up.user_id,
        up.total_points,
        up.recipes_uploaded,
        up.photos_shared,
        up.weekly_streak,
        u.display_name,
        u.role
      FROM user_points up
      JOIN users u ON up.user_id = u.id
      WHERE u.is_active = 1
      ORDER BY up.total_points DESC
      LIMIT 20
    `).all();
    
    return c.json({
      success: true,
      data: results,
    });
    
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return c.json({ success: false, error: 'Failed to fetch leaderboard' }, 500);
  }
});

export default app;
