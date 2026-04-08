-- ============================================
-- SPUD BUDS COOKBOOK - 50 POTATO RECIPES
-- Run this SQL to import all recipes
-- ============================================

-- BREAKFAST RECIPES (12)
INSERT INTO recipes (title, slug, description, category_id, potato_type_id, difficulty, age_group, prep_time, cook_time, servings, status, is_premium, image_url, created_by) VALUES
('Crispy Hash Brown Breakfast Potatoes', 'crispy-hash-brown-breakfast', 'Golden, crispy hash browns that make mornings special! Perfect for little hands to help grate and season.', 1, 1, 'easy', '5-8', 10, 15, 4, 'approved', 0, '/images/hash-browns.jpg', 1),

('Sweet Potato Breakfast Hash', 'sweet-potato-breakfast-hash', 'Colorful sweet potato hash with eggs - a one-skillet wonder packed with vitamins and flavor!', 1, 6, 'medium', '8-12', 15, 20, 4, 'approved', 0, '/images/sweet-hash.jpg', 1),

('Mini Potato Pancakes (Latkes)', 'mini-potato-latkes', 'Bite-sized crispy potato pancakes that kids love! Perfect for little fingers and big appetites.', 1, 1, 'medium', '5-8', 15, 20, 6, 'approved', 0, '/images/mini-latkes.jpg', 1),

('Loaded Breakfast Baked Potato', 'loaded-breakfast-baked-potato', 'A fluffy baked potato stuffed with scrambled eggs, cheese, and bacon bits - breakfast in a spud!', 1, 1, 'easy', '8-12', 5, 60, 1, 'approved', 0, '/images/breakfast-loaded.jpg', 1),

('Potato and Egg Breakfast Burritos', 'potato-egg-breakfast-burritos', 'Warm flour tortillas filled with seasoned potatoes, fluffy eggs, and melty cheese. Great for on-the-go mornings!', 1, 3, 'medium', '8-12', 15, 15, 4, 'approved', 0, '/images/breakfast-burrito.jpg', 1),

('Sweet Potato Toast with Toppings', 'sweet-potato-toast', 'Crispy sweet potato slices topped with your favorites - like toast but more fun and nutritious!', 1, 6, 'easy', '5-8', 10, 15, 2, 'approved', 0, '/images/sweet-toast.jpg', 1),

('Cheesy Potato Breakfast Casserole', 'cheesy-potato-breakfast-casserole', 'A warm, cheesy dish with potatoes, eggs, and ham that feeds the whole family. Make-ahead friendly!', 1, 2, 'medium', '8-12', 20, 45, 8, 'approved', 0, '/images/breakfast-casserole.jpg', 1),

('Home Fries with Peppers', 'home-fries-peppers', 'Colorful home fries with sweet bell peppers - a diner classic you can make at home!', 1, 1, 'easy', '5-8', 10, 20, 4, 'approved', 0, '/images/home-fries.jpg', 1),

('Potato Waffle Hash Browns', 'potato-waffle-hash-browns', 'Crispy hash browns cooked in a waffle iron - fun shapes that kids gobble up!', 1, 1, 'medium', '5-8', 10, 20, 4, 'approved', 0, '/images/waffle-hash.jpg', 1),

('Farmer''s Breakfast Skillet', 'farmers-breakfast-skillet', 'A hearty skillet with potatoes, eggs, sausage, and cheese - everything a growing chef needs!', 1, 4, 'medium', '8-12', 15, 25, 4, 'approved', 0, '/images/farmers-skillet.jpg', 1),

('Potato and Veggie Scramble', 'potato-veggie-scramble', 'Fluffy eggs scrambled with soft potatoes and colorful vegetables. A rainbow on your plate!', 1, 3, 'easy', '5-8', 10, 10, 2, 'approved', 0, '/images/veggie-scramble.jpg', 1),

('Sweet Potato Cinnamon Muffins', 'sweet-potato-cinnamon-muffins', 'Moist, sweet muffins made with mashed sweet potatoes and warm cinnamon. Like dessert for breakfast!', 1, 6, 'medium', '5-8', 15, 20, 12, 'approved', 0, '/images/sweet-muffins.jpg', 1);

