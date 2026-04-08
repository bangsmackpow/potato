import { Hono } from 'hono';
import type { Env, Recipe } from '../types';

const app = new Hono<{ Bindings: Env }>();

// Generate printable recipe card
app.get('/:slug', async (c) => {
  const db = c.env.DB;
  const slug = c.req.param('slug');
  
  try {
    // Get recipe with all details
    const recipeResult = await db.prepare(`
      SELECT 
        r.*,
        c.name as category_name,
        pt.name as potato_type_name, pt.color as potato_type_color,
        u.display_name as author_name
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      LEFT JOIN users u ON r.created_by = u.id
      WHERE r.slug = ? AND r.status = 'approved'
    `).bind(slug).first<Recipe>();
    
    if (!recipeResult) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head><title>Recipe Not Found</title></head>
        <body style="font-family: Georgia, serif; text-align: center; padding: 50px;">
          <h1>🥔 Recipe Not Found</h1>
          <p>This recipe doesn't exist or hasn't been approved yet.</p>
          <a href="/" style="color: #D4A373;">Back to Spud Buds</a>
        </body>
        </html>
      `, 404);
    }
    
    const recipe = recipeResult;
    
    // Get ingredients with alternatives
    const { results: ingredients } = await db.prepare(`
      SELECT i.*, 
        json_group_array(
          json_object(
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
      alternatives_json: string;
    }>();
    
    // Parse alternatives
    const parsedIngredients = ingredients.map(i => ({
      ...i,
      alternatives: JSON.parse(i.alternatives_json).filter((a: { alternative_name: string }) => a.alternative_name !== null)
    }));
    
    // Get steps
    const { results: steps } = await db.prepare(`
      SELECT * FROM recipe_steps
      WHERE recipe_id = ?
      ORDER BY step_number
    `).bind(recipe.id).all();
    
    // Generate shopping list items
    const shoppingList = parsedIngredients.map(i => {
      let item = i.name;
      if (i.amount) {
        item = `${i.amount}${i.unit ? ' ' + i.unit : ''} ${i.name}`;
      }
      return item;
    });
    
    // Generate the printable HTML
    const html = generateRecipeCardHTML(recipe, parsedIngredients, steps, shoppingList);
    
    return c.html(html);
    
  } catch (error) {
    console.error('Error generating recipe card:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Error</title></head>
      <body style="font-family: Georgia, serif; text-align: center; padding: 50px;">
        <h1>🥔 Oops!</h1>
        <p>Something went wrong generating your recipe card.</p>
        <a href="/" style="color: #D4A373;">Back to Spud Buds</a>
      </body>
      </html>
    `, 500);
  }
});

function generateRecipeCardHTML(
  recipe: Recipe,
  ingredients: Array<{ name: string; amount: string | null; unit: string | null; is_main_ingredient: number; alternatives: Array<{ alternative_name: string; reason: string | null; notes: string | null }> }>,
  steps: Array<{ id: number; step_number: number; instruction: string; tip: string | null }>,
  shoppingList: string[]
): string {
  const potatoColor = recipe.potato_type_color || '#D4A373';
  const difficultyEmoji = recipe.difficulty === 'easy' ? '🟢' : recipe.difficulty === 'medium' ? '🟡' : '🔴';
  const ageGroupEmoji = recipe.age_group === '4-6' ? '👶' : recipe.age_group === '7-10' ? '🧒' : '👦';
  
  const ingredientsHTML = ingredients.map((ing, idx) => {
    const amount = ing.amount ? `${ing.amount}${ing.unit ? ' ' + ing.unit : ''}` : '';
    const altText = ing.alternatives.length > 0 
      ? `<small class="alternatives">💡 Alternatives: ${ing.alternatives.map(a => a.alternative_name).join(', ')}</small>`
      : '';
    
    return `
      <li class="ingredient ${ing.is_main_ingredient ? 'main' : ''}" style="--delay: ${idx * 0.05}s">
        <label class="checkbox">
          <input type="checkbox">
          <span class="checkmark"></span>
          <span class="ingredient-text">
            ${amount ? `<strong>${amount}</strong> ` : ''}${ing.name}
          </span>
        </label>
        ${altText}
      </li>
    `;
  }).join('');
  
  const stepsHTML = steps.map((step, idx) => `
    <li class="step" style="--step-color: ${potatoColor}; --delay: ${idx * 0.1}s">
      <div class="step-number">${step.step_number}</div>
      <div class="step-content">
        <p>${step.instruction}</p>
        ${step.tip ? `<div class="step-tip">💡 ${step.tip}</div>` : ''}
      </div>
    </li>
  `).join('');
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${recipe.title} - Spud Buds Recipe Card</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Quicksand:wght@400;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    :root {
      --potato-color: ${potatoColor};
      --bg-color: #F4F1DE;
      --text-color: #3D405B;
      --light-bg: #FFFFFF;
      --border-color: #E0E0E0;
    }
    
    body {
      font-family: 'Quicksand', 'Georgia', serif;
      background: var(--bg-color);
      color: var(--text-color);
      line-height: 1.5;
    }
    
    /* Print styles - 1/2 sheet (5.5\" x 8.5\") */
    @media print {
      @page {
        size: 5.5in 8.5in;
        margin: 0.25in;
      }
      
      body {
        background: white;
      }
      
      .no-print {
        display: none !important;
      }
      
      .recipe-card {
        box-shadow: none !important;
        border: 2px solid var(--border-color) !important;
        break-inside: avoid;
      }
      
      .back-side {
        page-break-before: always;
      }
    }
    
    /* Screen styles */
    @media screen {
      body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
      }
      
      .recipe-card {
        width: 5.5in;
        max-width: 100%;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      }
    }
    
    /* Print button */
    .print-controls {
      display: flex;
      gap: 15px;
      margin-bottom: 20px;
    }
    
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 25px;
      font-family: 'Quicksand', sans-serif;
      font-weight: 600;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .btn-primary {
      background: var(--potato-color);
      color: white;
    }
    
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    
    .btn-secondary {
      background: white;
      color: var(--text-color);
      border: 2px solid var(--border-color);
    }
    
    .btn-secondary:hover {
      border-color: var(--potato-color);
      color: var(--potato-color);
    }
    
    /* Recipe Card Front */
    .recipe-card {
      background: var(--light-bg);
      border-radius: 15px;
      overflow: hidden;
      border: 3px solid var(--potato-color);
    }
    
    .card-header {
      background: var(--potato-color);
      color: white;
      padding: 15px 20px;
      text-align: center;
    }
    
    .card-header h1 {
      font-family: 'Patrick Hand', cursive;
      font-size: 28px;
      margin-bottom: 8px;
      text-shadow: 2px 2px 0 rgba(0,0,0,0.1);
    }
    
    .recipe-meta {
      display: flex;
      justify-content: center;
      gap: 15px;
      font-size: 13px;
      flex-wrap: wrap;
    }
    
    .recipe-meta span {
      background: rgba(255,255,255,0.2);
      padding: 4px 10px;
      border-radius: 15px;
    }
    
    .card-body {
      display: grid;
      grid-template-columns: 1fr 1fr;
      min-height: 400px;
    }
    
    @media (max-width: 500px) {
      .card-body {
        grid-template-columns: 1fr;
      }
    }
    
    .photo-section {
      background: #f8f8f8;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      border-right: 2px dashed var(--border-color);
    }
    
    .recipe-photo {
      width: 100%;
      height: auto;
      max-height: 300px;
      object-fit: cover;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    
    .photo-placeholder {
      width: 100%;
      aspect-ratio: 1;
      background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 60px;
    }
    
    .recipe-section {
      padding: 20px;
      display: flex;
      flex-direction: column;
    }
    
    .recipe-description {
      font-style: italic;
      color: #666;
      margin-bottom: 15px;
      font-size: 14px;
    }
    
    .time-info {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
      padding: 10px;
      background: #f9f9f9;
      border-radius: 8px;
      font-size: 13px;
    }
    
    .time-info div {
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .ingredients-section h3 {
      font-family: 'Patrick Hand', cursive;
      font-size: 20px;
      color: var(--potato-color);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .ingredients-list {
      list-style: none;
      font-size: 13px;
    }
    
    .ingredient {
      margin-bottom: 8px;
      animation: fadeIn 0.5s ease backwards;
      animation-delay: var(--delay, 0s);
    }
    
    .ingredient.main {
      font-weight: 600;
    }
    
    .checkbox {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      cursor: pointer;
    }
    
    .checkbox input {
      display: none;
    }
    
    .checkmark {
      width: 16px;
      height: 16px;
      border: 2px solid var(--potato-color);
      border-radius: 3px;
      flex-shrink: 0;
      margin-top: 2px;
      position: relative;
    }
    
    .checkbox input:checked + .checkmark::after {
      content: '✓';
      position: absolute;
      top: -3px;
      left: 1px;
      color: var(--potato-color);
      font-weight: bold;
      font-size: 14px;
    }
    
    .alternatives {
      display: block;
      color: #888;
      font-size: 11px;
      margin-left: 24px;
      margin-top: 2px;
      font-style: italic;
    }
    
    /* Back side */
    .back-side {
      background: var(--light-bg);
      border-radius: 15px;
      overflow: hidden;
      border: 3px solid var(--potato-color);
    }
    
    .back-header {
      background: var(--potato-color);
      color: white;
      padding: 15px 20px;
      text-align: center;
    }
    
    .back-header h2 {
      font-family: 'Patrick Hand', cursive;
      font-size: 24px;
    }
    
    .back-content {
      padding: 20px;
    }
    
    .steps-section {
      margin-bottom: 25px;
    }
    
    .steps-section h3 {
      font-family: 'Patrick Hand', cursive;
      font-size: 20px;
      color: var(--potato-color);
      margin-bottom: 15px;
    }
    
    .steps-list {
      list-style: none;
    }
    
    .step {
      display: flex;
      gap: 12px;
      margin-bottom: 15px;
      animation: slideIn 0.5s ease backwards;
      animation-delay: var(--delay, 0s);
    }
    
    .step-number {
      width: 28px;
      height: 28px;
      background: var(--step-color, var(--potato-color));
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .step-content p {
      font-size: 14px;
      margin-bottom: 5px;
    }
    
    .step-tip {
      background: #FFF8E7;
      border-left: 3px solid #FFD700;
      padding: 8px 12px;
      border-radius: 0 8px 8px 0;
      font-size: 12px;
      color: #666;
    }
    
    /* Shopping list */
    .shopping-section {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 10px;
      margin-bottom: 20px;
    }
    
    .shopping-section h3 {
      font-family: 'Patrick Hand', cursive;
      font-size: 20px;
      color: var(--potato-color);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .shopping-list {
      list-style: none;
      column-count: 2;
      column-gap: 15px;
      font-size: 12px;
    }
    
    @media (max-width: 500px) {
      .shopping-list {
        column-count: 1;
      }
    }
    
    .shopping-list li {
      margin-bottom: 6px;
      break-inside: avoid;
    }
    
    /* Notes section */
    .notes-section {
      border-top: 2px dashed var(--border-color);
      padding-top: 15px;
    }
    
    .notes-section h3 {
      font-family: 'Patrick Hand', cursive;
      font-size: 18px;
      color: var(--potato-color);
      margin-bottom: 10px;
    }
    
    .notes-lines {
      background: repeating-linear-gradient(
        transparent,
        transparent 19px,
        #ddd 19px,
        #ddd 20px
      );
      min-height: 100px;
      padding: 5px;
    }
    
    /* Footer */
    .card-footer {
      background: #f0f0f0;
      padding: 10px 20px;
      text-align: center;
      font-size: 11px;
      color: #888;
    }
    
    .card-footer a {
      color: var(--potato-color);
      text-decoration: none;
    }
    
    /* Fold line indicator */
    .fold-line {
      text-align: center;
      padding: 5px;
      font-size: 11px;
      color: #999;
      background: #f0f0f0;
      border-top: 1px dashed #ccc;
      border-bottom: 1px dashed #ccc;
    }
    
    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(-10px); }
      to { opacity: 1; transform: translateX(0); }
    }
    
    /* Spud Buds branding */
    .brand {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-family: 'Patrick Hand', cursive;
      font-size: 16px;
    }
    
    .brand-icon {
      font-size: 24px;
    }
  </style>
</head>
<body>
  <div class="print-controls no-print">
    <button class="btn btn-primary" onclick="window.print()">
      🖨️ Print Recipe Card
    </button>
    <button class="btn btn-secondary" onclick="history.back()">
      ← Back
    </button>
  </div>
  
  <!-- Front Side -->
  <div class="recipe-card">
    <div class="card-header">
      <h1>${recipe.title}</h1>
      <div class="recipe-meta">
        <span>${difficultyEmoji} ${recipe.difficulty || 'Easy'}</span>
        <span>${ageGroupEmoji} Ages ${recipe.age_group || 'All'}</span>
        ${recipe.potato_type_name ? `<span>🥔 ${recipe.potato_type_name}</span>` : ''}
        <span>👨‍🍳 Serves ${recipe.servings || '4'}</span>
      </div>
    </div>
    
    <div class="card-body">
      <div class="photo-section">
        ${recipe.image_url 
          ? `<img src="${recipe.image_url}" alt="${recipe.title}" class="recipe-photo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'">`
          : ''
        }
        <div class="photo-placeholder" ${recipe.image_url ? 'style="display:none"' : ''}>
          🥔
          <small style="font-size: 14px; margin-top: 10px;">Photo coming soon!</small>
        </div>
      </div>
      
      <div class="recipe-section">
        ${recipe.description ? `<p class="recipe-description">${recipe.description}</p>` : ''}
        
        <div class="time-info">
          ${recipe.prep_time ? `<div>⏱️ Prep: ${recipe.prep_time} min</div>` : ''}
          ${recipe.cook_time ? `<div>🔥 Cook: ${recipe.cook_time} min</div>` : ''}
          ${recipe.prep_time && recipe.cook_time ? `<div>⏰ Total: ${recipe.prep_time + recipe.cook_time} min</div>` : ''}
        </div>
        
        <div class="ingredients-section">
          <h3>📝 Ingredients</h3>
          <ul class="ingredients-list">
            ${ingredientsHTML}
          </ul>
        </div>
      </div>
    </div>
  </div>
  
  <div class="fold-line no-print">
    ↕️ Fold here ↕️ (Back side below)
  </div>
  
  <!-- Back Side -->
  <div class="back-side">
    <div class="back-header">
      <h2>👨‍🍳 Let's Cook!</h2>
    </div>
    
    <div class="back-content">
      <div class="steps-section">
        <h3>Instructions</h3>
        <ul class="steps-list">
          ${stepsHTML}
        </ul>
      </div>
      
      <div class="shopping-section">
        <h3>🛒 Shopping List (Cut & Take to Store)</h3>
        <ul class="shopping-list">
          ${shoppingList.map(item => `<li><label class="checkbox"><input type="checkbox"><span class="checkmark"></span> ${item}</label></li>`).join('')}
        </ul>
      </div>
      
      <div class="notes-section">
        <h3>📝 Chef's Notes</h3>
        <div class="notes-lines"></div>
      </div>
    </div>
    
    <div class="card-footer">
      <div class="brand">
        <span class="brand-icon">🥔</span>
        <span>Made with love by Spud Buds • spudbuds.cooking</span>
      </div>
    </div>
  </div>
  
  <script>
    // Save checkbox states to localStorage
    document.querySelectorAll('.checkbox input').forEach(checkbox => {
      const key = 'recipe_${recipe.id}_' + checkbox.closest('li').textContent.trim();
      checkbox.checked = localStorage.getItem(key) === 'true';
      
      checkbox.addEventListener('change', () => {
        localStorage.setItem(key, checkbox.checked);
      });
    });
  </script>
</body>
</html>
  `;
}

export default app;
