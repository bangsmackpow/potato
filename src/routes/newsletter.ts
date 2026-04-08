import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env, User } from '../types';
import { authMiddleware, adminOnly } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Subscribe to newsletter (public)
const subscribeSchema = z.object({
  email: z.string().email('Valid email required'),
});

app.post('/subscribe', zValidator('json', subscribeSchema), async (c) => {
  const db = c.env.DB;
  const { email } = c.req.valid('json');
  
  // Check if user is logged in
  let userId: number | null = null;
  const authHeader = c.req.header('Authorization');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      // Decode token to get user ID (simplified - proper verification in production)
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId || null;
    } catch {
      // Token invalid, proceed as anonymous
    }
  }
  
  try {
    // Check if already subscribed
    const existing = await db.prepare(`
      SELECT id, is_active FROM newsletter_subscribers WHERE email = ?
    `).bind(email).first<{ id: number; is_active: number }>();
    
    if (existing) {
      if (existing.is_active) {
        return c.json({ 
          success: true, 
          message: 'You are already subscribed to our newsletter!' 
        });
      } else {
        // Reactivate
        await db.prepare(`
          UPDATE newsletter_subscribers 
          SET is_active = 1, unsubscribed_at = NULL
          WHERE id = ?
        `).bind(existing.id).run();
        
        return c.json({ 
          success: true, 
          message: 'Welcome back! Your subscription has been reactivated.' 
        });
      }
    }
    
    // New subscription
    await db.prepare(`
      INSERT INTO newsletter_subscribers (email, user_id)
      VALUES (?, ?)
    `).bind(email, userId).run();
    
    // TODO: Send welcome email via Resend or similar service
    
    return c.json({ 
      success: true, 
      message: 'Welcome to the Spud Buds family! Check your email for a confirmation.',
    }, 201);
    
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return c.json({ success: false, error: 'Subscription failed' }, 500);
  }
});

// Unsubscribe from newsletter (public - no auth to allow easy unsubscribing)
const unsubscribeSchema = z.object({
  email: z.string().email(),
});

app.post('/unsubscribe', zValidator('json', unsubscribeSchema), async (c) => {
  const db = c.env.DB;
  const { email } = c.req.valid('json');
  
  try {
    await db.prepare(`
      UPDATE newsletter_subscribers
      SET is_active = 0, unsubscribed_at = CURRENT_TIMESTAMP
      WHERE email = ?
    `).bind(email).run();
    
    return c.json({ 
      success: true, 
      message: 'You have been unsubscribed. Sorry to see you go! 🥔' 
    });
    
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return c.json({ success: false, error: 'Unsubscribe failed' }, 500);
  }
});

// Get subscription status (requires auth)
app.use('/status', authMiddleware);
app.get('/status', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  
  try {
    const subscription = await db.prepare(`
      SELECT is_active, subscribed_at, last_sent_at
      FROM newsletter_subscribers
      WHERE user_id = ?
      ORDER BY subscribed_at DESC
      LIMIT 1
    `).bind(user.id).first();
    
    return c.json({
      success: true,
      data: {
        subscribed: !!subscription && subscription.is_active === 1,
        subscription: subscription || null,
      },
    });
    
  } catch (error) {
    console.error('Subscription status error:', error);
    return c.json({ success: false, error: 'Failed to check subscription status' }, 500);
  }
});

// ADMIN ROUTES

