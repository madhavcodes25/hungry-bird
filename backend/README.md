# Hungry Bird: backend API

REST API for a food delivery app with four roles: **customer**, **restaurant**, **delivery partner** and **admin**. Built with Node.js, Express 5 and PostgreSQL.

## Setup

**Prerequisites:** Node 20 or newer, PostgreSQL 16.

```
# 1. Create the database and load the schema (from the repo root)
createdb -U postgres hungrybird
psql -U postgres -d hungrybird -f db/schema.sql

# 2. Install dependencies
cd backend
npm install

# 3. Create your .env file (see below), then start the server
npm run dev
```

`.env.example`:

```
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/hungrybird
JWT_SECRET=a-long-random-string
```

Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. If your database password contains symbols like `@`, URL-encode them (`@` becomes `%40`).

Check that it works: `curl localhost:3000/health` should print `{"status":"ok"}`.

Run the tests with `npm test`. They need the database to be running.

## Conventions

- **Base URL:** `http://localhost:3000`
- **Format:** JSON in, JSON out. Send `Content-Type: application/json` with every request that has a body.
- **Authentication:** log in to get a token, then send it on protected routes: `Authorization: Bearer <token>`. Tokens last 7 days.
- **Errors:** every error returns `{ "error": "message" }` with one of these codes:

