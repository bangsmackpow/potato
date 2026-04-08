import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import Stripe from 'stripe';
import type { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Create checkout session for premium subscription
app.use('/checkout', authMiddleware);
app.post('/checkout', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
  
  const user = c.get('user');
  const origin = c.req.header('Origin') || 'https://spudbuds.cooking';
  
  try {
    // Check if user already has an active subscription
    const existingSub = await c.env.DB.prepare(`
      SELECT stripe_customer_id FROM subscriptions
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(user.id).first<{ stripe_customer_id: string }>();
    
    let customerId = existingSub?.stripe_customer_id;
    
    // Create customer if needed
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.display_name || undefined,
        metadata: {
          userId: user.id.toString(),
        },
      });
      customerId = customer.id;
    }
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: c.env.PREMIUM_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${origin}/premium/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/premium`,
      subscription_data: {
        metadata: {
          userId: user.id.toString(),
        },
      },
    });
    
    return c.json({
      success: true,
      data: {
        session_id: session.id,
        url: session.url,
      },
    });
    
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return c.json({ success: false, error: 'Failed to create checkout session' }, 500);
  }
});

// Get subscription status
app.use('/status', authMiddleware);
app.get('/status', async (c) => {
  const db = c.env.DB;
  const user = c.get('user');
  
  try {
    const subscription = await db.prepare(`
      SELECT 
        s.*,
        CASE 
          WHEN s.status = 'active' AND s.current_period_end > datetime('now') THEN 'active'
          ELSE s.status 
        END as effective_status
      FROM subscriptions s
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
      LIMIT 1
    `).bind(user.id).first();
    
    // Also check user's current role
    const userRole = await db.prepare(`
      SELECT role FROM users WHERE id = ?
    `).bind(user.id).first<{ role: string }>();
    
    return c.json({
      success: true,
      data: {
        subscription: subscription || null,
        user_role: userRole?.role,
        is_premium: userRole?.role === 'premium' || userRole?.role === 'admin',
      },
    });
    
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return c.json({ success: false, error: 'Failed to fetch subscription' }, 500);
  }
});

// Cancel subscription
app.use('/cancel', authMiddleware);
app.post('/cancel', async (c) => {
  const db = c.env.DB;
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
  
  const user = c.get('user');
  
  try {
    // Get active subscription
    const subscription = await db.prepare(`
      SELECT stripe_subscription_id FROM subscriptions
      WHERE user_id = ? AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(user.id).first<{ stripe_subscription_id: string }>();
    
    if (!subscription?.stripe_subscription_id) {
      return c.json({ success: false, error: 'No active subscription found' }, 404);
    }
    
    // Cancel at period end in Stripe
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    
    // Update local record
    await db.prepare(`
      UPDATE subscriptions
      SET status = 'canceled'
      WHERE stripe_subscription_id = ?
    `).bind(subscription.stripe_subscription_id).run();
    
    return c.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
    });
    
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return c.json({ success: false, error: 'Failed to cancel subscription' }, 500);
  }
});

// Webhook handler (no auth, Stripe signature verification)
app.post('/webhook', async (c) => {
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
  });
  
  const signature = c.req.header('stripe-signature');
  const body = await c.req.text();
  
  if (!signature) {
    return c.json({ success: false, error: 'Missing signature' }, 400);
  }
  
  let event: Stripe.Event;
  
  try {
    event = stripe.webhooks.constructEvent(body, signature, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return c.json({ success: false, error: 'Invalid signature' }, 400);
  }
  
  const db = c.env.DB;
  
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.userId || '0');
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Save subscription to database
        await db.prepare(`
          INSERT INTO subscriptions (
            user_id, stripe_customer_id, stripe_subscription_id, status,
            current_period_start, current_period_end
          ) VALUES (?, ?, ?, 'active', datetime(?, 'unixepoch'), datetime(?, 'unixepoch'))
        `).bind(
          userId,
          customerId,
          subscriptionId,
          subscription.current_period_start,
          subscription.current_period_end
        ).run();
        
        // Update user role to premium
        await db.prepare(`
          UPDATE users SET role = 'premium' WHERE id = ?
        `).bind(userId).run();
        
        break;
      }
      
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        // Update subscription period
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        await db.prepare(`
          UPDATE subscriptions
          SET current_period_start = datetime(?, 'unixepoch'),
              current_period_end = datetime(?, 'unixepoch'),
              status = 'active',
              updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = ?
        `).bind(
          subscription.current_period_start,
          subscription.current_period_end,
          subscriptionId
        ).run();
        
        break;
      }
      
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        await db.prepare(`
          UPDATE subscriptions
          SET status = 'canceled', updated_at = CURRENT_TIMESTAMP
          WHERE stripe_subscription_id = ?
        `).bind(subscription.id).run();
        
        // Revert user to regular role
        const sub = await db.prepare(`
          SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ?
        `).bind(subscription.id).first<{ user_id: number }>();
        
        if (sub) {
          await db.prepare(`
            UPDATE users SET role = 'user' WHERE id = ?
          `).bind(sub.user_id).run();
        }
        
        break;
      }
    }
    
    return c.json({ received: true });
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return c.json({ success: false, error: 'Webhook processing failed' }, 500);
  }
});

export default app;
