# Que Copado - Product Documentation

## Product Purpose

Que Copado is an online ordering platform for an Argentine burger restaurant (hamburgueseria). It allows customers to browse a product catalog, build a shopping cart, and place orders via WhatsApp. The platform also provides a complete admin dashboard for the restaurant owner to manage products, categories, orders, delivery zones, and business settings.

**Target users:**
- **Customers:** People who want to order burgers and food for delivery or pickup.
- **Restaurant admin:** The business owner who manages the menu, orders, and settings.

**Application URL:** http://localhost:3000/

**Currency:** Argentine Peso (ARS). All prices are displayed in ARS format (e.g., "$1.500").

**Language:** The entire UI is in Spanish.

---

## Pages and Navigation

### Public Pages (No login required)

| Page | URL | Purpose |
|------|-----|---------|
| Home / Catalog | `/` | Browse products, filter by category, add to cart |
| Cart | `/cart` | Review cart items, adjust quantities, proceed to checkout |
| Checkout | `/checkout` | Enter delivery info, select payment, confirm order via WhatsApp |

### Admin Pages (Login required)

| Page | URL | Purpose |
|------|-----|---------|
| Admin Login | `/admin/login` | Email/password authentication |
| Dashboard | `/admin/dashboard` | View sales stats, charts, and recent orders |
| Products | `/admin/products` | Create, edit, delete, toggle products |
| Categories | `/admin/categories` | Manage product categories |
| Orders | `/admin/orders` | View and manage customer orders |
| Delivery Zones | `/admin/delivery-zones` | Configure geographic delivery areas on a map |
| Settings | `/admin/settings` | Business hours, operating days, pause orders |

### Navigation Elements

- **Header:** Visible on all public pages. Contains the restaurant logo/name and navigation links.
- **Footer:** Visible on all public pages.
- **Floating Cart Button:** A fixed-position button visible on public pages showing the number of items in the cart. Clicking it opens a cart drawer/sidebar.
- **Admin Sidebar:** Navigation menu on all admin pages with links to Dashboard, Products, Categories, Orders, Delivery Zones, and Settings.

---

## Feature 1: Product Catalog (Home Page)

**URL:** `/`

### What it does
Displays the restaurant's menu organized by categories. Customers can browse all available products and add them to the cart.

### How it should work

1. When the page loads, it displays:
   - A **hero section** (banner) at the top with restaurant branding.
   - A **side deals section** showing promotional items.
   - A **categories section** showcasing available food categories.
   - A **product menu section** with a grid of product cards.

2. **Category Filter:**
   - Above the product grid there are category filter buttons/tabs.
   - Clicking a category shows only products from that category.
   - There should be an option to show all products (no filter).
   - Filtering happens instantly on the client side (no page reload).

3. **Product Cards:** Each product card displays:
   - Product image
   - Product name
   - Product description
   - Price in ARS
   - An "Add to Cart" button
   - If a product is out of stock, it should show an out-of-stock state and the add button should be disabled or hidden.

4. **Add to Cart behavior:**
   - Clicking "Add to Cart" adds 1 unit of the product to the cart.
   - A toast notification should appear confirming the product was added.
   - The floating cart button counter should update immediately.
   - If the product is already in the cart, its quantity should increase by 1.

5. **Only active products are shown.** Products marked as inactive by the admin should NOT appear in the catalog.

---

## Feature 2: Shopping Cart

### Floating Cart Button
- Fixed position button visible on all public pages.
- Shows a badge with the total number of items in the cart.
- Clicking it opens a cart drawer (slide-in panel) or navigates to `/cart`.

### Cart Page (`/cart`)

**What it does:** Lets customers review their selected products before proceeding to checkout.

**How it should work:**

1. Displays a list of all items in the cart with:
   - Product name
   - Product image
   - Unit price
   - Quantity selector (increase/decrease buttons or stepper)
   - Item subtotal (price x quantity)
   - Remove button to delete the item from the cart

2. **Quantity adjustment:**
   - User can increase or decrease quantity using +/- buttons.
   - Minimum quantity is 1. If decreased below 1, the item should be removed.
   - The subtotal updates in real time when quantity changes.

3. **Cart total:**
   - Displays the subtotal of all items (sum of price x quantity for each item).
   - Updates in real time.

4. **Persistence:**
   - The cart is saved in the browser's localStorage.
   - Refreshing the page or closing and reopening the browser should preserve cart contents.
   - Cart data persists until the user clears it or completes an order.

