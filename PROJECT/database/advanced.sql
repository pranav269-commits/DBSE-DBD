-- @statement
DROP TRIGGER IF EXISTS trg_order_created_history;
-- @statement
CREATE TRIGGER trg_order_created_history
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
  INSERT INTO order_status_history(order_id,status) VALUES(NEW.id,NEW.status);
END;
-- @statement
DROP TRIGGER IF EXISTS trg_order_status_history;
-- @statement
CREATE TRIGGER trg_order_status_history
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN
    INSERT INTO order_status_history(order_id,status) VALUES(NEW.id,NEW.status);
  END IF;
END;
-- @statement
DROP TRIGGER IF EXISTS trg_reduce_inventory;
-- @statement
CREATE TRIGGER trg_reduce_inventory
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
  UPDATE ingredients i
  JOIN recipes r ON r.ingredient_id=i.id
  SET i.quantity=GREATEST(0,i.quantity-(r.quantity_required*NEW.quantity))
  WHERE r.menu_item_id=NEW.menu_item_id;
END;
-- @statement
DROP PROCEDURE IF EXISTS sp_update_order_status;
-- @statement
CREATE PROCEDURE sp_update_order_status(IN p_order_id BIGINT, IN p_status VARCHAR(20))
BEGIN
  IF p_status NOT IN ('CONFIRMED','PREPARING','COOKING','PLATING','READY','SERVED','CANCELLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid order status';
  END IF;
  UPDATE orders SET status=p_status WHERE id=p_order_id;
END;
-- @statement
DROP FUNCTION IF EXISTS fn_order_total;
-- @statement
CREATE FUNCTION fn_order_total(p_order_id BIGINT) RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
  DECLARE v_total DECIMAL(10,2);
  SELECT COALESCE(SUM(quantity*unit_price),0) INTO v_total FROM order_items WHERE order_id=p_order_id;
  RETURN ROUND(v_total*1.05,2);
END;
-- @statement
DROP VIEW IF EXISTS v_kitchen_queue;
-- @statement
CREATE VIEW v_kitchen_queue AS
SELECT o.id,o.order_code,o.table_number,o.status,o.estimated_wait_minutes,
       TIMESTAMPDIFF(MINUTE,o.created_at,NOW()) AS elapsed_minutes,
       COUNT(oi.id) AS line_count,SUM(oi.quantity) AS item_count,o.total
FROM orders o JOIN order_items oi ON oi.order_id=o.id
WHERE o.status NOT IN ('SERVED','CANCELLED')
GROUP BY o.id,o.order_code,o.table_number,o.status,o.estimated_wait_minutes,o.created_at,o.total;
-- @statement
DROP VIEW IF EXISTS v_order_bill;
-- @statement
CREATE VIEW v_order_bill AS
SELECT o.order_code,o.table_number,m.name AS item_name,oi.quantity,oi.unit_price,
       oi.quantity*oi.unit_price AS line_total,o.subtotal,o.gst,o.total,o.payment_method,o.payment_status
FROM orders o JOIN order_items oi ON oi.order_id=o.id JOIN menu_items m ON m.id=oi.menu_item_id;
-- @statement
DROP VIEW IF EXISTS v_daily_sales;
-- @statement
CREATE VIEW v_daily_sales AS
SELECT DATE(created_at) AS sales_date,COUNT(*) AS orders,
       SUM(CASE WHEN payment_status='PAID' THEN total ELSE 0 END) AS paid_revenue,
       AVG(total) AS average_bill
FROM orders GROUP BY DATE(created_at);
