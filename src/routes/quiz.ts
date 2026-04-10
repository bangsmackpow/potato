import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Env, User } from "../types";
import { authMiddleware } from "../middleware/auth";

const app = new Hono<{ Bindings: Env; Variables: { user: User } }>();

// Discovery quiz schema - matches frontend
const quizSchema = z.object({
  potato_type_id: z.number(),
  category_id: z.number(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  age_group: z.enum(["5-8", "8-12", "10-14", "all"]),
});

// Submit quiz and get recipe suggestion
app.post("/discover", zValidator("json", quizSchema), async (c) => {
  const db = c.env.DB;
  const data = c.req.valid("json");

  // Try to get user from auth header if available
  let userId: number | null = null;
  const authHeader = c.req.header("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      // We'll just use a simple session ID for anonymous users
      // Actual user linking would require JWT verification
    } catch {
      // Anonymous user
    }
  }

  const sessionId = crypto.randomUUID();

  try {
    // Save quiz response (store category_id as question_5 for meal type)
    const mealTypeMap: Record<number, string> = {
      1: "breakfast",
      2: "lunch",
      3: "snack",
      4: "dessert",
    };

    await db
      .prepare(
        `
      INSERT INTO discovery_quizzes (
        user_id, session_id, potato_type_id,
        question_1, question_2, question_3, question_4, question_5
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        userId,
        sessionId,
        data.potato_type_id,
        data.difficulty,
        data.age_group,
        "any",
        "any",
        mealTypeMap[data.category_id] || "any",
      )
      .run();

    // Find matching recipes based on quiz criteria
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
    `;

    const params: (string | number)[] = [];

    // Filter by potato type if specified (0 means "any")
    if (data.potato_type_id > 0) {
      sql += ` AND (r.potato_type_id = ? OR r.potato_type_id IS NULL)`;
      params.push(data.potato_type_id);
    }

    // Filter by category (meal type)
    if (data.category_id > 0) {
      sql += ` AND r.category_id = ?`;
      params.push(data.category_id);
    }

    // Filter by difficulty
    if (data.difficulty) {
      sql += ` AND r.difficulty = ?`;
      params.push(data.difficulty);
    }

    // Filter by age group (or 'all' which works for any)
    if (data.age_group && data.age_group !== "all") {
      sql += ` AND (r.age_group = ? OR r.age_group = 'all')`;
      params.push(data.age_group);
    }

    sql += `
      GROUP BY r.id
      ORDER BY 
        CASE 
          WHEN r.potato_type_id = ? THEN 2
          ELSE 1
        END DESC,
        r.created_at DESC
      LIMIT 6
    `;
    params.push(data.potato_type_id > 0 ? data.potato_type_id : 0);

    const { results: recipes } = await db
      .prepare(sql)
      .bind(...params)
      .all();

    // If no recipes found with strict criteria, get fallback recipes
    if (!recipes || recipes.length === 0) {
      // Try with just category filter
      const { results: categoryRecipes } = await db
        .prepare(
          `
        SELECT 
          r.id, r.title, r.slug, r.description, r.difficulty, r.age_group,
          r.prep_time, r.cook_time, r.servings, r.image_url,
          c.name as category_name,
          pt.name as potato_type_name, pt.color as potato_type_color
        FROM recipes r
        LEFT JOIN categories c ON r.category_id = c.id
        LEFT JOIN potato_types pt ON r.potato_type_id = pt.id
        WHERE r.status = 'approved'
          ${data.category_id > 0 ? "AND r.category_id = ?" : ""}
        ORDER BY r.created_at DESC
        LIMIT 6
      `,
        )
        .bind(...(data.category_id > 0 ? [data.category_id] : []))
        .all();

      if (categoryRecipes && categoryRecipes.length > 0) {
        return c.json({
          success: true,
          data: {
            session_id: sessionId,
            recommendations: categoryRecipes,
            message: "We found some recipes in that category for you!",
          },
        });
      }

      // Ultimate fallback - any approved recipes
      const { results: fallbackRecipes } = await db
        .prepare(
          `
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
        LIMIT 6
      `,
        )
        .all();

      return c.json({
        success: true,
        data: {
          session_id: sessionId,
          recommendations: fallbackRecipes || [],
          message:
            "We couldn't find an exact match, but here are some tasty options!",
        },
      });
    }

    // Update quiz with suggested recipe (first match)
    if (recipes && recipes.length > 0) {
      await db
        .prepare(
          `
        UPDATE discovery_quizzes 
        SET suggested_recipe_id = ? 
        WHERE session_id = ?
      `,
        )
        .bind(recipes[0].id, sessionId)
        .run();
    }

    // Get the selected potato type info
    const potatoType =
      data.potato_type_id > 0
        ? await db
            .prepare(`SELECT * FROM potato_types WHERE id = ?`)
            .bind(data.potato_type_id)
            .first()
        : null;

    return c.json({
      success: true,
      data: {
        session_id: sessionId,
        potato_type: potatoType,
        preferences: {
          difficulty: data.difficulty,
          age_group: data.age_group,
          category_id: data.category_id,
        },
        recommendations: recipes,
        message: potatoType
          ? `Great choice! We found some ${potatoType.name} recipes you'll love!`
          : "Great choice! We found some delicious recipes for you!",
      },
    });
  } catch (error) {
    console.error("Error in quiz discovery:", error);
    return c.json({ success: false, error: "Failed to find recipes" }, 500);
  }
});

// Get quiz history (requires auth)
app.use("/history", authMiddleware);
app.get("/history", async (c) => {
  const db = c.env.DB;
  const user = c.get("user");

  try {
    const { results } = await db
      .prepare(
        `
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
    `,
      )
      .bind(user.id)
      .all();

    return c.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("Error fetching quiz history:", error);
    return c.json({ success: false, error: "Failed to fetch history" }, 500);
  }
});

export default app;
