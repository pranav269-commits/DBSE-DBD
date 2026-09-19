SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_status_history;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS table_sessions;
DROP TABLE IF EXISTS restaurant_tables;
DROP TABLE IF EXISTS recipes;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS menu_item_allergens;
DROP TABLE IF EXISTS allergens;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS categories;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE categories (
  id INT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0 CHECK(display_order >= 0)
) ENGINE=InnoDB;

CREATE TABLE menu_items (
  id INT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(120) NOT NULL UNIQUE,
  description VARCHAR(500) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK(price > 0),
  prep_minutes INT NOT NULL CHECK(prep_minutes BETWEEN 1 AND 120),
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.0 CHECK(rating BETWEEN 0 AND 5),
  veg BOOLEAN NOT NULL DEFAULT TRUE,
  spice ENUM('None','Mild','Medium','Hot') NOT NULL DEFAULT 'None',
  tags_json JSON NOT NULL,
  image_path VARCHAR(255) NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_menu_category FOREIGN KEY(category_id) REFERENCES categories(id)
) ENGINE=InnoDB;

CREATE TABLE allergens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(60) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE menu_item_allergens (
  menu_item_id INT NOT NULL,
  allergen_id INT NOT NULL,
  PRIMARY KEY(menu_item_id, allergen_id),
  CONSTRAINT fk_mia_menu FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_mia_allergen FOREIGN KEY(allergen_id) REFERENCES allergens(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE ingredients (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  unit VARCHAR(30) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK(quantity >= 0),
  reorder_level DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK(reorder_level >= 0),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE recipes (
  menu_item_id INT NOT NULL,
  ingredient_id INT NOT NULL,
  quantity_required DECIMAL(10,3) NOT NULL CHECK(quantity_required > 0),
  PRIMARY KEY(menu_item_id, ingredient_id),
  CONSTRAINT fk_recipe_menu FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_recipe_ingredient FOREIGN KEY(ingredient_id) REFERENCES ingredients(id)
) ENGINE=InnoDB;

CREATE TABLE restaurant_tables (
  id INT PRIMARY KEY,
  table_number INT NOT NULL UNIQUE CHECK(table_number BETWEEN 1 AND 12),
  qr_token VARCHAR(80) NOT NULL UNIQUE,
  capacity INT NOT NULL DEFAULT 4 CHECK(capacity BETWEEN 1 AND 20),
  status ENUM('AVAILABLE','ACTIVE') NOT NULL DEFAULT 'AVAILABLE',
  current_order_code VARCHAR(30) NULL
) ENGINE=InnoDB;

CREATE TABLE table_sessions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  table_id INT NOT NULL,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP NULL,
  status ENUM('ACTIVE','CLOSED') NOT NULL DEFAULT 'ACTIVE',
  CONSTRAINT fk_session_table FOREIGN KEY(table_id) REFERENCES restaurant_tables(id),
  INDEX idx_session_table_status(table_id,status)
) ENGINE=InnoDB;

CREATE TABLE orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_code VARCHAR(30) NULL UNIQUE,
  table_id INT NOT NULL,
  table_number INT NOT NULL,
  guest_name VARCHAR(50) NOT NULL DEFAULT 'Guest',
  status ENUM('CONFIRMED','PREPARING','COOKING','PLATING','READY','SERVED','CANCELLED') NOT NULL DEFAULT 'CONFIRMED',
  payment_method ENUM('CASH','UPI') NULL,
  payment_status ENUM('UNPAID','AWAITING_CASH','AWAITING_UPI','PAID') NOT NULL DEFAULT 'UNPAID',
  subtotal DECIMAL(10,2) NOT NULL CHECK(subtotal >= 0),
  gst DECIMAL(10,2) NOT NULL CHECK(gst >= 0),
  total DECIMAL(10,2) NOT NULL CHECK(total >= 0),
  estimated_wait_minutes INT NOT NULL DEFAULT 10 CHECK(estimated_wait_minutes > 0),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  paid_at TIMESTAMP NULL,
  CONSTRAINT fk_order_table FOREIGN KEY(table_id) REFERENCES restaurant_tables(id),
  INDEX idx_orders_status_created(status,created_at),
  INDEX idx_orders_table_created(table_number,created_at),
  INDEX idx_orders_payment(payment_status)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  menu_item_id INT NOT NULL,
  quantity INT NOT NULL CHECK(quantity BETWEEN 1 AND 10),
  unit_price DECIMAL(10,2) NOT NULL CHECK(unit_price > 0),
  notes VARCHAR(140) NOT NULL DEFAULT '',
  CONSTRAINT uq_order_menu UNIQUE(order_id,menu_item_id),
  CONSTRAINT fk_order_item_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_item_menu FOREIGN KEY(menu_item_id) REFERENCES menu_items(id),
  INDEX idx_order_items_menu(menu_item_id)
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_history_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_history_order_time(order_id,changed_at)
) ENGINE=InnoDB;

CREATE TABLE payments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL UNIQUE,
  method ENUM('CASH','UPI') NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK(amount > 0),
  status ENUM('PAID') NOT NULL DEFAULT 'PAID',
  paid_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_payment_order FOREIGN KEY(order_id) REFERENCES orders(id)
) ENGINE=InnoDB;
