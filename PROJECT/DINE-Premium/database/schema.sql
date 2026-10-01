CREATE DATABASE IF NOT EXISTS dine_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dine_db;

CREATE TABLE IF NOT EXISTS restaurant_tables (
 id INT AUTO_INCREMENT PRIMARY KEY, table_number INT NOT NULL UNIQUE, qr_token VARCHAR(64) NOT NULL UNIQUE,
 status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE', is_active BOOLEAN NOT NULL DEFAULT TRUE,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_tables_token(qr_token)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS categories (
 id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(80) NOT NULL UNIQUE, sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS menu_items (
 id INT AUTO_INCREMENT PRIMARY KEY, category_id INT NOT NULL, name VARCHAR(120) NOT NULL, description TEXT NOT NULL,
 price DECIMAL(10,2) NOT NULL, image_url VARCHAR(500) NOT NULL DEFAULT '', veg BOOLEAN NOT NULL DEFAULT TRUE,
 available BOOLEAN NOT NULL DEFAULT TRUE, featured BOOLEAN NOT NULL DEFAULT FALSE, prep_minutes INT NOT NULL DEFAULT 15,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_menu_category FOREIGN KEY(category_id) REFERENCES categories(id) ON DELETE RESTRICT,
 CONSTRAINT uq_menu_name_cat UNIQUE(category_id,name), INDEX idx_menu_category(category_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS orders (
 id INT AUTO_INCREMENT PRIMARY KEY, order_number VARCHAR(32) UNIQUE, table_id INT NOT NULL,
 status VARCHAR(32) NOT NULL DEFAULT 'PLACED', special_instructions TEXT NOT NULL,
 subtotal DECIMAL(10,2) NOT NULL, tax_amount DECIMAL(10,2) NOT NULL, total DECIMAL(10,2) NOT NULL,
 estimated_minutes INT NOT NULL DEFAULT 15, bill_requested BOOLEAN NOT NULL DEFAULT FALSE,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 completed_at DATETIME NULL, CONSTRAINT fk_orders_table FOREIGN KEY(table_id) REFERENCES restaurant_tables(id) ON DELETE RESTRICT,
 INDEX idx_orders_status(status), INDEX idx_orders_created(created_at), INDEX idx_orders_table(table_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_items (
 id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, menu_item_id INT NOT NULL, item_name_snapshot VARCHAR(120) NOT NULL,
 unit_price DECIMAL(10,2) NOT NULL, quantity INT NOT NULL, line_total DECIMAL(10,2) NOT NULL,
 CONSTRAINT fk_oi_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
 CONSTRAINT fk_oi_menu FOREIGN KEY(menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT, INDEX idx_oi_order(order_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS order_status_history (
 id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL, old_status VARCHAR(32) NULL, new_status VARCHAR(32) NOT NULL,
 changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_history_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE, INDEX idx_history_order(order_id)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS payments (
 id INT AUTO_INCREMENT PRIMARY KEY, order_id INT NOT NULL UNIQUE, amount DECIMAL(10,2) NOT NULL,
 payment_method VARCHAR(20) NOT NULL, payment_status VARCHAR(20) NOT NULL DEFAULT 'PAID', paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_payment_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE RESTRICT, INDEX idx_payments_paid_at(paid_at)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS waiter_requests (
 id INT AUTO_INCREMENT PRIMARY KEY, table_id INT NOT NULL, order_id INT NULL, status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, acknowledged_at DATETIME NULL,
 CONSTRAINT fk_waiter_table FOREIGN KEY(table_id) REFERENCES restaurant_tables(id) ON DELETE CASCADE,
 CONSTRAINT fk_waiter_order FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL, INDEX idx_waiter_status(status)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS activity_logs (
 id INT AUTO_INCREMENT PRIMARY KEY, event_type VARCHAR(50) NOT NULL, message VARCHAR(500) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_activity_created(created_at)
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW active_orders_view AS
SELECT o.id,o.order_number,t.table_number,o.status,o.total,o.estimated_minutes,o.created_at
FROM orders o JOIN restaurant_tables t ON t.id=o.table_id WHERE o.status<>'COMPLETED';
CREATE OR REPLACE VIEW daily_sales_view AS
SELECT DATE(p.paid_at) sale_date, COUNT(*) paid_orders, SUM(p.amount) revenue, AVG(p.amount) average_order_value
FROM payments p WHERE p.payment_status='PAID' GROUP BY DATE(p.paid_at);

DROP PROCEDURE IF EXISTS sp_daily_sales;
DELIMITER $$
CREATE PROCEDURE sp_daily_sales(IN p_date DATE)
BEGIN
 SELECT DATE(paid_at) sale_date, COUNT(*) paid_orders, COALESCE(SUM(amount),0) revenue, COALESCE(AVG(amount),0) average_order_value
 FROM payments WHERE payment_status='PAID' AND DATE(paid_at)=p_date GROUP BY DATE(paid_at);
END$$
DELIMITER ;

DROP TRIGGER IF EXISTS trg_payment_activity;
DELIMITER $$
CREATE TRIGGER trg_payment_activity AFTER INSERT ON payments FOR EACH ROW
BEGIN
 INSERT INTO activity_logs(event_type,message) VALUES('PAYMENT_DB', CONCAT('Payment recorded for order id ',NEW.order_id,' via ',NEW.payment_method));
END$$
DELIMITER ;