// Get all subscribers (admin only)
app.use('/admin/subscribers', authMiddleware, adminOnly);
app.get('/admin/subscribers', async (c) => {
  const db = c.env.DB;
  const query = c.req.query();
  
  const page = parseInt(query.page || '1');
  const perPage = Math.min(parseInt(query.per_page || '50'), 100);
  const offset = (page - 1) * perPage;
  
  try {
    const { results } = await db.prepare(`
      SELECT 
        ns.id, ns.email, ns.is_active, ns.subscribed_at, 
        ns.unsubscribed_at, ns.last_sent_at,
        u.display_name as user_name
      FROM newsletter_subscribers ns
      LEFT JOIN users u ON ns.user_id = u.id
      ORDER BY ns.subscribed_at DESC
      LIMIT ? OFFSET ?
    `).bind(perPage, offset).all();
    
    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM newsletter_subscribers
    `).first<{ total: number }>();
    
    const activeCount = await db.prepare(`
      SELECT COUNT(*) as count FROM newsletter_subscribers WHERE is_active = 1
    `).first<{ count: number }>();
    
    return c.json({
      success: true,
      data: {
        subscribers: results,
        stats: {
          total: countResult?.total || 0,
          active: activeCount?.count || 0,
          inactive: (countResult?.total || 0) - (activeCount?.count || 0),
        },
        pagination: {
          page,
          per_page: perPage,
          total: countResult?.total || 0,
          total_pages: Math.ceil((countResult?.total || 0) / perPage),
        },
      },
    });
    
  } catch (error) {
    console.error('Subscribers fetch error:', error);
    return c.json({ success: false, error: 'Failed to fetch subscribers' }, 500);
  }
});

// Create newsletter issue (admin only)
const createNewsletterSchema = z.object({
  subject: z.string().min(5).max(200),
  content: z.string().min(10),
  featured_recipe_id: z.number().optional(),
  send_now: z.boolean().default(false),
});

app.use('/admin/create', authMiddleware, adminOnly);
app.post('/admin/create', zValidator('json', createNewsletterSchema), async (c) => {
  const db = c.env.DB;
  const { subject, content, featured_recipe_id, send_now } = c.req.valid('json');
  
  try {
    // Create newsletter issue
    const result = await db.prepare(`
      INSERT INTO newsletter_issues (subject, content, featured_recipe_id)
      VALUES (?, ?, ?)
    `).bind(subject, content, featured_recipe_id || null).run();
    
    const issueId = result.meta.last_row_id;
    
    // If send_now is true, queue it for sending
    if (send_now) {
      // Add to queue for async processing
      await c.env.TASK_QUEUE.send({
        type: 'send_newsletter',
        issue_id: issueId,
      });
      
      return c.json({
        success: true,
        data: { issue_id: issueId },
        message: 'Newsletter created and queued for sending!',
      }, 201);
    }
    
    return c.json({
      success: true,
      data: { issue_id: issueId },
      message: 'Newsletter draft created successfully!',
    }, 201);
    
  } catch (error) {
    console.error('Newsletter creation error:', error);
    return c.json({ success: false, error: 'Failed to create newsletter' }, 500);
  }
});

// Get all newsletter issues (admin only)
app.use('/admin/issues', authMiddleware, adminOnly);
app.get('/admin/issues', async (c) => {
  const db = c.env.DB;
  const query = c.req.query();
  
  const page = parseInt(query.page || '1');
  const perPage = Math.min(parseInt(query.per_page || '20'), 50);
  const offset = (page - 1) * perPage;
  
  try {
    const { results } = await db.prepare(`
      SELECT 
        ni.*,
        r.title as featured_recipe_title,
        r.slug as featured_recipe_slug
      FROM newsletter_issues ni
      LEFT JOIN recipes r ON ni.featured_recipe_id = r.id
      ORDER BY ni.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(perPage, offset).all();
    
    const countResult = await db.prepare(`
      SELECT COUNT(*) as total FROM newsletter_issues
    `).first<{ total: number }>();
    
    return c.json({
      success: true,
      data: {
        issues: results,
        pagination: {
          page,
          per_page: perPage,
          total: countResult?.total || 0,
          total_pages: Math.ceil((countResult?.total || 0) / perPage),
        },
      },
    });
    
  } catch (error) {
    console.error('Issues fetch error:', error);
    return c.json({ success: false, error: 'Failed to fetch newsletter issues' }, 500);
  }
});