5. **Empty cart state:**
   - If the cart is empty, show a message indicating there are no items.
   - Optionally show a link/button to go back to the catalog.

6. **Proceed to checkout:**
   - A button labeled to proceed to checkout that navigates to `/checkout`.
   - This button should only be enabled when the cart has at least 1 item.

---

## Feature 3: Checkout

**URL:** `/checkout`

### What it does
Allows customers to complete their order by entering delivery information, selecting a payment method, and confirming the order via WhatsApp.

### How it should work

#### Step 1: Delivery Type Selection
- The customer chooses between:
  - **Delivery** (envio a domicilio): The order will be delivered to the customer's address.
  - **Pickup** (retiro en local): The customer picks up the order at the restaurant.
- If "Pickup" is selected, the address and map sections are hidden and shipping cost is $0.

#### Step 2: Address Input (only for Delivery)
- **Address autocomplete field:** As the customer types their address, suggestions appear below the input field. The suggestions come from a geocoding service (Google Places or Nominatim).
- **Map picker:** An interactive map (Leaflet) is displayed. The customer can:
  - See a marker placed at the detected address.
  - Click on the map to place/move the marker.
  - Drag the marker to fine-tune the location.
- The map and address field are synchronized: selecting a suggestion updates the map, and moving the marker updates the address.

#### Step 3: Shipping Cost Calculation
- Once the customer's coordinates (lat/lng) are determined:
  - The system checks which delivery zone contains that point.
  - If inside a zone: the zone's shipping cost is applied.
  - If the order subtotal exceeds the zone's free shipping threshold: shipping is free ($0).
  - If the address is outside all delivery zones: a message appears saying the address is out of coverage and the order cannot be completed.
- The shipping cost is displayed in real time as the customer adjusts their address.

#### Step 4: Customer Information Form
The customer must fill in:
- **Name** (required)
- **Phone number** (required)
- **Address** (required for delivery, auto-filled from the map/autocomplete)
- **Notes / Special instructions** (optional)
- **Payment method** (required) - Options:
  - Cash (efectivo) - if selected, the customer can optionally specify the amount they will pay with (for change calculation)
  - Bank transfer (transferencia)
  - Mercado Pago

#### Step 5: Order Summary
- Displays:
  - List of all cart items with quantities and prices
  - Subtotal
  - Shipping cost (or "Free shipping" / "Pickup - no shipping")
  - Detected delivery zone name (if delivery)
  - Total (subtotal + shipping)
  - Selected payment method

#### Step 6: Order Confirmation
- A "Confirm Order" / "Send Order via WhatsApp" button.
- When clicked:
  1. The system validates all required fields are filled.
  2. The shipping cost is re-validated on the server side.
  3. If the address is out of coverage, an error toast appears and the order is blocked.
  4. If the business is paused or outside operating hours, a message is shown and the order is blocked.
  5. If all validations pass:
     - The order is saved to the database (with all details: items, customer info, coordinates, zone, shipping, payment method, status "recibido").
     - A WhatsApp message is generated with the full order details.
     - The browser opens WhatsApp (wa.me link) with the pre-filled message.
     - The cart is cleared.

#### Business Status Check
- Before allowing checkout, the system checks:
  - Is the business manually paused? If yes, show the pause message and block orders.
  - Is the current time within operating hours? If not, show a message.
  - Is today an operating day? If not, show a message.

---

## Feature 4: Admin Login

**URL:** `/admin/login`

### What it does
Authenticates the restaurant owner/admin to access the management panel.

### How it should work
1. Shows an email and password form.
2. On submit, authenticates against Supabase Auth.
3. On success: redirects to `/admin/dashboard`.
4. On failure: shows an error message (invalid credentials).
5. All `/admin/*` routes are protected. If not authenticated, the user is redirected to `/admin/login`.
6. A logout option is available in the admin panel to end the session.

---

## Feature 5: Admin Dashboard

**URL:** `/admin/dashboard`

### What it does
Provides an overview of the business's performance with key metrics, charts, and recent activity.

### How it should work

1. **Stats Cards (KPIs):** Display the following metrics:
   - Today's revenue (sum of today's orders)
   - Today's order count
   - This week's revenue
   - This week's order count
   - This month's revenue
   - This month's order count
   - Average ticket (average order total)

2. **Sales Chart:**
   - A bar or line chart showing daily sales for the last 7 days.
   - X-axis: dates, Y-axis: revenue in ARS.

3. **Top Products Table:**
   - Shows the top 5 best-selling products.
   - Columns: product name, quantity sold, revenue generated.

