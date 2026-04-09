-- ============================================
-- SPUD BUDS COOKBOOK - BREAKFAST RECIPES INGREDIENTS
-- 12 Breakfast Recipes - Ingredients Seed Data
-- ============================================

-- Recipe 1: Crispy Hash Brown Breakfast Potatoes (ID: 1)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(1, 'Russet potatoes', '3', 'large', 1, 1),
(1, 'Vegetable oil', '2', 'tbsp', 0, 2),
(1, 'Salt', '1/2', 'tsp', 0, 3),
(1, 'Black pepper', '1/4', 'tsp', 0, 4),
(1, 'Garlic powder', '1/4', 'tsp', 0, 5),
(1, 'Ketchup', NULL, 'for dipping', 0, 6);

-- Recipe 2: Sweet Potato Breakfast Hash (ID: 2)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(2, 'Sweet potatoes', '2', 'large', 1, 1),
(2, 'Eggs', '4', 'whole', 0, 2),
(2, 'Red bell pepper', '1', 'whole', 0, 3),
(2, 'Onion', '1/2', 'whole', 0, 4),
(2, 'Olive oil', '2', 'tbsp', 0, 5),
(2, 'Paprika', '1/2', 'tsp', 0, 6),
(2, 'Salt', '1/4', 'tsp', 0, 7),
(2, 'Fresh parsley', NULL, 'for garnish', 0, 8);

-- Recipe 3: Mini Potato Pancakes (Latkes) (ID: 3)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(3, 'Russet potatoes', '4', 'whole', 1, 1),
(3, 'Onion', '1', 'small', 0, 2),
(3, 'Eggs', '2', 'whole', 0, 3),
(3, 'Flour', '1/4', 'cup', 0, 4),
(3, 'Salt', '1', 'tsp', 0, 5),
(3, 'Baking powder', '1/2', 'tsp', 0, 6),
(3, 'Vegetable oil', NULL, 'for frying', 0, 7),
(3, 'Applesauce or sour cream', NULL, 'for serving', 0, 8);

-- Recipe 4: Loaded Breakfast Baked Potato (ID: 4)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(4, 'Russet potato', '1', 'large', 1, 1),
(4, 'Eggs', '2', 'whole', 0, 2),
(4, 'Bacon', '2', 'strips', 0, 3),
(4, 'Cheddar cheese', '2', 'tbsp', 0, 4),
(4, 'Butter', '1', 'tbsp', 0, 5),
(4, 'Salt', NULL, 'to taste', 0, 6),
(4, 'Pepper', NULL, 'to taste', 0, 7),
(4, 'Chopped chives', NULL, 'optional', 0, 8);

-- Recipe 5: Potato and Egg Breakfast Burritos (ID: 5)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(5, 'Yukon Gold potatoes', '2', 'whole', 1, 1),
(5, 'Eggs', '4', 'whole', 0, 2),
(5, 'Flour tortillas', '4', 'whole', 0, 3),
(5, 'Shredded cheese', '1/2', 'cup', 0, 4),
(5, 'Butter', '2', 'tbsp', 0, 5),
(5, 'Salt', NULL, 'to taste', 0, 6),
(5, 'Pepper', NULL, 'to taste', 0, 7),
(5, 'Salsa', NULL, 'for dipping', 0, 8);

-- Recipe 6: Sweet Potato Toast with Toppings (ID: 6)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(6, 'Sweet potatoes', '2', 'large', 1, 1),
(6, 'Olive oil', '1', 'tbsp', 0, 2),
(6, 'Salt', NULL, 'pinch', 0, 3);

-- Recipe 7: Cheesy Potato Breakfast Casserole (ID: 7)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(7, 'Frozen hash browns', '4', 'cups', 1, 1),
(7, 'Eggs', '6', 'whole', 0, 2),
(7, 'Diced ham', '1', 'cup', 0, 3),
(7, 'Shredded cheddar cheese', '1', 'cup', 0, 4),
(7, 'Milk', '1/2', 'cup', 0, 5),
(7, 'Salt', '1/2', 'tsp', 0, 6),
(7, 'Pepper', '1/4', 'tsp', 0, 7),
(7, 'Cooking spray', NULL, 'as needed', 0, 8);

-- Recipe 8: Home Fries with Peppers (ID: 8)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(8, 'Russet potatoes', '4', 'whole', 1, 1),
(8, 'Red bell pepper', '1', 'whole', 0, 2),
(8, 'Green bell pepper', '1', 'whole', 0, 3),
(8, 'Vegetable oil', '3', 'tbsp', 0, 4),
(8, 'Salt', '1/2', 'tsp', 0, 5),
(8, 'Paprika', '1/4', 'tsp', 0, 6),
(8, 'Garlic powder', '1/4', 'tsp', 0, 7);

-- Recipe 9: Potato Waffle Hash Browns (ID: 9)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(9, 'Russet potatoes', '4', 'whole', 1, 1),
(9, 'Onion', '1', 'small', 0, 2),
(9, 'Eggs', '2', 'whole', 0, 3),
(9, 'Flour', '1/4', 'cup', 0, 4),
(9, 'Salt', '1/2', 'tsp', 0, 5),
(9, 'Pepper', '1/4', 'tsp', 0, 6),
(9, 'Cooking spray', NULL, 'as needed', 0, 7),
(9, 'Sour cream', NULL, 'for serving', 0, 8);

-- Recipe 10: Farmer's Breakfast Skillet (ID: 10)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(10, 'White potatoes', '3', 'whole', 1, 1),
(10, 'Eggs', '4', 'whole', 0, 2),
(10, 'Sausage links', '4', 'whole', 0, 3),
(10, 'Onion', '1/2', 'whole', 0, 4),
(10, 'Shredded cheese', '1/2', 'cup', 0, 5),
(10, 'Butter', '2', 'tbsp', 0, 6),
(10, 'Salt', NULL, 'to taste', 0, 7),
(10, 'Pepper', NULL, 'to taste', 0, 8),
(10, 'Fresh parsley', NULL, 'for garnish', 0, 9);

-- Recipe 11: Potato and Veggie Scramble (ID: 11)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(11, 'Yukon Gold potatoes', '2', 'whole', 1, 1),
(11, 'Eggs', '4', 'whole', 0, 2),
(11, 'Cherry tomatoes', '1/2', 'cup', 0, 3),
(11, 'Spinach', '1/4', 'cup', 0, 4),
(11, 'Butter', '1', 'tbsp', 0, 5),
(11, 'Salt', NULL, 'to taste', 0, 6),
(11, 'Pepper', NULL, 'to taste', 0, 7);

-- Recipe 12: Sweet Potato Cinnamon Muffins (ID: 12)
INSERT INTO ingredients (recipe_id, name, amount, unit, is_main_ingredient, sort_order) VALUES
(12, 'Mashed sweet potato', '2', 'cups', 1, 1),
(12, 'Flour', '2', 'cups', 0, 2),
(12, 'Sugar', '3/4', 'cup', 0, 3),
(12, 'Eggs', '2', 'whole', 0, 4),
(12, 'Vegetable oil', '1/2', 'cup', 0, 5),
(12, 'Cinnamon', '1', 'tsp', 0, 6),
(12, 'Baking powder', '1', 'tsp', 0, 7),
(12, 'Baking soda', '1/2', 'tsp', 0, 8),
(12, 'Salt', '1/4', 'tsp', 0, 9),
(12, 'Chocolate chips', '1/2', 'cup', 0, 10);
