INSERT INTO categories(id,name,slug,display_order) VALUES
(1,'Starters','starters',1),
(2,'Biryani','biryani',2),
(3,'Indian Mains','indian-mains',3),
(4,'Breads','breads',4),
(5,'Asian & Chinese','asian',5),
(6,'Pizza & Burgers','pizza-burgers',6),
(7,'Desserts','desserts',7),
(8,'Drinks','drinks',8);

INSERT INTO menu_items(id,category_id,name,description,price,prep_minutes,rating,veg,spice,tags_json,image_path,available) VALUES
(1,1,'Paneer Tikka','Char-grilled cottage cheese, peppers and onion with smoky tandoori spices.',249,12,4.8,1,'Medium','["high-protein","smoky"]','/assets/menu/paneer-tikka.svg',1),
(2,1,'Chicken 65','Crisp fried chicken tossed with curry leaves, chilli and garlic.',279,14,4.7,0,'Hot','["crispy","spicy"]','/assets/menu/chicken-65.svg',1),
(3,1,'Crispy Corn','Golden sweet corn with pepper, herbs and a light chilli crunch.',199,9,4.5,1,'Mild','["quick-serve","crispy"]','/assets/menu/crispy-corn.svg',1),
(4,1,'Veg Spring Rolls','Crunchy rolls packed with cabbage, carrot and spring onion.',189,10,4.4,1,'Mild','["quick-serve","crispy"]','/assets/menu/veg-spring-rolls.svg',1),
(5,2,'Chicken Dum Biryani','Fragrant basmati rice layered with spiced chicken and slow-cooked dum style.',329,18,4.9,0,'Medium','["bestseller","signature"]','/assets/menu/chicken-dum-biryani.svg',1),
(6,2,'Mutton Biryani','Aromatic basmati rice with tender mutton, saffron and fried onion.',399,22,4.8,0,'Medium','["premium","signature"]','/assets/menu/mutton-biryani.svg',1),
(7,2,'Paneer Biryani','Basmati rice layered with paneer, mint, saffron and biryani masala.',299,17,4.6,1,'Medium','["vegetarian","aromatic"]','/assets/menu/paneer-biryani.svg',1),
(8,2,'Veg Biryani','Garden vegetables and basmati rice cooked with mint and whole spices.',259,15,4.5,1,'Mild','["vegetarian","aromatic"]','/assets/menu/veg-biryani.svg',1),
(9,3,'Butter Chicken','Tandoori chicken simmered in a silky tomato, butter and cream gravy.',349,16,4.9,0,'Mild','["rich","bestseller"]','/assets/menu/butter-chicken.svg',1),
(10,3,'Paneer Butter Masala','Paneer cubes in a creamy tomato-cashew gravy finished with butter.',319,15,4.8,1,'Mild','["vegetarian","rich"]','/assets/menu/paneer-butter-masala.svg',1),
(11,3,'Dal Makhani','Black lentils slow-cooked with tomato, butter and gentle spices.',269,13,4.7,1,'Mild','["comfort-food","vegetarian"]','/assets/menu/dal-makhani.svg',1),
(12,3,'Kadai Chicken','Chicken cooked with roasted spices, bell pepper, onion and tomato.',339,16,4.6,0,'Hot','["spicy","north-indian"]','/assets/menu/kadai-chicken.svg',1),
(13,4,'Butter Naan','Soft tandoor-baked naan brushed with melted butter.',69,6,4.7,1,'None','["quick-serve","bread"]','/assets/menu/butter-naan.svg',1),
(14,4,'Garlic Naan','Tandoor naan topped with garlic, coriander and butter.',79,7,4.8,1,'None','["quick-serve","bread"]','/assets/menu/garlic-naan.svg',1),
(15,4,'Tandoori Roti','Whole-wheat flatbread baked in the tandoor.',49,5,4.4,1,'None','["quick-serve","bread"]','/assets/menu/tandoori-roti.svg',1),
(16,4,'Cheese Kulcha','Stuffed kulcha with a molten cheese centre and herbs.',109,8,4.6,1,'None','["quick-serve","cheesy"]','/assets/menu/cheese-kulcha.svg',1),
(17,5,'Hakka Noodles','Wok-tossed noodles with vegetables, soy, garlic and spring onion.',249,12,4.6,1,'Medium','["wok-tossed","indo-chinese"]','/assets/menu/hakka-noodles.svg',1),
(18,5,'Schezwan Fried Rice','Fried rice tossed with vegetables and bold schezwan chilli sauce.',239,11,4.5,1,'Hot','["spicy","indo-chinese"]','/assets/menu/schezwan-fried-rice.svg',1),
(19,5,'Chilli Paneer','Paneer and peppers tossed in a glossy chilli-garlic sauce.',289,13,4.7,1,'Hot','["spicy","vegetarian"]','/assets/menu/chilli-paneer.svg',1),
(20,5,'Chicken Manchurian','Crisp chicken bites in a savoury ginger-garlic manchurian sauce.',299,14,4.6,0,'Medium','["indo-chinese","saucy"]','/assets/menu/chicken-manchurian.svg',1),
(21,6,'Margherita Pizza','Classic tomato, mozzarella and basil on a hand-stretched crust.',299,15,4.7,1,'None','["classic","cheesy"]','/assets/menu/margherita-pizza.svg',1),
(22,6,'Farmhouse Pizza','Mozzarella, onion, capsicum, mushroom and sweet corn.',379,17,4.6,1,'Mild','["loaded","vegetarian"]','/assets/menu/farmhouse-pizza.svg',1),
(23,6,'Crispy Chicken Burger','Crunchy chicken fillet, lettuce and creamy house sauce in a toasted bun.',299,13,4.8,0,'Mild','["crispy","burger"]','/assets/menu/crispy-chicken-burger.svg',1),
(24,6,'Veg Cheese Burger','Vegetable patty, cheese, lettuce and tangy sauce in a toasted bun.',249,11,4.5,1,'Mild','["vegetarian","burger"]','/assets/menu/veg-cheese-burger.svg',1),
(25,7,'Chocolate Brownie','Warm fudgy brownie with chocolate sauce.',179,7,4.8,1,'None','["dessert","chocolate"]','/assets/menu/chocolate-brownie.svg',1),
(26,7,'Gulab Jamun','Soft milk dumplings soaked in cardamom-rose syrup.',129,4,4.7,1,'None','["dessert","indian-sweet"]','/assets/menu/gulab-jamun.svg',1),
(27,7,'Rasmalai','Chilled cottage-cheese discs in saffron-cardamom milk.',159,4,4.6,1,'None','["dessert","chilled"]','/assets/menu/rasmalai.svg',1),
(28,7,'Ice Cream Sundae','Vanilla ice cream with chocolate sauce, nuts and a wafer crunch.',199,5,4.6,1,'None','["dessert","cold"]','/assets/menu/ice-cream-sundae.svg',1),
(29,8,'Cold Coffee','Chilled coffee blended with milk and a creamy froth.',149,5,4.7,1,'None','["quick-serve","cold"]','/assets/menu/cold-coffee.svg',1),
(30,8,'Virgin Mojito','Mint, lime and soda over ice with a bright citrus finish.',139,4,4.8,1,'None','["quick-serve","refreshing"]','/assets/menu/virgin-mojito.svg',1),
(31,8,'Fresh Lime Soda','Fresh lime with soda, served sweet, salted or mixed.',99,3,4.5,1,'None','["quick-serve","refreshing"]','/assets/menu/fresh-lime-soda.svg',1),
(32,8,'Masala Chai','Indian tea brewed with milk, ginger and aromatic spices.',79,5,4.6,1,'None','["quick-serve","hot"]','/assets/menu/masala-chai.svg',1);

