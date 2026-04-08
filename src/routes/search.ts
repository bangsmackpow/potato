import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

// Full-text search endpoint
app.get("/", async (c) => {
  const db = c.env.DB;
  const query = c.req.query();

  const searchQuery = query.q;
  const page = parseInt(query.page || "1");
  const perPage = Math.min(parseInt(query.per_page || "12"), 50);
  const offset = (page - 1) * perPage;

  if (!searchQuery || searchQuery.trim().length < 2) {
    return c.json(
      {
        success: false,
        error: "Search query must be at least 2 characters",
      },
      400,
    );
  }

  const searchTerm = `%${searchQuery.toLowerCase()}%`;

  try {
    // Search across recipes, ingredients, and categories
    // Using SQLite FTS pattern with multiple LIKE clauses
    const { results } = await db
      .prepare(
        `
      SELECT DISTINCT
        r.id, r.title, r.slug, r.description, r.difficulty, r.age_group,
        r.prep_time, r.cook_time, r.servings, r.image_url,
        c.name as category_name,
        pt.name as potato_type_name, pt.color as potato_type_color,
        (
          CASE WHEN LOWER(r.title) LIKE ? THEN 10 ELSE 0 END +
          CASE WHEN LOWER(r.description) LIKE ? THEN 5 ELSE 0 END +
          CASE WHEN LOWER(c.name) LIKE ? THEN 3 ELSE 0 END +
          CASE WHEN LOWER(pt.name) LIKE ? THEN 3 ELSE 0 END
        ) as relevance_score
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      LEFT JOIN ingredients i ON r.id = i.recipe_id
      WHERE r.status = 'approved'
        AND (
          LOWER(r.title) LIKE ? OR
          LOWER(r.description) LIKE ? OR
          LOWER(c.name) LIKE ? OR
          LOWER(pt.name) LIKE ? OR
          LOWER(i.name) LIKE ?
        )
      GROUP BY r.id
      ORDER BY relevance_score DESC, r.created_at DESC
      LIMIT ? OFFSET ?
    `,
      )
      .bind(
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        searchTerm,
        perPage,
        offset,
      )
      .all();

    // Get total count
    const countResult = await db
      .prepare(
        `
      SELECT COUNT(DISTINCT r.id) as total
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      LEFT JOIN ingredients i ON r.id = i.recipe_id
      WHERE r.status = 'approved'
        AND (
          LOWER(r.title) LIKE ? OR
          LOWER(r.description) LIKE ? OR
          LOWER(c.name) LIKE ? OR
          LOWER(pt.name) LIKE ? OR
          LOWER(i.name) LIKE ?
        )
    `,
      )
      .bind(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
      .first<{ total: number }>();

    const total = countResult?.total || 0;

    // Get AI-assisted suggestions (mock for now - can integrate with OpenAI/Claude later)
    const aiSuggestions = generateAISuggestions(
      searchQuery,
      results as Array<{
        title: string;
        category_name: string;
        potato_type_name: string;
      }>,
    );

    return c.json({
      success: true,
      data: {
        query: searchQuery,
        results: results,
        ai_suggestions: aiSuggestions,
        pagination: {
          page,
          per_page: perPage,
          total,
          total_pages: Math.ceil(total / perPage),
        },
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return c.json({ success: false, error: "Search failed" }, 500);
  }
});

// Advanced search with filters
app.get("/advanced", async (c) => {
  const db = c.env.DB;
  const query = c.req.query();

  const searchQuery = query.q;
  const category = query.category;
  const potatoType = query.potato_type;
  const ageGroup = query.age_group;
  const difficulty = query.difficulty;
  const maxTime = query.max_time ? parseInt(query.max_time) : null;

  const page = parseInt(query.page || "1");
  const perPage = Math.min(parseInt(query.per_page || "12"), 50);
  const offset = (page - 1) * perPage;

  try {
    let sql = `
      SELECT DISTINCT
        r.id, r.title, r.slug, r.description, r.difficulty, r.age_group,
        r.prep_time, r.cook_time, r.servings, r.image_url,
        c.name as category_name,
        pt.name as potato_type_name, pt.color as potato_type_color
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
      LEFT JOIN ingredients i ON r.id = i.recipe_id
      WHERE r.status = 'approved'
    `;

    const params: (string | number)[] = [];

    if (searchQuery && searchQuery.trim().length >= 2) {
      const searchTerm = `%${searchQuery.toLowerCase()}%`;
      sql += ` AND (
        LOWER(r.title) LIKE ? OR
        LOWER(r.description) LIKE ? OR
        LOWER(i.name) LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      sql += ` AND c.slug = ?`;
      params.push(category);
    }

    if (potatoType) {
      sql += ` AND pt.slug = ?`;
      params.push(potatoType);
    }

    if (ageGroup) {
      sql += ` AND r.age_group = ?`;
      params.push(ageGroup);
    }

    if (difficulty) {
      sql += ` AND r.difficulty = ?`;
      params.push(difficulty);
    }

    if (maxTime) {
      sql += ` AND (r.prep_time + r.cook_time) <= ?`;
      params.push(maxTime);
    }

    sql += ` ORDER BY r.created_at DESC LIMIT ? OFFSET ?`;
    params.push(perPage, offset);

    const { results } = await db
      .prepare(sql)
      .bind(...params)
      .all();

    return c.json({
      success: true,
      data: {
        filters: {
          query: searchQuery,
          category,
          potato_type: potatoType,
          age_group: ageGroup,
          difficulty,
          max_time: maxTime,
        },
        results,
      },
    });
  } catch (error) {
    console.error("Advanced search error:", error);
    return c.json({ success: false, error: "Search failed" }, 500);
  }
});

// AI-assisted search suggestions
app.get("/suggest", async (c) => {
  const db = c.env.DB;
  const query = c.req.query("q");

  if (!query || query.length < 2) {
    return c.json({ success: true, data: { suggestions: [] } });
  }

  try {
    // Get suggestions from recipe titles
    const { results: titleSuggestions } = await db
      .prepare(
        `
      SELECT DISTINCT title as suggestion, 'recipe' as type
      FROM recipes
      WHERE status = 'approved' AND LOWER(title) LIKE ?
      LIMIT 5
    `,
      )
      .bind(`%${query.toLowerCase()}%`)
      .all();

    // Get suggestions from ingredients
    const { results: ingredientSuggestions } = await db
      .prepare(
        `
      SELECT DISTINCT i.name as suggestion, 'ingredient' as type
      FROM ingredients i
      JOIN recipes r ON i.recipe_id = r.id
      WHERE r.status = 'approved' AND LOWER(i.name) LIKE ?
      LIMIT 3
    `,
      )
      .bind(`%${query.toLowerCase()}%`)
      .all();

    // Get suggestions from categories
    const { results: categorySuggestions } = await db
      .prepare(
        `
      SELECT name as suggestion, 'category' as type
      FROM categories
      WHERE LOWER(name) LIKE ?
      LIMIT 2
    `,
      )
      .bind(`%${query.toLowerCase()}%`)
      .all();

    const allSuggestions = [
      ...titleSuggestions,
      ...ingredientSuggestions,
      ...categorySuggestions,
    ];

    return c.json({
      success: true,
      data: {
        query,
        suggestions: allSuggestions,
      },
    });
  } catch (error) {
    console.error("Suggestions error:", error);
    return c.json({ success: false, error: "Failed to get suggestions" }, 500);
  }
});

// Helper function to generate AI suggestions (mock implementation)
// In production, this would call an AI service like OpenAI or Claude
function generateAISuggestions(
  query: string,
  results: Array<{
    title: string;
    category_name: string;
    potato_type_name: string;
  }>,
) {
  const lowerQuery = query.toLowerCase();
  const suggestions: string[] = [];

  // Simple pattern matching for suggestions
  if (lowerQuery.includes("quick") || lowerQuery.includes("fast")) {
    suggestions.push(
      "Try filtering for recipes under 30 minutes using the max_time parameter",
    );
  }

  if (lowerQuery.includes("easy") || lowerQuery.includes("simple")) {
    suggestions.push(
      'Most of our recipes are designed to be kid-friendly with difficulty level "easy"',
    );
  }

  if (lowerQuery.includes("healthy") || lowerQuery.includes("nutritious")) {
    suggestions.push(
      "Sweet potatoes are packed with vitamins! Try recipes featuring sweet potatoes.",
    );
  }

  if (results.length === 0) {
    suggestions.push(
      'No exact matches found. Try searching for ingredient names like "cheese", "butter", or "salt"',
    );
    suggestions.push(
      "Or browse all recipes by category using /api/recipes/meta/categories",
    );
  } else if (results.length < 5) {
    suggestions.push(
      `Found ${results.length} result${results.length === 1 ? "" : "s"}. Try broadening your search or browse by potato type.`,
    );
  }

  // Ingredient-based suggestions
  const ingredientMatches = lowerQuery.match(
    /\b(potato|cheese|butter|milk|egg|salt|pepper|oil)\b/g,
  );
  if (ingredientMatches) {
    suggestions.push(
      `You searched for ${ingredientMatches.join(", ")}. Check the alternative ingredients section in recipes for substitution ideas!`,
    );
  }

  return {
    tips: suggestions,
    related_terms: extractRelatedTerms(query),
    potential_filters: {
      difficulty: ["easy", "medium", "hard"],
      age_group: ["4-6", "7-10", "11+"],
      potato_types: results
        .slice(0, 3)
        .map((r) => r.potato_type_name)
        .filter(Boolean),
    },
  };
}

function extractRelatedTerms(query: string): string[] {
  const related: string[] = [];
  const lower = query.toLowerCase();

  // Map common terms to related cooking terms
  const termMap: Record<string, string[]> = {
    bake: ["oven", "roast", "casserole"],
    fry: ["pan", "skillet", "crispy"],
    boil: ["mashed", "soft", "tender"],
    mash: ["creamy", "butter", "smooth"],
    roast: ["oven", "crispy", "seasoned"],
    kid: ["children", "easy", "simple", "fun"],
    breakfast: ["morning", "eggs", "hash browns"],
    dinner: ["evening", "main dish", "hearty"],
    snack: ["quick", "easy", "finger food"],
  };

  for (const [key, values] of Object.entries(termMap)) {
    if (lower.includes(key)) {
      related.push(...values);
    }
  }

  return [...new Set(related)].slice(0, 5); // Remove duplicates, limit to 5
}

export default app;