4. **Recent Orders Feed:**
   - Lists the most recent orders with: customer name, total, status, timestamp.
   - Each order may have a link to view details.

---

## Feature 6: Product Management

**URL:** `/admin/products`

### What it does
CRUD interface for managing the restaurant's product catalog.

### How it should work

1. **Product Table:** Displays all products (active and inactive) with columns:
   - Product name
   - Category
   - Price (editable inline)
   - Stock status (available / out of stock) - toggle switch
   - Visibility (active / inactive) - toggle switch
   - Actions (edit, delete)

2. **Create Product:**
   - A button to open a creation form/dialog.
   - Required fields: name, category (dropdown), price, image URL.
   - Optional fields: description.
   - On submit: product is created and appears in the table.

3. **Edit Product:**
   - Click edit on any product to open a pre-filled form.
   - All fields are editable.
   - On submit: product is updated.

4. **Inline Price Edit:**
   - Click on the price cell to edit it directly in the table.
   - Save the new price without opening a full form.

5. **Toggle Stock:**
   - A switch/toggle to mark a product as out of stock or available.
   - Out-of-stock products remain visible in the admin but show as unavailable to customers.

6. **Toggle Visibility:**
   - A switch/toggle to activate or deactivate a product.
   - Inactive products are completely hidden from the public catalog.

7. **Delete Product:**
   - Click delete to remove a product.
   - Should show a confirmation dialog before deleting.

---

## Feature 7: Category Management

**URL:** `/admin/categories`

### What it does
Manage the categories used to organize products (e.g., "Burgers", "Sides", "Drinks").

### How it should work

1. **Category List:** Displays all categories with:
   - Category name
   - Slug (URL-friendly version, auto-generated from name)
   - Sort order
   - Actions (edit, delete)

2. **Create Category:**
   - Opens a dialog/modal form.
   - Fields: name (required). Slug is auto-generated.
   - On submit: category is created.

3. **Edit Category:**
   - Opens a pre-filled dialog for editing.
   - On submit: category is updated.

4. **Delete Category:**
   - Confirmation dialog before deletion.
   - Should handle the case where products exist in the category.

5. **Reorder:**
   - Categories can be reordered (drag or sort order field).
   - The order affects how categories appear in the public catalog filter.

---

## Feature 8: Order Management

**URL:** `/admin/orders`

### What it does
View and manage all customer orders with filtering and status updates.

### How it should work

1. **Orders Table:** Displays orders with columns:
   - Order ID or date
   - Customer name
   - Customer phone
   - Delivery address
   - Total amount
   - Shipping cost
   - Payment method
   - Status (badge with color)
   - Actions

2. **Order Statuses and their visual indicators:**
   - **Recibido** (received) - initial status when order is placed
   - **Pagado** (paid) - order has been paid
   - **Entregado** (delivered) - order has been delivered
   - **Cancelado** (cancelled) - order was cancelled

3. **Filters:**
   - Filter by status (dropdown or tabs)
   - Filter by date range
   - Search by customer name, phone, or address
   - Orders are sorted by creation date (newest first)

4. **Order Details Drawer:**
   - Clicking on an order opens a side drawer/panel with full details:
     - All customer information (name, phone, address)
     - Delivery zone detected
     - All order items with quantities, prices, and subtotals
     - Shipping cost
     - Order total
     - Payment method
     - Special instructions/notes
     - Current status
     - Link to customer's WhatsApp
     - Link to address on Google Maps

5. **Change Status:**
   - A dialog/action to change the order status.
   - Available transitions: recibido -> pagado -> entregado, or any status -> cancelado.

---

## Feature 9: Delivery Zones Management

**URL:** `/admin/delivery-zones`

### What it does
Configure geographic delivery areas using an interactive map with polygon drawing. Each zone has its own shipping cost and free shipping threshold.

### How it should work

1. **Zone Map:**
   - An interactive Leaflet map is displayed showing all configured delivery zones.
   - Each zone is drawn as a colored polygon on the map.
   - The admin can draw new polygons using the Geoman drawing tools.
   - Existing polygons can be edited (vertices dragged) or deleted.

2. **Zone Configuration (form/dialog):**
   - **Zone name** (required) - e.g., "Centro", "Zona Norte"
   - **Shipping cost** (required) - cost in ARS for delivering to this zone
   - **Free shipping threshold** (optional) - minimum order amount for free shipping in this zone
   - **Color** (required) - hex color for the polygon visualization on the map
   - **Polygon coordinates** - drawn on the map (GeoJSON format)

