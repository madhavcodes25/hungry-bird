# Hungry Bird: backend API

REST API for a food delivery app with four roles: **customer**, **restaurant**, **delivery partner** and **admin**. Built with Node.js, Express 5 and PostgreSQL.

## Setup

**Prerequisites:** Node 20 or newer, PostgreSQL 16.

```
# 1. Create the database and load the schema (from the repo root)
createdb -U postgres hungrybird
psql -U postgres -d hungrybird -f db/schema.sql

# 2. Optional: load demo data (this WIPES all tables first)
psql -U postgres -d hungrybird -f db/seed.sql

# 3. Install dependencies
cd backend
npm install

# 4. Create your .env file (see below), then start the server
npm run dev
```

`.env.example` :

```
PORT=3000
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@localhost:5432/hungrybird
JWT_SECRET=a-long-random-string
# Production only: the address of your deployed frontend (comma-separate several). Leave unset locally.
# CORS_ORIGIN=https://your-app.vercel.app
```

Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. If your database password contains symbols like `@`, URL-encode them (`@` becomes `%40`). The server refuses to start if `JWT_SECRET` is missing.

Check that it works: `curl localhost:3000/health` should print `{"status":"ok"}`.

### Demo accounts (after running `db/seed.sql`)

| Email | Password | Role |
|---|---|---|
| `admin@hungrybird.com` | `admin123` | admin |
| `asha@test.com` | `password123` | customer |
| `rohan@test.com` | `password123` | customer |
| `ravi@test.com` | `password123` | restaurant (Ravi Dosa Corner) |
| `meena@test.com` | `password123` | restaurant (Meena's Kitchen) |
| `kiran@test.com` | `password123` | delivery partner |
| `sunil@test.com` | `password123` | delivery partner |

These passwords are for development only. The seed also creates 8 orders in different statuses, three coupons (`WELCOME10`, `FLAT50`, and an expired `EXPIRED20`), three ratings, and two support requests (one open, one refunded).

### Tests

```
npm test
```

Runs every file in `test/`. `domain.test.js` needs no database and checks the order state machine, the observers, the payment strategies and the coupon and refund validation. `orderService.test.js` (the transaction rollback test) needs the database to be running.

## Conventions

- **Base URL:** `http://localhost:3000`
- **Format:** JSON in, JSON out. Send `Content-Type: application/json` with every request that has a body.
- **Authentication:** log in to get a token, then send it on protected routes: `Authorization: Bearer <token>`. Tokens last 7 days.
- **Banned users are blocked immediately.** Every protected request re-checks the account in the database, so a ban takes effect on the next request, not when the token expires.
- **Errors:** every error returns `{ "error": "message" }` with one of these codes:

| Code | Meaning |
|---|---|
| 400 | Bad request (missing or invalid fields) |
| 401 | Missing, invalid or expired token, a deleted account, or a wrong login |
| 403 | Your role isn't allowed to do this, or your account is suspended |
| 404 | Not found (also used when you aren't allowed to see that order or request) |
| 409 | Conflict (duplicate email, illegal order transition, already rated, delivery already taken) |
| 500 | Server error |

- **Money fields are strings.** PostgreSQL `NUMERIC` columns arrive as strings, such as `"80.00"`. In the frontend, use `Number(price)` before doing math. The exception is the response of `POST /orders`, which returns plain numbers.

## Endpoints at a glance

| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/health` | anyone | Server and database check |
| POST | `/auth/signup` | anyone | Create an account |
| POST | `/auth/login` | anyone | Get a token |
| GET | `/restaurants` | anyone | List restaurants with average rating |
| GET | `/restaurants/:id/menu` | anyone | One restaurant and its available menu |
| GET | `/restaurants/:id/ratings` | anyone | Average and recent reviews |
| GET | `/menu/mine` | restaurant | My menu items |
| POST | `/menu` | restaurant | Add a menu item |
| PUT | `/menu/:id` | restaurant | Edit one of my menu items |
| DELETE | `/menu/:id` | restaurant | Delete one of my menu items |
| POST | `/orders` | customer | Place an order |
| GET | `/orders` | any logged-in role | My orders (depends on your role) |
| GET | `/orders/:id` | any logged-in role | Order details, rating and requests |
| POST | `/orders/:id/advance` | restaurant, delivery partner | Move the order to its next status |
| POST | `/orders/:id/cancel` | customer, restaurant, admin | Cancel an order |
| POST | `/orders/:id/force-status` | admin | Set any status |
| GET | `/deliveries/available` | delivery partner | Orders waiting for a driver |
| GET | `/deliveries/earnings` | delivery partner | My payouts and cash collected |
| POST | `/deliveries/:orderId/accept` | delivery partner | Take a delivery |
| POST | `/ratings` | customer | Rate a delivered order |
| POST | `/requests` | customer | Raise a request on an order |
| GET | `/requests` | customer, admin | My requests (admin: everyone's) |
| POST | `/requests/:id/resolve` | admin | Close a request, with or without a refund |
| GET | `/admin/users` | admin | List users |
| POST | `/admin/users/:id/ban` | admin | Suspend a user |
| POST | `/admin/users/:id/unban` | admin | Lift a suspension |
| GET | `/admin/coupons` | admin | List coupons |
| POST | `/admin/coupons` | admin | Create a coupon |

---

## Auth

### `POST /auth/signup`

Public. Roles allowed at signup are `customer`, `restaurant` and `delivery_partner`. Admin accounts are created by hand in the database (the seed script creates one).

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

A restaurant whose owner is banned disappears from every public route below, and customers can no longer order from it.

### `GET /restaurants`

Public. `avg_rating` is `null` when a restaurant has no ratings yet.

```json
[{
  "id": 1, "restaurant_name": "Ravi Dosa Corner", "address": "Ring Road, Surat",
  "cuisine_type": "South Indian", "avg_rating": "5.0", "rating_count": 1
}]
```

### `GET /restaurants/:id/menu`

Public. Returns the restaurant and only its **available** items.

```json
{
  "restaurant": { "id": 1, "restaurant_name": "Ravi Dosa Corner", "address": "Ring Road, Surat", "cuisine_type": "South Indian" },
  "menu": [{ "id": 1, "name": "Masala Dosa", "price": "80.00" }]
}
```

Errors: `400` for an invalid id, `404` if the restaurant doesn't exist (or is hidden).

### `GET /restaurants/:id/ratings`

Public. Shows the 50 most recent reviews. `reviewer` is the customer's first name only.

```json
{
  "average": "5.0", "count": 1,
  "ratings": [{ "stars": 5, "comment": "The dosa was crisp and hot.", "reviewer": "Asha" }]
}
```

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
| `deliveryAddress` | yes | Text, 5 to 300 characters. Line breaks and repeated spaces are tidied into one line |
| `couponCode` | no | Text, not case-sensitive. Must be unexpired, under its usage limit, and the order must meet its minimum |

Prices come from the database, never from the request. Every item must belong to that restaurant and be available.

```json
POST /orders
{
  "restaurantId": 1,
  "items": [{ "menuItemId": 1, "quantity": 2 }],
  "paymentMethod": "cod",
  "couponCode": "WELCOME10",
  "deliveryAddress": "B-12, Sunrise Apartments, Adajan, Surat"
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
  "deliveryAddress": "B-12, Sunrise Apartments, Adajan, Surat",
  "payment": { "method": "cod", "status": "pending" }
}
```

Payment status: `card` and `upi` are `completed` immediately (payments are mocked). `cod` stays `pending` until the order is delivered, then becomes `completed`.

Errors: `400` for bad items, an unavailable item, a bad payment method, a missing or invalid `deliveryAddress`, or a coupon problem. `404` if the restaurant doesn't exist or is suspended.

### `GET /orders`

Any logged-in role. What you get depends on your role:

| Role | Returns |
|---|---|
| customer | Orders I placed |
| restaurant | Orders placed at my restaurant |
| delivery partner | Orders assigned to me |
| admin | All orders |

Newest first. Each item is the order row (`id, customer_id, restaurant_id, coupon_id, status, total_amount, discount_amount, delivery_address, created_at`) plus `restaurant_name` and `customer_name`, so a list screen needs no extra requests. **Restaurants get the same rows without `delivery_address`** (see "Who sees the delivery address" below).

### `GET /orders/:id`

Any logged-in role, but only for orders you're allowed to see (otherwise `404`, so nobody can probe which ids exist).

```json
{
  "order": { "id": 1, "status": "delivered", "total_amount": "144.00", "delivery_address": "B-12, Sunrise Apartments, Adajan, Surat", "...": "..." },
  "restaurant": { "restaurant_name": "Ravi Dosa Corner", "address": "Ring Road, Surat" },
  "customer": { "name": "Asha Mehta" },
  "items": [{ "menu_item_id": 1, "name": "Masala Dosa", "quantity": 2, "price_at_order_time": "80.00" }],
  "payment": { "method": "cod", "amount": "144.00", "status": "completed" },
  "delivery": { "status": "delivered", "delivery_partner_id": 3, "payout_amount": "40.00" },
  "rating": { "stars": 5, "comment": "Crisp and hot." },
  "requests": [{ "id": 1, "reason": "Missing item", "status": "open", "refund_amount": null, "created_at": "..." }]
}
```

`restaurant` and `customer` give the names to show on the page. `rating` is `null` until the customer rates the order. `requests` is only filled in for the customer who owns the order and for admins, and is an empty array for everyone else.

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
- A restaurant can only touch orders placed at **its own** restaurant, and it never receives the customer's delivery address.
- A delivery partner can only advance orders whose delivery was **assigned to them**, so they must call `POST /deliveries/:orderId/accept` first.
- When an order reaches `picked_up` or `delivered`, the delivery record is updated to match. On `delivered`, a cash-on-delivery payment becomes `completed`.
- Each status change prints a notification line to the server console (customer, restaurant and delivery partner observers). It isn't sent anywhere yet.

---

## Who sees the delivery address

The address is saved **on each order**, not on the user, so an old order keeps showing where it was actually delivered even if the customer later moves.

| Role | Sees the address? |
|---|---|
| Customer | Yes, on their own orders |
| Delivery partner | Only on orders assigned to them, so after accepting the delivery. The "available deliveries" list shows the pickup restaurant only |
| Admin | Yes, on every order |
| Restaurant | **No.** It is removed from every order list and detail it receives, because the restaurant does not need to know where the customer lives |

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

### `GET /deliveries/earnings`

What I have earned from delivered orders. `cash_collected` is the money I took in on cash-on-delivery orders. `recent` shows my last 20 deliveries.

```json
{
  "delivered_count": 2,
  "total_earned": "80.00",
  "cash_collected": "460.00",
  "recent": [
    { "order_id": 8, "payout_amount": "40.00", "created_at": "..." },
    { "order_id": 2, "payout_amount": "40.00", "created_at": "..." }
  ]
}
```

---

## Ratings

### `POST /ratings`

Customer only. Rates one of your own **delivered** orders, once.

| Field | Required | Notes |
|---|---|---|
| `orderId` | yes | Positive integer |
| `stars` | yes | Whole number from 1 to 5 |
| `comment` | no | Text, up to 500 characters |

Response `201`: `{ "id": 1, "order_id": 5, "stars": 4, "comment": "Tasty" }`

Errors: `400` for invalid input, `404` if it isn't your order, `409` if the order isn't delivered yet or is already rated.

---

## Customer requests and refunds

A customer raises a request on an order (a missing item, cold food, a refund). An admin closes it, with or without a refund. Each order can have only one **open** request at a time.

### `POST /requests`

Customer only. Body: `{ "orderId": 5, "reason": "The order arrived cold." }`. The reason must be 5 to 500 characters.

Response `201`: `{ id, order_id, raised_by, reason, status: "open", created_at }`

Errors: `404` if it isn't your order, `409` if the order already has an open request.

### `GET /requests`

Customers see their own requests, and admins see everyone's. Admins can filter with `?status=open` (or `resolved`, `refunded`).

```json
[{
  "id": 1, "order_id": 8, "raised_by": 3, "customer_name": "Rohan Shah",
  "reason": "The order arrived cold.", "status": "open",
  "resolved_by": null, "refund_amount": null, "created_at": "...",
  "order_status": "delivered", "order_total": "235.00", "refundable_remaining": "235.00"
}]
```

`refundable_remaining` is the order total minus refunds already given on that order.

### `POST /requests/:id/resolve`

Admin only. Two forms:

```json
{ "action": "resolve" }
{ "action": "refund", "refundAmount": 60 }
```

`refundAmount` is a number above 0 with at most 2 decimal places, and is only allowed with `"action": "refund"`. The total refunded on one order can never exceed what the customer paid.

Response `200`: the updated request, with `status` set to `resolved` or `refunded`. A refund is recorded on the request (`refund_amount`). It does not change the payment record.

Errors: `400` for a bad action or a refund larger than what is left, `404` if the request doesn't exist, `409` if it was already closed.

---

## Admin

All admin routes need an admin token.

### `GET /admin/users`

Optional filters: `?role=customer` and `?banned=true`. Returns `id, name, email, role, phone, is_banned, created_at`, sorted by id.

### `POST /admin/users/:id/ban` and `POST /admin/users/:id/unban`

No body. Response `200`: `{ "id": 2, "name": "...", "email": "...", "role": "customer", "is_banned": true }`

A banned user is locked out on their very next request. A banned restaurant disappears from the public restaurant list and can't receive new orders. Deliveries and orders already in progress are left alone, so use `force-status` if one gets stuck. Admins cannot be banned (`403`).

### `GET /admin/coupons`

All coupons, newest first, with `times_used` and `usage_limit`.

### `POST /admin/coupons`

| Field | Required | Notes |
|---|---|---|
| `code` | yes | 3 to 20 characters: letters, digits, `-` or `_`. Saved in upper case |
| `discountType` | yes | `percent` or `flat` |
| `discountValue` | yes | Number above 0. A percent cannot exceed 100 |
| `minOrderValue` | no | Defaults to 0 |
| `usageLimit` | no | Whole number, defaults to 100 |
| `validUntil` | yes | A date such as `"2026-12-31"` (means the end of that day) or `"2026-12-31T18:30:00"`. Must be in the future |

```json
POST /admin/coupons
{ "code": "diwali25", "discountType": "percent", "discountValue": 25, "minOrderValue": 200, "usageLimit": 50, "validUntil": "2026-11-15" }
```

Response `201`: the new coupon. Errors: `400` for invalid input, `409` if the code already exists.

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
| 10 | customer | `POST /ratings` | rating saved |
| 11 | customer | `POST /requests` | request `open` |
| 12 | admin | `POST /requests/1/resolve` | `refunded` or `resolved` |

---

## Not built yet

- Real notifications (currently console logs only)
- A refund does not change the payment record, only the request
- Password reset, email verification
- Pagination on list routes
- Editing or deactivating a coupon after creating it

## Project structure

```
backend/
  src/
    server.js            app setup, routes, error handler
    db.js                PostgreSQL connection pool
    errors.js            AppError (message + HTTP status)
    validators.js        coupon and refund input checks
    middleware/auth.js   requireAuth (checks the database), requireRole
    routes/              auth, restaurants, menu, orders, deliveries, requests, ratings, admin
    domain/              payments (Strategy), orderStates (State), order, observers (Observer)
    services/            orderService (orders, status changes), requestService (requests, refunds)
  test/                  node:test tests
db/
  schema.sql             tables and indexes
  seed.sql               demo data
docs/
  class-diagram.md       class diagrams
```
