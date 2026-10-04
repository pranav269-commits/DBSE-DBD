-- CTE: daily item sales for the current day
WITH item_sales AS (
  SELECT m.id,m.name,SUM(oi.quantity) AS qty,SUM(oi.quantity*oi.unit_price) AS sales
  FROM order_items oi
  JOIN menu_items m ON m.id=oi.menu_item_id
  JOIN orders o ON o.id=oi.order_id
  WHERE DATE(o.created_at)=CURDATE()
  GROUP BY m.id,m.name
)
SELECT * FROM item_sales ORDER BY sales DESC;

-- Window function: rank dishes by quantity sold within each category
SELECT c.name AS category,m.name,
       SUM(oi.quantity) AS quantity_sold,
       DENSE_RANK() OVER(PARTITION BY c.id ORDER BY SUM(oi.quantity) DESC) AS category_rank
FROM order_items oi
JOIN menu_items m ON m.id=oi.menu_item_id
JOIN categories c ON c.id=m.category_id
GROUP BY c.id,c.name,m.id,m.name;

-- Window function: running paid revenue by order time
SELECT order_code,created_at,total,
       SUM(total) OVER(ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS running_revenue
FROM orders
WHERE payment_status='PAID'
ORDER BY created_at;

-- Join + aggregation: table performance
SELECT table_number,COUNT(*) AS orders,ROUND(AVG(total),2) AS avg_bill,ROUND(SUM(total),2) AS billed_value
FROM orders
GROUP BY table_number
ORDER BY billed_value DESC;