// Send newsletter (admin only - triggers async send)
app.use('/admin/send/:id', authMiddleware, adminOnly);
app.post('/admin/send/:id', async (c) => {
  const issueId = parseInt(c.req.param('id'));
  
  try {
    // Queue for sending
    await c.env.TASK_QUEUE.send({
      type: 'send_newsletter',
      issue_id: issueId,
    });
    
    return c.json({
      success: true,
      message: 'Newsletter queued for sending to all active subscribers!',
    });
    
  } catch (error) {
    console.error('Newsletter send error:', error);
    return c.json({ success: false, error: 'Failed to queue newsletter' }, 500);
  }
});

// Preview newsletter (admin only)
app.use('/admin/preview/:id', authMiddleware, adminOnly);
app.get('/admin/preview/:id', async (c) => {
  const db = c.env.DB;
  const issueId = parseInt(c.req.param('id'));
  
  try {
    const issue = await db.prepare(`
      SELECT 
        ni.*,
        r.title as featured_recipe_title,
        r.slug as featured_recipe_slug,
        r.image_url as featured_recipe_image
      FROM newsletter_issues ni
      LEFT JOIN recipes r ON ni.featured_recipe_id = r.id
      WHERE ni.id = ?
    `).bind(issueId).first();
    
    if (!issue) {
      return c.json({ success: false, error: 'Newsletter issue not found' }, 404);
    }
    
    // Generate HTML preview
    const html = generateNewsletterHTML(issue);
    
    return c.html(html);
    
  } catch (error) {
    console.error('Newsletter preview error:', error);
    return c.json({ success: false, error: 'Failed to generate preview' }, 500);
  }
});

// Generate newsletter HTML template
function generateNewsletterHTML(issue: {
  subject: string;
  content: string;
  featured_recipe_title: string | null;
  featured_recipe_slug: string | null;
  featured_recipe_image: string | null;
}): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${issue.subject}</title>
  <style>
    body {
      font-family: 'Georgia', serif;
      background: #F4F1DE;
      color: #3D405B;
      line-height: 1.6;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      padding: 30px 0;
      background: linear-gradient(135deg, #D4A373 0%, #E07A5F 100%);
      border-radius: 15px;
      margin-bottom: 30px;
      color: white;
    }
    .header h1 {
      font-size: 32px;
      margin-bottom: 10px;
    }
    .header p {
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 15px;
      margin-bottom: 30px;
    }
    .featured-recipe {
      background: #f9f9f9;
      border-radius: 10px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #D4A373;
    }
    .featured-recipe img {
      width: 100%;
      border-radius: 8px;
      margin-bottom: 15px;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #81B29A;
      color: white;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      margin-top: 15px;
    }
    .footer {
      text-align: center;
      padding: 30px 0;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #D4A373;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🥔 Spud Buds</h1>
    <p>Potato Recipe of the Week</p>
  </div>
  
  <div class="content">
    <h2>${issue.subject}</h2>
    
    ${issue.content}
    
    ${issue.featured_recipe_title ? `
    <div class="featured-recipe">
      <h3>🌟 Featured Recipe: ${issue.featured_recipe_title}</h3>
      ${issue.featured_recipe_image ? `<img src="${issue.featured_recipe_image}" alt="${issue.featured_recipe_title}">` : ''}
      <a href="https://spudbuds.cooking/recipes/${issue.featured_recipe_slug}" class="btn">View Full Recipe</a>
    </div>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>Made with 🥔 for little chefs everywhere</p>
    <p>
      <a href="https://spudbuds.cooking">Visit Spud Buds</a> | 
      <a href="https://spudbuds.cooking/newsletter/unsubscribe">Unsubscribe</a>
    </p>
    <p>© 2024 Spud Buds Cookbook</p>
  </div>
</body>
</html>
  `;
}

export default app;