-- LUNCH/DINNER RECIPES (20)
INSERT INTO recipes (title, slug, description, category_id, potato_type_id, difficulty, age_group, prep_time, cook_time, servings, status, is_premium, image_url, created_by) VALUES
('Classic Mashed Potatoes', 'classic-mashed-potatoes', 'Creamy, buttery mashed potatoes that every kid loves. The perfect side dish for any meal!', 2, 3, 'easy', '5-8', 15, 20, 6, 'approved', 0, '/images/mashed-potatoes.jpg', 1),

('Crispy Roasted Potato Wedges', 'crispy-roasted-wedges', 'Golden-brown wedges that are crispy outside and fluffy inside. Better than any store-bought fries!', 2, 1, 'easy', '5-8', 10, 35, 4, 'approved', 0, '/images/roasted-wedges.jpg', 1),

('Cheesy Potato Gratin', 'cheesy-potato-gratin', 'Thin potato slices baked in creamy, cheesy sauce. A fancy dish that''s surprisingly easy to make!', 2, 3, 'medium', '8-12', 20, 60, 8, 'approved', 0, '/images/potato-gratin.jpg', 1),

('Loaded Baked Potato Soup', 'loaded-baked-potato-soup', 'Warm, comforting soup that tastes like a loaded baked potato in a bowl. Perfect for chilly days!', 2, 1, 'medium', '8-12', 15, 30, 6, 'approved', 0, '/images/potato-soup.jpg', 1),

('Potato and Cheese Pierogi', 'potato-cheese-pierogi', 'Soft dumplings filled with creamy potatoes and cheese. A taste of Eastern Europe that kids adore!', 2, 4, 'hard', '10-14', 45, 30, 24, 'approved', 1, '/images/pierogi.jpg', 1),

('Shepherd''s Pie with Potato Topping', 'shepherds-pie', 'Seasoned ground beef and veggies topped with fluffy mashed potatoes. A complete meal in one dish!', 2, 3, 'medium', '8-12', 25, 40, 6, 'approved', 0, '/images/shepherds-pie.jpg', 1),

('Crispy Smashed Potatoes', 'crispy-smashed-potatoes', 'Boiled potatoes smashed flat and roasted until crispy. Fun to make and even more fun to eat!', 2, 2, 'easy', '5-8', 15, 30, 4, 'approved', 0, '/images/smashed-potatoes.jpg', 1),

('Potato Salad with Ranch Dressing', 'ranch-potato-salad', 'Creamy potato salad with cool ranch flavor. A picnic favorite that''s perfect for lunch boxes!', 2, 3, 'easy', '5-8', 20, 15, 8, 'approved', 0, '/images/ranch-salad.jpg', 1),

('Twice-Baked Potatoes', 'twice-baked-potatoes', 'Baked potatoes scooped out, mixed with goodies, and baked again until golden and delicious!', 2, 1, 'medium', '8-12', 15, 75, 4, 'approved', 0, '/images/twice-baked.jpg', 1),

('Potato and Broccoli Cheese Casserole', 'potato-broccoli-casserole', 'A cheesy, veggie-packed casserole that makes eating broccoli fun. Mom-approved!', 2, 3, 'medium', '5-8', 20, 40, 8, 'approved', 0, '/images/broccoli-casserole.jpg', 1),

('Sweet Potato Black Bean Tacos', 'sweet-potato-tacos', 'Colorful, healthy tacos with roasted sweet potatoes and black beans. A fiesta in your mouth!', 2, 6, 'medium', '8-12', 20, 25, 4, 'approved', 0, '/images/sweet-tacos.jpg', 1),

('Scalloped Potatoes', 'scalloped-potatoes', 'Thin potato slices in creamy sauce, baked until bubbly and golden. An elegant side dish!', 2, 3, 'medium', '8-12', 25, 60, 8, 'approved', 0, '/images/scalloped.jpg', 1),

