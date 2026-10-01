-- 1. User
CREATE TYPE user_role AS ENUM ('customer', 'restaurant', 'delivery_partner', 'admin');

CREATE TABLE "user" (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    phone           VARCHAR(20),
    is_banned       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. RestaurantProfile
CREATE TABLE restaurant_profile (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER UNIQUE NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    restaurant_name VARCHAR(150) NOT NULL,
    address         TEXT NOT NULL,
    cuisine_type    VARCHAR(100)
);

-- 3. MenuItem
CREATE TABLE menu_item (
    id              SERIAL PRIMARY KEY,
    restaurant_id   INTEGER NOT NULL REFERENCES restaurant_profile(id) ON DELETE CASCADE,
    name            VARCHAR(150) NOT NULL,
    price           NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_available    BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Coupon
CREATE TYPE discount_type AS ENUM ('percent', 'flat');

CREATE TABLE coupon (
    id              SERIAL PRIMARY KEY,
    code            VARCHAR(50) UNIQUE NOT NULL,
    discount_type   discount_type NOT NULL,
    discount_value  NUMERIC(10, 2) NOT NULL CHECK (discount_value >= 0),
    min_order_value NUMERIC(10, 2) NOT NULL DEFAULT 0,
    usage_limit     INTEGER NOT NULL DEFAULT 1,
    times_used      INTEGER NOT NULL DEFAULT 0,
    valid_until     TIMESTAMP NOT NULL
);

-- 5. Order
CREATE TYPE order_status AS ENUM (
    'placed', 'accepted', 'preparing', 'ready',
    'picked_up', 'out_for_delivery', 'delivered', 'cancelled'
);

CREATE TABLE "order" (
    id              SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL REFERENCES "user"(id),
    restaurant_id   INTEGER NOT NULL REFERENCES restaurant_profile(id),
    coupon_id       INTEGER REFERENCES coupon(id),
    status          order_status NOT NULL DEFAULT 'placed',
    total_amount    NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. OrderItem
CREATE TABLE order_item (
    id                      SERIAL PRIMARY KEY,
    order_id                INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    menu_item_id            INTEGER NOT NULL REFERENCES menu_item(id),
    quantity                INTEGER NOT NULL CHECK (quantity > 0),
    price_at_order_time     NUMERIC(10, 2) NOT NULL CHECK (price_at_order_time >= 0)
);

-- 7. Payment
CREATE TYPE payment_method AS ENUM ('card', 'upi', 'cod');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE payment (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER UNIQUE NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    method          payment_method NOT NULL,
    amount          NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status          payment_status NOT NULL DEFAULT 'pending'
);

-- 8. Delivery
CREATE TYPE delivery_status AS ENUM ('unassigned', 'assigned', 'picked_up', 'delivered');

CREATE TABLE delivery (
    id                      SERIAL PRIMARY KEY,
    order_id                INTEGER UNIQUE NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    delivery_partner_id     INTEGER REFERENCES "user"(id),
    status                  delivery_status NOT NULL DEFAULT 'unassigned',
    payout_amount           NUMERIC(10, 2) CHECK (payout_amount >= 0)
);

-- 9. Request
CREATE TYPE request_status AS ENUM ('open', 'resolved', 'refunded');

CREATE TABLE request (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    raised_by       INTEGER NOT NULL REFERENCES "user"(id),
    reason          TEXT NOT NULL,
    status          request_status NOT NULL DEFAULT 'open',
    resolved_by     INTEGER REFERENCES "user"(id),
    refund_amount   NUMERIC(10, 2) CHECK (refund_amount >= 0),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 10. Rating
CREATE TABLE rating (
    id              SERIAL PRIMARY KEY,
    order_id        INTEGER UNIQUE NOT NULL REFERENCES "order"(id) ON DELETE CASCADE,
    customer_id     INTEGER NOT NULL REFERENCES "user"(id),
    restaurant_id   INTEGER NOT NULL REFERENCES restaurant_profile(id),
    stars           INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment         TEXT
);

-- Indexes for common lookups
CREATE INDEX idx_menu_item_restaurant ON menu_item(restaurant_id);
CREATE INDEX idx_order_customer ON "order"(customer_id);
CREATE INDEX idx_order_restaurant ON "order"(restaurant_id);
CREATE INDEX idx_order_item_order ON order_item(order_id);
CREATE INDEX idx_delivery_partner ON delivery(delivery_partner_id);
CREATE INDEX idx_request_order ON request(order_id);