import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sign } from 'hono/jwt';
import type { Env, User } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Registration schema
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  display_name: z.string().min(2, 'Display name must be at least 2 characters').optional(),
});

// Login schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Register new user
app.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, display_name } = c.req.valid('json');
  const db = c.env.DB;
  
  try {
    // Check if user already exists
    const existing = await db.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();
    
    if (existing) {
      return c.json({ success: false, error: 'Email already registered' }, 409);
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insert user
    const result = await db.prepare(
      'INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).bind(email, passwordHash, display_name || null, 'user').run();
    
    const userId = result.meta.last_row_id;
    
    // Initialize user points
    await db.prepare(
      'INSERT INTO user_points (user_id, total_points) VALUES (?, 0)'
    ).bind(userId).run();
    
    // Generate JWT
    const token = await sign(
      { 
        userId, 
        email, 
        role: 'user',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      },
      c.env.JWT_SECRET
    );
    
    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: userId,
          email,
          display_name: display_name || null,
          role: 'user',
        },
      },
      message: 'Registration successful! Welcome to Spud Buds!',
    }, 201);
    
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// Login
app.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.env.DB;
  
  try {
    // Find user
    const { results } = await db.prepare(
      'SELECT id, email, display_name, role, password_hash, is_active FROM users WHERE email = ?'
    ).bind(email).all<User & { password_hash: string }>();
    
    if (!results || results.length === 0) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }
    
    const user = results[0];
    
    // Check if account is active
    if (!user.is_active) {
      return c.json({ success: false, error: 'Account has been deactivated' }, 401);
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return c.json({ success: false, error: 'Invalid email or password' }, 401);
    }
    
    // Update last login
    await db.prepare(
      'UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(user.id).run();
    
    // Generate JWT
    const token = await sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
      },
      c.env.JWT_SECRET
    );
    
    // Remove password_hash from response
    const { password_hash: _, ...userWithoutPassword } = user;
    
    return c.json({
      success: true,
      data: {
        token,
        user: userWithoutPassword,
      },
      message: 'Login successful!',
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// Request password reset (placeholder - implement email service later)
app.post('/forgot-password', async (c) => {
  // TODO: Implement password reset with email service
  return c.json({ 
    success: true, 
    message: 'If an account exists with that email, you will receive reset instructions.' 
  });
});

export default app;