('Potato Gnocchi with Tomato Sauce', 'potato-gnocchi', 'Soft, pillowy potato dumplings in tangy tomato sauce. Like little clouds on your plate!', 2, 4, 'hard', '10-14', 40, 20, 4, 'approved', 1, '/images/gnocchi.jpg', 1),

('Hasselback Potatoes', 'hasselback-potatoes', 'Accordion-cut potatoes roasted with butter and herbs. Look fancy but are easy to make!', 2, 5, 'medium', '8-12', 15, 50, 4, 'approved', 0, '/images/hasselback.jpg', 1),

('Potato and Corn Chowder', 'potato-corn-chowder', 'Creamy, comforting chowder loaded with potatoes, corn, and bacon. A bowl of happiness!', 2, 4, 'medium', '8-12', 15, 30, 6, 'approved', 0, '/images/corn-chowder.jpg', 1),

('Colcannon (Irish Potato Dish)', 'colcannon', 'Traditional Irish dish mixing mashed potatoes with cabbage and bacon. A taste of Ireland!', 2, 3, 'easy', '8-12', 15, 25, 6, 'approved', 0, '/images/colcannon.jpg', 1),

('Potato Kugel Casserole', 'potato-kugel', 'A baked potato pudding that''s crispy on top and creamy inside. A Jewish holiday favorite!', 2, 1, 'medium', '10-14', 20, 60, 8, 'approved', 0, '/images/kugel.jpg', 1),

('Sweet Potato Shepherd''s Pie', 'sweet-potato-shepherds-pie', 'Classic shepherd''s pie with a twist - colorful sweet potato topping instead of white!', 2, 6, 'medium', '8-12', 25, 40, 6, 'approved', 0, '/images/sweet-shepherds.jpg', 1),

('Potato Curry (Aloo Curry)', 'potato-curry', 'Indian-spiced potato curry that''s mild enough for kids but full of flavor. Serve with rice!', 2, 2, 'medium', '10-14', 15, 25, 4, 'approved', 0, '/images/aloo-curry.jpg', 1),

('Mini Potato Pizzas', 'mini-potato-pizzas', 'Round potato slices topped with pizza sauce and cheese. A fun twist on pizza night!', 2, 2, 'easy', '5-8', 15, 20, 4, 'approved', 0, '/images/potato-pizzas.jpg', 1);

-- SNACK RECIPES (12)
INSERT INTO recipes (title, slug, description, category_id, potato_type_id, difficulty, age_group, prep_time, cook_time, servings, status, is_premium, image_url, created_by) VALUES
('Baked Potato Chips', 'baked-potato-chips', 'Crispy, homemade potato chips baked in the oven. Healthier than fried but just as tasty!', 3, 2, 'easy', '5-8', 10, 20, 4, 'approved', 0, '/images/baked-chips.jpg', 1),

('Potato Cheese Balls', 'potato-cheese-balls', 'Golden, cheesy balls of mashed potato, crispy outside and melty inside. Perfect party snacks!', 3, 3, 'medium', '8-12', 20, 15, 20, 'approved', 0, '/images/cheese-balls.jpg', 1),

('Sweet Potato Fries with Honey', 'sweet-potato-fries-honey', 'Baked sweet potato fries drizzled with honey. A sweet-and-salty snack kids can''t resist!', 3, 6, 'easy', '5-8', 10, 25, 4, 'approved', 0, '/images/sweet-fries.jpg', 1),

('Potato Skins with Cheese and Bacon', 'potato-skins', 'Crispy potato skins loaded with cheese and bacon bits. Restaurant-quality at home!', 3, 1, 'medium', '8-12', 15, 20, 6, 'approved', 0, '/images/potato-skins.jpg', 1),

('Potato Croquettes', 'potato-croquettes', 'Breaded and fried potato rolls with a surprise cheese center. Crispy, creamy perfection!', 3, 4, 'medium', '10-14', 25, 15, 12, 'approved', 1, '/images/croquettes.jpg', 1),