| Code | Meaning |
|---|---|
| 400 | Bad request (missing or invalid fields) |
| 401 | Missing, invalid or expired token, or wrong login |
| 403 | Logged in, but your role isn't allowed to do this |
| 404 | Not found (also used when you aren't allowed to see that order) |
| 409 | Conflict (duplicate email, illegal order transition, delivery already taken) |
| 500 | Server error |

- **Money fields are strings.** PostgreSQL `NUMERIC` columns arrive as strings, such as `"80.00"`. In the frontend, use `Number(price)` before doing math. The exception is the response of `POST /orders`, which returns plain numbers.

## Endpoints at a glance

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/health` | anyone | Server and database check |
| POST | `/auth/signup` | anyone | Create an account |
| POST | `/auth/login` | anyone | Get a token |
| GET | `/restaurants` | anyone | List restaurants |
| GET | `/restaurants/:id/menu` | anyone | One restaurant and its available menu |
| GET | `/menu/mine` | restaurant | My menu items |
| POST | `/menu` | restaurant | Add a menu item |
| PUT | `/menu/:id` | restaurant | Edit one of my menu items |
| DELETE | `/menu/:id` | restaurant | Delete one of my menu items |
| POST | `/orders` | customer | Place an order |
| GET | `/orders` | any logged-in role | My orders (what you see depends on your role) |
| GET | `/orders/:id` | any logged-in role | Order details |
| POST | `/orders/:id/advance` | restaurant, delivery partner | Move the order to its next status |
| POST | `/orders/:id/cancel` | customer, restaurant, admin | Cancel an order |
| POST | `/orders/:id/force-status` | admin | Set any status |
| GET | `/deliveries/available` | delivery partner | Orders waiting for a driver |
| POST | `/deliveries/:orderId/accept` | delivery partner | Take a delivery |

---

## Auth

### `POST /auth/signup`

Public. Roles allowed at signup are `customer`, `restaurant` and `delivery_partner`. Admin accounts are created by hand in the database.

| Field | Required | Notes |
|---|---|---|
| `name` | yes | Text |
| `email` | yes | Stored in lowercase, must be unique |
| `password` | yes | At least 6 characters |
| `role` | yes | `customer`, `restaurant` or `delivery_partner` |
| `phone` | no | Text |
| `restaurant_name` | restaurants only | Required when `role` is `restaurant` |
| `address` | restaurants only | Required when `role` is `restaurant` |
| `cuisine_type` | no | Restaurants only |

A restaurant signup creates the user and the restaurant profile together, or neither.

```json
POST /auth/signup
{ "name": "Asha", "email": "asha@test.com", "password": "secret123", "role": "customer" }
```

Response `201`:

```json
{
  "user": { "id": 1, "name": "Asha", "email": "asha@test.com", "role": "customer" },
  "token": "eyJhbGciOi..."
}
```

Errors: `400` for missing or invalid fields, `409` if the email is already registered.

### `POST /auth/login`

Public. Body: `{ "email": "...", "password": "..." }`.

Response `200`: `{ "user": { id, name, email, role, is_banned }, "token": "..." }`

Errors: `401` for a wrong email or password (the message is the same for both on purpose), `403` if the account is suspended.

---

## Restaurants and menus

### `GET /restaurants`

Public. Response `200`:

```json
[{ "id": 1, "restaurant_name": "Ravi Dosa Corner", "address": "Ring Road", "cuisine_type": "South Indian" }]
```

### `GET /restaurants/:id/menu`

Public. Returns the restaurant and only its **available** items.

```json
{
  "restaurant": { "id": 1, "restaurant_name": "Ravi Dosa Corner", "address": "Ring Road", "cuisine_type": "South Indian" },
  "menu": [{ "id": 1, "name": "Masala Dosa", "price": "80.00" }]
}
```

Errors: `400` for an invalid id, `404` if the restaurant doesn't exist.

### `GET /menu/mine`

Restaurant only. All my items, including unavailable ones.

```json
[{ "id": 1, "name": "Masala Dosa", "price": "80.00", "is_available": true }]
```

### `POST /menu`

Restaurant only. Body: `{ "name": "Masala Dosa", "price": 80 }`. `price` must be a **number** (not text) of 0 or more.

Response `201`: the new item (`id, name, price, is_available`). Error: `400`.

### `PUT /menu/:id`

Restaurant only, own items only. Send any of `name`, `price`, `is_available`. Fields you leave out stay unchanged.

Response `200`: the updated item. Error: `404` if the item isn't yours or doesn't exist.

### `DELETE /menu/:id`

Restaurant only, own items only. Response `204` with no body.

Errors: `404` if not found, `409` if the item appears in past orders. In that case, set `is_available` to `false` with `PUT` instead.

---

## Orders

### `POST /orders`

Customer only. Places an order, takes payment and creates the delivery record, all in one database transaction.

| Field | Required | Notes |
|---|---|---|
| `restaurantId` | yes | Positive integer |
| `items` | yes | Non-empty array of `{ "menuItemId": 1, "quantity": 2 }` |
| `paymentMethod` | yes | `card`, `upi` or `cod` |
| `couponCode` | no | Must be valid, unexpired, under its usage limit, and the order must meet its minimum |

Prices come from the database, never from the request. Every item must belong to that restaurant and be available.

```json
POST /orders
{
  "restaurantId": 1,
  "items": [{ "menuItemId": 1, "quantity": 2 }],
  "paymentMethod": "cod",
  "couponCode": "WELCOME10"
}
```

Response `201`:

```json
{
  "orderId": 1,
  "status": "placed",
  "subtotal": 160,
  "discount": 16,
  "total": 144,
  "payment": { "method": "cod", "status": "pending" }
}
```

Payment status: `card` and `upi` are `completed` immediately (payments are mocked). `cod` stays `pending` until the order is delivered, then becomes `completed`.

Errors: `400` for bad items, an unavailable item, a bad payment method, or a coupon problem.

### `GET /orders`

Any logged-in role. What you get depends on your role:

| Role | Returns |
|---|---|
| customer | Orders I placed |
| restaurant | Orders placed at my restaurant |
| delivery partner | Orders assigned to me |
| admin | All orders |

Newest first. Each item is a raw order row: `id, customer_id, restaurant_id, coupon_id, status, total_amount, discount_amount, created_at`.

### `GET /orders/:id`

Any logged-in role, but only for orders you're allowed to see (otherwise `404`, so nobody can probe which ids exist).

```json
{
  "order": { "id": 1, "status": "delivered", "total_amount": "144.00", "...": "..." },
  "items": [{ "menu_item_id": 1, "name": "Masala Dosa", "quantity": 2, "price_at_order_time": "80.00" }],
  "payment": { "method": "cod", "amount": "144.00", "status": "completed" },
  "delivery": { "status": "delivered", "delivery_partner_id": 3, "payout_amount": "40.00" }
}
```

### `POST /orders/:id/advance`

Restaurant or delivery partner. No body. Moves the order to its next status, but only if **your role is the one allowed to make that move**.

Response `200`: `{ "id": 1, "status": "accepted" }`

Errors: `403` if your role can't make this move, `409` if the order is already finished, `404` if it isn't yours.

### `POST /orders/:id/cancel`

Customer, restaurant or admin. No body. Response `200`: `{ "id": 1, "status": "cancelled" }`

Error: `409` if your role can't cancel an order at its current status (see the table below).

### `POST /orders/:id/force-status`

Admin only. Body: `{ "status": "delivered" }`. The status must be one of the eight valid names. Use this to resolve a stuck or disputed order.

---

## Order lifecycle

Status moves one step at a time, and each step belongs to one role:

| Current status | Next status | Who advances it | Who can cancel it |
|---|---|---|---|
| `placed` | `accepted` | restaurant | customer, restaurant, admin |
| `accepted` | `preparing` | restaurant | restaurant, admin |
| `preparing` | `ready` | restaurant | admin |
| `ready` | `picked_up` | delivery partner | admin |
| `picked_up` | `out_for_delivery` | delivery partner | admin |
| `out_for_delivery` | `delivered` | delivery partner | admin |
| `delivered` | none (final) | none | none |
| `cancelled` | none (final) | none | none |

Access rules on top of this:
- A restaurant can only touch orders placed at **its own** restaurant.
- A delivery partner can only advance orders whose delivery was **assigned to them**, so they must call `POST /deliveries/:orderId/accept` first.
- When an order reaches `picked_up` or `delivered`, the delivery record is updated to match. On `delivered`, a cash-on-delivery payment becomes `completed`.
- Each status change prints a notification line to the server console (customer, restaurant and delivery partner observers). It isn't sent anywhere yet.

---

## Deliveries

All delivery routes are for delivery partners only. Every delivery pays a flat `payout_amount` of 40 for now.

### `GET /deliveries/available`

Orders that are accepted, preparing or ready, and not yet taken by any driver.

```json
[{ "order_id": 1, "restaurant_name": "Ravi Dosa Corner", "address": "Ring Road", "payout_amount": "40.00" }]
```

### `POST /deliveries/:orderId/accept`

Assigns the delivery to you. Response `200`:

```json
{ "id": 1, "order_id": 1, "status": "assigned", "payout_amount": "40.00" }
```

Error: `409` if the delivery was already taken or isn't ready to be taken. Two drivers accepting at the same moment can't both win.

---

## A full order, step by step

| Step | Who | Call | Result |
|---|---|---|---|
| 1 | customer | `POST /orders` | order `placed` |
| 2 | restaurant | `POST /orders/1/advance` | `accepted` |
| 3 | restaurant | `POST /orders/1/advance` | `preparing` |
| 4 | restaurant | `POST /orders/1/advance` | `ready` |
| 5 | delivery partner | `GET /deliveries/available`, then `POST /deliveries/1/accept` | delivery `assigned` |
| 6 | delivery partner | `POST /orders/1/advance` | `picked_up` |
| 7 | delivery partner | `POST /orders/1/advance` | `out_for_delivery` |
| 8 | delivery partner | `POST /orders/1/advance` | `delivered` |
| 9 | customer | `GET /orders/1` | full details |

---

## Not built yet

- Customer requests and refunds
- Ratings
- Admin tools: creating coupons, banning users (login already refuses banned accounts)
- Real notifications (currently console logs only)

**Coupons for now:** create them directly in `psql`:

```sql
INSERT INTO coupon (code, discount_type, discount_value, min_order_value, usage_limit, valid_until)
VALUES ('WELCOME10', 'percent', 10, 100, 100, NOW() + INTERVAL '30 days');
```

`discount_type` is `percent` or `flat`.

## Project structure

```
backend/
  src/
    server.js            app setup, routes, error handler
    db.js                PostgreSQL connection pool
    errors.js            AppError (message + HTTP status)
    middleware/auth.js   requireAuth, requireRole
    routes/              auth, restaurants, menu, orders, deliveries
    domain/              payments (Strategy), orderStates (State), order, observers (Observer)
    services/orderService.js   placing orders and changing status (transactions)
  test/                  node:test tests
```