# API Endpoints

| Endpoint | Who | Body |
| :--- | :--- | :--- |
| `POST /auth/signup` | anyone | `name, email, password, role` (+ `restaurant_name, address, cuisine_type` for restaurants) |
| `POST /auth/login` | anyone | `email, password`. Returns `{ user, token }` |
| `GET /restaurants` | anyone | none |
| `GET /restaurants/:id/menu` | anyone | none |
| `GET /menu/mine` | restaurant | none |
| `POST /menu` | restaurant | `name, price` |
| `PUT /menu/:id` | restaurant | any of `name, price, is_available` |
| `DELETE /menu/:id` | restaurant | none |