('Roasted Potato Bites', 'roasted-potato-bites', 'Bite-sized roasted potatoes with herbs. Easy to pop in your mouth - great for little hands!', 3, 2, 'easy', '5-8', 10, 25, 4, 'approved', 0, '/images/roasted-bites.jpg', 1),

('Potato and Cheese Quesadillas', 'potato-quesadillas', 'Flour tortillas filled with seasoned potatoes and melted cheese. A twist on a Mexican favorite!', 3, 4, 'easy', '5-8', 10, 10, 4, 'approved', 0, '/images/potato-quesadillas.jpg', 1),

('Potato Tater Tots', 'homemade-tater-tots', 'Crispy, golden nuggets of shredded potato. Better than the freezer kind and fun to make!', 3, 1, 'medium', '8-12', 20, 25, 6, 'approved', 0, '/images/tater-tots.jpg', 1),

('Sweet Potato Hummus with Pita', 'sweet-potato-hummus', 'Creamy hummus made with roasted sweet potatoes. A colorful, healthy dip for snack time!', 3, 6, 'easy', '5-8', 15, 0, 8, 'approved', 0, '/images/sweet-hummus.jpg', 1),

('Potato Puffs', 'potato-puffs', 'Light, airy potato puffs that melt in your mouth. Like eating potato clouds!', 3, 3, 'medium', '8-12', 20, 20, 24, 'approved', 1, '/images/potato-puffs.jpg', 1),

('Loaded Potato Bites', 'loaded-potato-bites', 'Mini potato rounds topped with sour cream, cheese, and chives. Pop-in-your-mouth delicious!', 3, 2, 'easy', '5-8', 15, 20, 20, 'approved', 0, '/images/loaded-bites.jpg', 1),

('Potato Samosas', 'potato-samosas', 'Crispy pastry triangles filled with spiced potatoes and peas. An Indian snack adventure!', 3, 1, 'hard', '10-14', 40, 25, 12, 'approved', 1, '/images/samosas.jpg', 1);

-- DESSERT RECIPES (6)
INSERT INTO recipes (title, slug, description, category_id, potato_type_id, difficulty, age_group, prep_time, cook_time, servings, status, is_premium, image_url, created_by) VALUES
('Sweet Potato Pie', 'sweet-potato-pie', 'A Southern classic - creamy spiced sweet potato filling in a flaky crust. Better than pumpkin pie!', 4, 6, 'medium', '8-12', 30, 60, 8, 'approved', 0, '/images/sweet-potato-pie.jpg', 1),

('Potato Chocolate Cake', 'potato-chocolate-cake', 'A secret-ingredient chocolate cake that uses mashed potatoes to stay incredibly moist. No one will guess!', 4, 3, 'medium', '8-12', 25, 45, 12, 'approved', 1, '/images/potato-chocolate-cake.jpg', 1),

('Sweet Potato Brownies', 'sweet-potato-brownies', 'Fudgy brownies made with sweet potatoes instead of flour. Rich, chocolatey, and secretly healthy!', 4, 6, 'medium', '8-12', 20, 30, 16, 'approved', 0, '/images/sweet-brownies.jpg', 1),

('Potato Donuts (Spudnuts)', 'potato-donuts', 'Light, fluffy donuts made with mashed potatoes. An old-fashioned treat that''s surprisingly delicious!', 4, 4, 'hard', '10-14', 45, 20, 12, 'approved', 1, '/images/spudnuts.jpg', 1),

('Sweet Potato Ice Cream', 'sweet-potato-ice-cream', 'Creamy, dreamy ice cream with roasted sweet potato and cinnamon. A unique frozen treat!', 4, 6, 'medium', '8-12', 20, 0, 6, 'approved', 1, '/images/sweet-ice-cream.jpg', 1),

('Potato Candy (Needhams)', 'potato-candy-needhams', 'A Maine tradition - chocolate-covered coconut candy made with mashed potatoes. Sounds weird, tastes amazing!', 4, 3, 'easy', '8-12', 30, 0, 24, 'approved', 0, '/images/potato-candy.jpg', 1);