INSERT INTO allergens(name) VALUES ('dairy'),('egg'),('gluten'),('nuts'),('soy');

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 1,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 4,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 7,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 9,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 10,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 10,id FROM allergens WHERE name='nuts';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 11,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 13,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 13,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 14,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 14,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 15,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 16,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 16,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 17,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 17,id FROM allergens WHERE name='soy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 18,id FROM allergens WHERE name='soy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 19,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 19,id FROM allergens WHERE name='soy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 20,id FROM allergens WHERE name='soy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 20,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 21,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 21,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 22,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 22,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 23,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 23,id FROM allergens WHERE name='egg';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 24,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 24,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 25,id FROM allergens WHERE name='gluten';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 25,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 25,id FROM allergens WHERE name='egg';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 26,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 27,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 27,id FROM allergens WHERE name='nuts';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 28,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 28,id FROM allergens WHERE name='nuts';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 29,id FROM allergens WHERE name='dairy';

INSERT INTO menu_item_allergens(menu_item_id,allergen_id) SELECT 32,id FROM allergens WHERE name='dairy';

INSERT INTO ingredients(id,name,unit,quantity,reorder_level) VALUES
(1,'Basmati Rice','kg',24,6),
(2,'Chicken','kg',18,5),
(3,'Paneer','kg',12,3),
(4,'Mutton','kg',10,3),
(5,'Flour','kg',20,5),
(6,'Cheese','kg',10,2.5),
(7,'Vegetables','kg',25,6),
(8,'Milk','litre',18,5),
(9,'Coffee','kg',4,1),
(10,'Lime','piece',60,15);