3. **Zone List/Table:**
   - Lists all zones with: name, shipping cost, free shipping threshold, active status.
   - Toggle to activate/deactivate a zone.
   - Reorder zones (sort order determines priority when zones overlap).
   - Edit and delete actions.

4. **Validation Rules:**
   - Zones should not overlap with each other. If a new zone overlaps an existing one, show an error.
   - Polygon must have valid coordinates (lat: -90 to 90, lng: -180 to 180).
   - At least 3 points required to form a valid polygon.

5. **How zones affect checkout:**
   - When a customer enters their delivery address, the system checks each active zone (in sort_order) to find which zone contains the address point.
   - The first matching zone determines the shipping cost.
   - If no zone matches, the address is "out of coverage" and the order is blocked.

---

## Feature 10: Business Settings

**URL:** `/admin/settings`

### What it does
Configure the restaurant's operating hours and the ability to pause order acceptance.

### How it should work

1. **Operating Hours:**
   - **Opening time** (HH:MM format) - e.g., "11:00"
   - **Closing time** (HH:MM format) - e.g., "23:00"
   - Orders can only be placed during operating hours.

2. **Operating Days:**
   - Select which days of the week the restaurant operates.
   - Days are numbered 0-6 (Sunday to Saturday).
   - Checkboxes or toggle for each day.
   - Orders are blocked on non-operating days.

3. **Pause/Resume Orders:**
   - A toggle switch to manually pause order acceptance.
   - When paused, a custom **pause message** is displayed to customers on the checkout page (e.g., "We are currently not accepting orders").
   - The pause message is a text field the admin can customize.
   - When resumed (un-paused), orders can be placed normally.

4. **Impact on checkout:**
   - If the business is paused OR outside operating hours OR on a non-operating day, the checkout page should display a clear message and prevent order submission.

---

## Feature 11: WhatsApp Integration

### What it does
Orders are sent to the restaurant via WhatsApp. The system generates a formatted message and opens WhatsApp with the message pre-filled.

### How it should work

1. After order confirmation, a WhatsApp message is generated containing:
   - Order items (name, quantity, unit price, subtotal for each)
   - Customer name and phone
   - Delivery address with a Google Maps link (for delivery orders)
   - Detected delivery zone name
   - Shipping cost or "Free shipping" indicator
   - Payment method (and cash amount if paying with cash)
   - Special instructions/notes
   - Order total

2. The message is sent by opening a `https://wa.me/{phone}?text={encoded_message}` URL.
3. The WhatsApp number is configured via environment variable.

---

## Expected Behaviors and Validations

### Form Validations
- **Checkout form:** Name and phone are required. Address is required for delivery. Payment method is required.
- **Product form:** Name, category, and price are required. Price must be a positive number.
- **Category form:** Name is required.
- **Zone form:** Name, shipping cost, color, and polygon are required. Shipping cost must be a positive number.
- **Settings form:** Opening and closing times are required. At least one operating day must be selected.

### Error Handling
- Network errors should show a toast notification with an error message.
- Form validation errors should show inline error messages near the invalid field.
- If Supabase returns an error, it should be shown as a user-friendly message.

### Responsive Design
- The public pages (catalog, cart, checkout) are mobile-first responsive.
- Product grid adapts from 1 column (mobile) to 2-3 columns (tablet/desktop).
- The admin panel is optimized for desktop but should be usable on tablets.

### Toast Notifications
- Success: "Product added to cart", "Order created successfully", "Product saved", etc.
- Error: "Failed to save product", "Address out of coverage", "Business is currently closed", etc.
- Toasts appear at the top or bottom of the screen and auto-dismiss after a few seconds.

---

## Data Relationships

- A **Product** belongs to one **Category**.
- An **Order** contains multiple items (products with quantities) stored as JSON.
- An **Order** is optionally associated with a **Delivery Zone** (detected by coordinates).
- **Delivery Zones** are independent polygons on the map, each with their own shipping cost.
- **Business Settings** is a single configuration record that controls the entire store.

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 16 + React 19 + TypeScript |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (email/password) |
| Styling | Tailwind CSS 4 + Shadcn/UI |
| Maps | Leaflet + React-Leaflet + Geoman |
| Geospatial Logic | Turf.js |
| State Management | Zustand (cart only, persisted to localStorage) |
| Charts | Recharts |
| Animations | Framer Motion |
| Notifications | Sonner (toast) |
