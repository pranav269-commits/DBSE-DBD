USE dine_db;
INSERT INTO restaurant_tables(table_number,qr_token,status,is_active) VALUES
(1,'TBL-A9F31K','AVAILABLE',1),(2,'TBL-K2M84Q','AVAILABLE',1),(3,'TBL-P7X52R','AVAILABLE',1),(4,'TBL-C4V19N','AVAILABLE',1),
(5,'TBL-H8D63W','AVAILABLE',1),(6,'TBL-R5J27B','AVAILABLE',1),(7,'TBL-G3L91T','AVAILABLE',1),(8,'TBL-N6Q48Y','AVAILABLE',1),
(9,'TBL-S2E75M','AVAILABLE',1),(10,'TBL-V9K34P','AVAILABLE',1),(11,'TBL-B7R62C','AVAILABLE',1),(12,'TBL-M4T88H','AVAILABLE',1)
ON DUPLICATE KEY UPDATE qr_token=VALUES(qr_token),is_active=VALUES(is_active);
INSERT INTO categories(name,sort_order) VALUES ('Starters',1),('Main Course',2),('Breads & Rice',3),('Beverages',4),('Desserts',5)
ON DUPLICATE KEY UPDATE sort_order=VALUES(sort_order);

INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Crispy Corn','Golden corn tossed with peppers, chilli and herbs.',229,'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=900&q=80',1,1,1,12 FROM categories c WHERE c.name='Starters'
ON DUPLICATE KEY UPDATE price=VALUES(price),description=VALUES(description),available=1;
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Paneer Tikka','Charred cottage cheese, capsicum and house spices.',289,'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=80',1,1,1,18 FROM categories c WHERE c.name='Starters' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Chicken 65','South-Indian style spicy fried chicken with curry leaves.',319,'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=900&q=80',0,1,1,20 FROM categories c WHERE c.name='Starters' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Butter Chicken','Tandoori chicken in a silky tomato-butter gravy.',369,'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=900&q=80',0,1,1,24 FROM categories c WHERE c.name='Main Course' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Paneer Butter Masala','Paneer cubes in creamy tomato-cashew gravy.',329,'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80',1,1,1,22 FROM categories c WHERE c.name='Main Course' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Veg Kadai','Seasonal vegetables with roasted kadai masala.',299,'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=900&q=80',1,1,0,20 FROM categories c WHERE c.name='Main Course' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Garlic Naan','Tandoor-baked naan brushed with garlic butter.',79,'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=900&q=80',1,1,1,8 FROM categories c WHERE c.name='Breads & Rice' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Butter Naan','Soft tandoor naan finished with cultured butter.',69,'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=900&q=80',1,1,0,8 FROM categories c WHERE c.name='Breads & Rice' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Jeera Rice','Steamed basmati rice tempered with cumin.',179,'https://images.unsplash.com/photo-1596560548464-f010549b84d7?auto=format&fit=crop&w=900&q=80',1,1,0,15 FROM categories c WHERE c.name='Breads & Rice' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Veg Biryani','Fragrant basmati rice layered with vegetables and saffron.',279,'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=900&q=80',1,1,1,25 FROM categories c WHERE c.name='Breads & Rice' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Virgin Mojito','Mint, lime, soda and crushed ice.',129,'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=900&q=80',1,1,1,5 FROM categories c WHERE c.name='Beverages' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Cold Coffee','Chilled coffee blended smooth and creamy.',149,'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',1,1,0,6 FROM categories c WHERE c.name='Beverages' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Fresh Lime Soda','Fresh lime, soda, salt or sweet.',99,'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80',1,1,0,4 FROM categories c WHERE c.name='Beverages' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Chocolate Lava Cake','Warm chocolate cake with a molten center.',189,'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80',1,1,1,12 FROM categories c WHERE c.name='Desserts' ON DUPLICATE KEY UPDATE price=VALUES(price);
INSERT INTO menu_items(category_id,name,description,price,image_url,veg,available,featured,prep_minutes)
SELECT c.id,'Royal Kulfi','Traditional dense Indian ice cream with pistachio.',159,'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80',1,1,0,4 FROM categories c WHERE c.name='Desserts' ON DUPLICATE KEY UPDATE price=VALUES(price);
