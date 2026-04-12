import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

const UNSPLASH_API_URL = "https://api.unsplash.com";

function getUnsplashKey(env: Env): string {
  return env.UNSPLASH_ACCESS_KEY || "";
}

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
    download: string;
  };
}

app.get("/recipe/:query", async (c) => {
  const env = c.env;
  const apiKey = getUnsplashKey(env);

  if (!apiKey) {
    return c.json(
      { success: false, error: "Unsplash API key not configured" },
      503,
    );
  }

  const query = c.req.param("query");
  const decodedQuery = decodeURIComponent(query);

  const searchTerms = generateSearchTerms(decodedQuery);

  for (const term of searchTerms) {
    try {
      const response = await fetch(
        `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(term)}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${apiKey}`,
          },
        },
      );

      if (!response.ok) continue;

      const data = (await response.json()) as { results: UnsplashPhoto[] };

      if (data.results && data.results.length > 0) {
        const photo = data.results[0];

        await fetch(photo.links.download);

        return c.json({
          success: true,
          data: {
            url: photo.urls.regular,
            thumb: photo.urls.small,
            photographer: {
              name: photo.user.name,
              username: photo.user.username,
              profile_url: photo.user.links.html,
            },
            unsplash_url: photo.links.html,
          },
        });
      }
    } catch (error) {
      console.error(`Unsplash search error for "${term}":`, error);
      continue;
    }
  }

  return c.json(
    {
      success: false,
      error: "No images found",
    },
    404,
  );
});

app.get("/random", async (c) => {
  const env = c.env;
  const apiKey = getUnsplashKey(env);

  if (!apiKey) {
    return c.json(
      { success: false, error: "Unsplash API key not configured" },
      503,
    );
  }

  const query = c.req.query("q") || "potato food";

  try {
    const response = await fetch(
      `${UNSPLASH_API_URL}/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`,
      {
        headers: {
          Authorization: `Client-ID ${apiKey}`,
        },
      },
    );

    if (!response.ok) {
      return c.json(
        {
          success: false,
          error: "Failed to fetch image",
        },
        500,
      );
    }

    const photo = (await response.json()) as UnsplashPhoto;
    await fetch(photo.links.download);

    return c.json({
      success: true,
      data: {
        url: photo.urls.regular,
        thumb: photo.urls.small,
        photographer: {
          name: photo.user.name,
          username: photo.user.username,
          profile_url: photo.user.links.html,
        },
        unsplash_url: photo.links.html,
      },
    });
  } catch (error) {
    console.error("Unsplash random error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to fetch image",
      },
      500,
    );
  }
});

function generateSearchTerms(recipeName: string): string[] {
  const name = recipeName.toLowerCase();
  const terms: string[] = [recipeName];

  if (name.includes("mashed")) {
    terms.unshift("mashed potatoes", "potato mash", "creamy potatoes");
  } else if (name.includes("hash brown")) {
    terms.unshift("hash browns", "shredded potatoes breakfast");
  } else if (name.includes("fries") || name.includes("wedge")) {
    terms.unshift("potato wedges", " roasted potato", "french fries");
  } else if (name.includes("latke") || name.includes("pancake")) {
    terms.unshift("potato pancake", "latkes");
  } else if (name.includes("breakfast")) {
    terms.unshift("breakfast potatoes", "home fries");
  } else if (name.includes("sweet potato")) {
    terms.unshift("sweet potato", "yam");
  } else if (name.includes("baked")) {
    terms.unshift("baked potato", "loaded potato");
  } else if (name.includes("soup")) {
    terms.unshift("potato soup", "potato stew");
  } else if (name.includes("salad")) {
    terms.unshift("potato salad");
  } else if (name.includes("pierogi") || name.includes("gnocchi")) {
    terms.unshift("pierogi", "potato dumplings");
  } else if (name.includes("taco")) {
    terms.unshift("sweet potato taco", "vegetable taco");
  } else if (name.includes("casserole")) {
    terms.unshift("potato casserole", "cheesy potatoes");
  } else if (name.includes("shepherd")) {
    terms.unshift("shepherds pie", "meat pie");
  } else if (name.includes("gratin") || name.includes("scallop")) {
    terms.unshift("scalloped potatoes", "potato gratin");
  } else if (name.includes("chip")) {
    terms.unshift("potato chips", "homemade chips");
  } else if (name.includes("skin")) {
    terms.unshift("potato skins", "loaded potato skins");
  } else if (name.includes("tot")) {
    terms.unshift("tater tots", "golden potatoes");
  } else if (name.includes("pie") || name.includes("dessert")) {
    terms.unshift("sweet potato pie", "potato dessert");
  } else if (name.includes("muffin")) {
    terms.unshift("sweet potato muffin", "potato muffin");
  } else if (name.includes("toast")) {
    terms.unshift("sweet potato toast", "potato toast");
  } else if (name.includes("burrito")) {
    terms.unshift("breakfast burrito", "potato burrito");
  } else if (name.includes("skillet")) {
    terms.unshift("breakfast skillet", "potato eggs");
  } else if (name.includes("croquette")) {
    terms.unshift("potato croquette", "fried potato");
  } else if (name.includes("hummus")) {
    terms.unshift("sweet potato hummus", "dip");
  } else if (name.includes("samosa")) {
    terms.unshift("samosa", "potato samosa");
  } else if (name.includes("chowder")) {
    terms.unshift("potato chowder", "corn chowder");
  } else if (name.includes("colcannon")) {
    terms.unshift("colcannon", "irish potatoes");
  } else if (name.includes("kugel")) {
    terms.unshift("kugel", "noodle kugel");
  } else if (name.includes("curry")) {
    terms.unshift("aloo curry", "potato curry");
  } else if (name.includes("pizza")) {
    terms.unshift("potato pizza", "mini pizza");
  }

  terms.push("potato recipe", "food photography");

  return terms;
}

export default app;
