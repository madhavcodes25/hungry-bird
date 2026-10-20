-- Hungry Bird: demo data
--
-- WARNING: this script WIPES every table first (TRUNCATE), then loads the demo data.
-- Use it only on a development or demo database.
--
-- Run it after schema.sql:
--   psql -U postgres -d hungrybird -f db/seed.sql
--
-- Demo accounts (development only, never reuse these passwords anywhere real):
--   admin@hungrybird.com   admin123       admin
--   asha@test.com          password123    customer
--   rohan@test.com         password123    customer
--   ravi@test.com          password123    restaurant (Ravi Dosa Corner)
--   meena@test.com         password123    restaurant (Meena's Kitchen)
--   kiran@test.com         password123    delivery partner
--   sunil@test.com         password123    delivery partner

-- crypt() and gen_salt() come from pgcrypto. They produce bcrypt hashes
-- that the Node bcryptjs library can verify, so these accounts can log in normally.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

TRUNCATE "user", restaurant_profile, menu_item, coupon, "order", order_item,
         payment, delivery, request, rating
RESTART IDENTITY CASCADE;

-- ---------------------------------------------------------------- users
INSERT INTO "user" (name, email, password_hash, role, phone) VALUES
  ('Hungry Bird Admin', 'admin@hungrybird.com', crypt('admin123',    gen_salt('bf', 10)), 'admin',            NULL),
  ('Asha Mehta',        'asha@test.com',        crypt('password123', gen_salt('bf', 10)), 'customer',         '9000000001'),
  ('Rohan Shah',        'rohan@test.com',       crypt('password123', gen_salt('bf', 10)), 'customer',         '9000000002'),
  ('Ravi Kumar',        'ravi@test.com',        crypt('password123', gen_salt('bf', 10)), 'restaurant',       '9000000003'),
  ('Meena Patel',       'meena@test.com',       crypt('password123', gen_salt('bf', 10)), 'restaurant',       '9000000004'),
  ('Kiran Desai',       'kiran@test.com',       crypt('password123', gen_salt('bf', 10)), 'delivery_partner', '9000000005'),
  ('Sunil Joshi',       'sunil@test.com',       crypt('password123', gen_salt('bf', 10)), 'delivery_partner', '9000000006');

-- ---------------------------------------------------------------- restaurants
INSERT INTO restaurant_profile (user_id, restaurant_name, address, cuisine_type) VALUES
  ((SELECT id FROM "user" WHERE email = 'ravi@test.com'),  'Ravi Dosa Corner', 'Ring Road, Surat', 'South Indian'),
  ((SELECT id FROM "user" WHERE email = 'meena@test.com'), 'Meena''s Kitchen', 'Piplod, Surat',    'North Indian');

-- ---------------------------------------------------------------- menu
INSERT INTO menu_item (restaurant_id, name, price, is_available)
SELECT r.id, v.name, v.price, v.available
FROM restaurant_profile r
JOIN (VALUES
  ('Ravi Dosa Corner', 'Masala Dosa',         80.00, TRUE),
  ('Ravi Dosa Corner', 'Mysore Masala Dosa',  95.00, TRUE),
  ('Ravi Dosa Corner', 'Idli Sambar',         50.00, TRUE),
  ('Ravi Dosa Corner', 'Filter Coffee',       30.00, TRUE),
  ('Ravi Dosa Corner', 'Rava Dosa',           90.00, FALSE),   -- sold out, so it stays off the public menu
  ('Meena''s Kitchen', 'Paneer Butter Masala', 180.00, TRUE),
  ('Meena''s Kitchen', 'Dal Tadka',            140.00, TRUE),
  ('Meena''s Kitchen', 'Jeera Rice',            90.00, TRUE),
  ('Meena''s Kitchen', 'Butter Naan',           35.00, TRUE),
  ('Meena''s Kitchen', 'Gulab Jamun',           60.00, TRUE)
) AS v(restaurant, name, price, available) ON v.restaurant = r.restaurant_name;

-- ---------------------------------------------------------------- coupons
-- times_used matches the orders below: WELCOME10 on orders 2 and 5, FLAT50 on order 3.
INSERT INTO coupon (code, discount_type, discount_value, min_order_value, usage_limit, times_used, valid_until) VALUES
  ('WELCOME10', 'percent', 10, 100, 100, 2, NOW() + INTERVAL '365 days'),
  ('FLAT50',    'flat',    50, 250,  50, 1, NOW() + INTERVAL '365 days'),
  ('EXPIRED20', 'percent', 20,   0,  10, 0, NOW() - INTERVAL '1 day');   -- for testing the "expired" error

-- ---------------------------------------------------------------- orders
-- Inserted in one statement, so (after RESTART IDENTITY) their ids are 1 to 8 in this order.
INSERT INTO "order" (customer_id, restaurant_id, coupon_id, status, total_amount, discount_amount, created_at, delivery_address) VALUES
  -- 1: delivered, no coupon
  ((SELECT id FROM "user" WHERE email = 'asha@test.com'),  (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Ravi Dosa Corner'),
   NULL, 'delivered', 190.00, 0.00, NOW() - INTERVAL '6 days', 'B-12, Sunrise Apartments, Adajan, Surat 395009'),
  -- 2: delivered, WELCOME10
  ((SELECT id FROM "user" WHERE email = 'rohan@test.com'), (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Meena''s Kitchen'),
   (SELECT id FROM coupon WHERE code = 'WELCOME10'), 'delivered', 225.00, 25.00, NOW() - INTERVAL '5 days', 'Flat 304, Shree Residency, Vesu, Surat 395007'),
  -- 3: delivered, FLAT50
  ((SELECT id FROM "user" WHERE email = 'asha@test.com'),  (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Meena''s Kitchen'),
   (SELECT id FROM coupon WHERE code = 'FLAT50'), 'delivered', 250.00, 50.00, NOW() - INTERVAL '3 days', 'B-12, Sunrise Apartments, Adajan, Surat 395009'),
  -- 4: cancelled
  ((SELECT id FROM "user" WHERE email = 'rohan@test.com'), (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Ravi Dosa Corner'),
   NULL, 'cancelled', 130.00, 0.00, NOW() - INTERVAL '2 days', 'Flat 304, Shree Residency, Vesu, Surat 395007'),
  -- 5: preparing, WELCOME10 (shows up in "available deliveries")
  ((SELECT id FROM "user" WHERE email = 'asha@test.com'),  (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Ravi Dosa Corner'),
   (SELECT id FROM coupon WHERE code = 'WELCOME10'), 'preparing', 216.00, 24.00, NOW() - INTERVAL '40 minutes', 'B-12, Sunrise Apartments, Adajan, Surat 395009'),
  -- 6: just placed
  ((SELECT id FROM "user" WHERE email = 'rohan@test.com'), (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Meena''s Kitchen'),
   NULL, 'placed', 300.00, 0.00, NOW() - INTERVAL '10 minutes', 'Flat 304, Shree Residency, Vesu, Surat 395007'),
  -- 7: on its way
  ((SELECT id FROM "user" WHERE email = 'asha@test.com'),  (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Ravi Dosa Corner'),
   NULL, 'out_for_delivery', 240.00, 0.00, NOW() - INTERVAL '25 minutes', 'B-12, Sunrise Apartments, Adajan, Surat 395009'),
  -- 8: delivered, has an open support request
  ((SELECT id FROM "user" WHERE email = 'rohan@test.com'), (SELECT id FROM restaurant_profile WHERE restaurant_name = 'Ravi Dosa Corner'),
   NULL, 'delivered', 235.00, 0.00, NOW() - INTERVAL '4 days', 'Flat 304, Shree Residency, Vesu, Surat 395007');

-- ---------------------------------------------------------------- order items
-- price_at_order_time is copied from the menu, the same way the API does it.
INSERT INTO order_item (order_id, menu_item_id, quantity, price_at_order_time)
SELECT v.order_id, m.id, v.qty, m.price
FROM (VALUES
  (1, 'Masala Dosa', 2),         (1, 'Filter Coffee', 1),
  (2, 'Paneer Butter Masala', 1), (2, 'Butter Naan', 2),
  (3, 'Dal Tadka', 1),           (3, 'Jeera Rice', 1),           (3, 'Butter Naan', 2),
  (4, 'Idli Sambar', 2),         (4, 'Filter Coffee', 1),
  (5, 'Mysore Masala Dosa', 2),  (5, 'Idli Sambar', 1),
  (6, 'Paneer Butter Masala', 1), (6, 'Gulab Jamun', 2),
  (7, 'Masala Dosa', 3),
  (8, 'Masala Dosa', 1),         (8, 'Mysore Masala Dosa', 1),   (8, 'Filter Coffee', 2)
) AS v(order_id, item, qty)
JOIN menu_item m ON m.name = v.item;

-- ---------------------------------------------------------------- payments
INSERT INTO payment (order_id, method, amount, status) VALUES
  (1, 'upi',  190.00, 'completed'),
  (2, 'cod',  225.00, 'completed'),   -- cash was collected at delivery
  (3, 'card', 250.00, 'completed'),
  (4, 'cod',  130.00, 'pending'),
  (5, 'card', 216.00, 'completed'),
  (6, 'cod',  300.00, 'pending'),
  (7, 'upi',  240.00, 'completed'),
  (8, 'cod',  235.00, 'completed');

-- ---------------------------------------------------------------- deliveries (payout is a flat 40 per order)
INSERT INTO delivery (order_id, delivery_partner_id, status, payout_amount) VALUES
  (1, (SELECT id FROM "user" WHERE email = 'kiran@test.com'), 'delivered',  40.00),
  (2, (SELECT id FROM "user" WHERE email = 'sunil@test.com'), 'delivered',  40.00),
  (3, (SELECT id FROM "user" WHERE email = 'kiran@test.com'), 'delivered',  40.00),
  (4, NULL,                                                   'unassigned', 40.00),
  (5, NULL,                                                   'unassigned', 40.00),
  (6, NULL,                                                   'unassigned', 40.00),
  (7, (SELECT id FROM "user" WHERE email = 'kiran@test.com'), 'picked_up',  40.00),
  (8, (SELECT id FROM "user" WHERE email = 'sunil@test.com'), 'delivered',  40.00);

-- ---------------------------------------------------------------- ratings (delivered orders only)
INSERT INTO rating (order_id, customer_id, restaurant_id, stars, comment)
SELECT o.id, o.customer_id, o.restaurant_id, v.stars, v.comment
FROM (VALUES
  (1, 5, 'The dosa was crisp and hot.'),
  (2, 4, 'Great paneer, but the naan arrived a bit late.'),
  (3, 3, 'Good rice, though the dal was too salty.')
) AS v(order_id, stars, comment)
JOIN "order" o ON o.id = v.order_id;

-- ---------------------------------------------------------------- support requests
-- Order 8: still open, so an admin can practice resolving it.
INSERT INTO request (order_id, raised_by, reason)
SELECT id, customer_id, 'The order arrived cold and one filter coffee was missing.'
FROM "order" WHERE id = 8;

-- Order 3: already refunded 60 of its 250.
INSERT INTO request (order_id, raised_by, reason, status, resolved_by, refund_amount)
SELECT id, customer_id, 'The dal was far too salty to eat.', 'refunded'::request_status,
       (SELECT id FROM "user" WHERE email = 'admin@hungrybird.com'), 60.00
FROM "order" WHERE id = 3;

-- ---------------------------------------------------------------- self-check
-- Fails the whole script with a clear message if the demo data is inconsistent.
DO $$
DECLARE
  bad_totals INT;
  bad_payments INT;
  order_count INT;
BEGIN
  SELECT COUNT(*) INTO order_count FROM "order";
  IF order_count <> 8 THEN
    RAISE EXCEPTION 'seed check failed: expected 8 orders, found %', order_count;
  END IF;

  -- total_amount must equal the sum of the items minus the discount
  SELECT COUNT(*) INTO bad_totals
  FROM "order" o
  WHERE o.total_amount <>
        (SELECT SUM(oi.quantity * oi.price_at_order_time) FROM order_item oi WHERE oi.order_id = o.id)
        - o.discount_amount;
  IF bad_totals > 0 THEN
    RAISE EXCEPTION 'seed check failed: % order(s) have a total that does not match their items', bad_totals;
  END IF;

  -- each payment must equal its order's total
  SELECT COUNT(*) INTO bad_payments
  FROM payment p JOIN "order" o ON o.id = p.order_id
  WHERE p.amount <> o.total_amount;
  IF bad_payments > 0 THEN
    RAISE EXCEPTION 'seed check failed: % payment(s) do not match their order total', bad_payments;
  END IF;

  RAISE NOTICE 'seed check passed: 8 orders, all totals and payments consistent';
END $$;