INSERT INTO recipes(menu_item_id,ingredient_id,quantity_required) VALUES
(5,1,0.3),
(5,2,0.24),
(6,1,0.3),
(6,4,0.22),
(7,1,0.3),
(7,3,0.18),
(8,1,0.3),
(8,7,0.18),
(9,2,0.25),
(9,8,0.08),
(10,3,0.22),
(10,8,0.07),
(12,2,0.24),
(12,7,0.08),
(13,5,0.09),
(14,5,0.1),
(15,5,0.08),
(16,5,0.1),
(16,6,0.05),
(17,5,0.16),
(17,7,0.12),
(18,1,0.24),
(18,7,0.12),
(19,3,0.18),
(19,7,0.08),
(20,2,0.2),
(20,7,0.08),
(21,5,0.18),
(21,6,0.12),
(22,5,0.18),
(22,6,0.12),
(22,7,0.12),
(23,2,0.18),
(23,5,0.12),
(24,7,0.18),
(24,5,0.12),
(24,6,0.04),
(27,3,0.08),
(27,8,0.12),
(28,8,0.14),
(29,8,0.22),
(29,9,0.02),
(30,10,1),
(31,10,1),
(32,8,0.16);

INSERT INTO restaurant_tables(id,table_number,qr_token,capacity,status,current_order_code) VALUES
(1,1,'DINE-T01-A7K2',4,'AVAILABLE',NULL),
(2,2,'DINE-T02-B4M8',4,'AVAILABLE',NULL),
(3,3,'DINE-T03-C9P3',4,'AVAILABLE',NULL),
(4,4,'DINE-T04-D2R7',6,'AVAILABLE',NULL),
(5,5,'DINE-T05-E8V1',4,'AVAILABLE',NULL),
(6,6,'DINE-T06-F5N6',4,'AVAILABLE',NULL),
(7,7,'DINE-T07-G3Q9',4,'AVAILABLE',NULL),
(8,8,'DINE-T08-H7L4',6,'AVAILABLE',NULL),
(9,9,'DINE-T09-J1X8',4,'AVAILABLE',NULL),
(10,10,'DINE-T10-K6W2',4,'AVAILABLE',NULL),
(11,11,'DINE-T11-M4Y7',4,'AVAILABLE',NULL),
(12,12,'DINE-T12-N9Z5',6,'AVAILABLE',NULL);
