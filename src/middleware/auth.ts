import { Context, MiddlewareHandler } from 'hono';
import { verify } from 'hono/jwt';
import type { Env, JWTPayload, User } from '../types';

// Middleware to verify JWT token
export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { user: User } }> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Authorization required' }, 401);
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const payload = await verify(token, c.env.JWT_SECRET) as unknown as JWTPayload;
    
    // Check if token is expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ success: false, error: 'Token expired' }, 401);
    }
    
    // Fetch user from database
    const { results } = await c.env.DB.prepare(
      'SELECT id, email, display_name, role, is_active, created_at, updated_at, last_login_at FROM users WHERE id = ?'
    ).bind(payload.userId).all<User>();
    
    if (!results || results.length === 0) {
      return c.json({ success: false, error: 'User not found' }, 401);
    }
    
    const user = results[0];
    
    if (!user.is_active) {
      return c.json({ success: false, error: 'Account deactivated' }, 401);
    }
    
    // Set user in context
    c.set('user', user);
    
    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }
};

// Middleware to check if user is admin
export const adminOnly: MiddlewareHandler<{ Bindings: Env; Variables: { user: User } }> = async (c, next) => {
  const user = c.get('user');
  
  if (user.role !== 'admin') {
    return c.json({ success: false, error: 'Admin access required' }, 403);
  }
  
  await next();
};

// Middleware to check if user is premium or admin
export const premiumOrAdmin: MiddlewareHandler<{ Bindings: Env; Variables: { user: User } }> = async (c, next) => {
  const user = c.get('user');
  
  if (user.role !== 'admin' && user.role !== 'premium') {
    return c.json({ success: false, error: 'Premium subscription required' }, 403);
  }
  
  await next();
};
