# Elreem Bag Store

A comprehensive e-commerce web application for selling bags, featuring bilingual support (English/Arabic), responsive design, and complete admin management system.

## Features

### User Features
- **Bilingual Support**: Full English and Arabic language support with RTL layout
- **Responsive Design**: Mobile-friendly interface that works on all devices
- **User Authentication**: Email/password and Google OAuth login
- **Product Catalog**: Browse bags with detailed product pages
- **Shopping Cart**: Add items, manage quantities, and checkout
- **Order Management**: View order history and track order status
- **Color Selection**: Choose from available colors for each product

### Admin Features
- **Dashboard**: Overview of sales, orders, and inventory
- **Inventory Management**: Add, edit, and delete products
- **Order Management**: View and update order statuses
- **User Management**: Monitor customer accounts
- **Database Backup**: Create and restore database backups
- **Multi-language Content**: Manage product descriptions in both languages

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL with connection pooling
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5
- **Authentication**: Passport.js (Local & Google OAuth)
- **File Upload**: Multer
- **Security**: Helmet, bcryptjs, express-rate-limit
- **Production Ready**: Health checks, graceful shutdown, error handling

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd elreem-bag-store
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up PostgreSQL**
   - Install PostgreSQL locally or use a cloud service
   - Create a database named `elreem_store`

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` file with your configuration:
   ```env
   PORT=8080
   NODE_ENV=development
   SESSION_SECRET=your-super-secret-session-key

   # Database (choose one method)
   DATABASE_URL=postgresql://username:password@localhost:5432/elreem_store
   # OR individual parameters:
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=elreem_store
   DB_USER=postgres
   DB_PASSWORD=password

   ADMIN_EMAIL=admin@elreem.com
   ADMIN_PASSWORD=admin123
   ```

5. **Test database connection**
   ```bash
   npm run test-db
   ```

6. **Initialize the database**
   ```bash
   npm run init-db
   ```

7. **Start the server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

8. **Access the application**
   - Open your browser and go to `http://localhost:8080`
   - Health check: `http://localhost:8080/health`
   - Admin login: `admin@elreem.com` / `admin123`

### Production Deployment

#### Railway Deployment
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard:
   ```env
   NODE_ENV=production
   SESSION_SECRET=your-production-secret
   DATABASE_URL=postgresql://... (provided by Railway)
   ADMIN_EMAIL=admin@elreem.com
   ADMIN_PASSWORD=secure-admin-password
   ```
3. Railway will automatically deploy on git push

#### Render Deployment
1. Connect your GitHub repository to Render
2. Create a PostgreSQL database service
3. Create a web service with these settings:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Set environment variables in Render dashboard

#### Manual Server Deployment
1. Set up PostgreSQL database
2. Clone repository and install dependencies
3. Set production environment variables
4. Run `npm run init-db` to initialize database
5. Use PM2 or similar for process management:
   ```bash
   npm install -g pm2
   pm2 start server.js --name elreem-store
   ```

### Migrating from SQLite (if applicable)

If you have an existing SQLite database, you can migrate to PostgreSQL:

1. **Ensure both databases are accessible**
2. **Run the migration script**
   ```bash
   npm run migrate
   ```
3. **Verify the migration**
   ```bash
   npm run test-db
   ```

The migration script will:
- Create PostgreSQL tables with proper schema
- Transfer all data from SQLite to PostgreSQL
- Verify data integrity
- Provide detailed migration report

## Project Structure

```
elreem-bag-store/
├── config/
│   ├── database.js          # Main database interface
│   ├── postgresql.js        # PostgreSQL connection pool
│   └── passport.js          # Authentication strategies
├── locales/
│   ├── en.json             # English translations
│   └── ar.json             # Arabic translations
├── middleware/
│   └── auth.js             # Authentication middleware
├── public/
│   ├── css/
│   │   └── style.css       # Main stylesheet
│   ├── js/
│   │   ├── main.js         # Core JavaScript functionality
│   │   ├── auth.js         # Authentication scripts
│   │   ├── cart.js         # Shopping cart functionality
│   │   └── admin.js        # Admin panel scripts
│   ├── images/             # Static images
│   └── uploads/            # User uploaded files
├── routes/
│   ├── api.js              # API endpoints
│   ├── auth.js             # Authentication routes
│   └── main.js             # Main application routes
├── scripts/
│   ├── init-db.js          # Database initialization
│   ├── migrate-to-postgresql.js  # SQLite to PostgreSQL migration
│   └── test-postgresql-connection.js  # Database connection test
├── views/
│   ├── admin/
│   │   └── dashboard.ejs   # Admin dashboard
│   ├── partials/           # Reusable view components
│   ├── cart.ejs            # Shopping cart page
│   ├── error.ejs           # Error page
│   ├── home.ejs            # Homepage
│   ├── layout.ejs          # Main layout template
│   ├── login.ejs           # Login page
│   ├── orders.ejs          # Order history
│   └── signup.ejs          # Registration page
├── .env                    # Environment variables
├── .gitignore             # Git ignore rules
├── package.json           # Project dependencies
├── README.md              # This file
└── server.js              # Main server file
```

## Database Schema

### Users Table
- `id`: Primary key
- `first_name`: User's first name
- `last_name`: User's last name
- `email`: Unique email address
- `phone`: Phone number
- `password`: Hashed password
- `google_id`: Google OAuth ID
- `is_admin`: Admin flag
- `created_at`: Creation timestamp

### Bags Table
- `id`: Primary key
- `name_en`: Product name in English
- `name_ar`: Product name in Arabic
- `description_en`: Description in English
- `description_ar`: Description in Arabic
- `price`: Product price
- `colors`: Available colors (JSON)
- `quantity`: Available stock
- `image_urls`: Product images (JSON)

### Orders Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `status`: Order status
- `total_amount`: Total order value
- `customer_name`: Customer name
- `customer_phone`: Customer phone
- `customer_address`: Delivery address
- `customer_email`: Customer email

### Order Items Table
- `id`: Primary key
- `order_id`: Foreign key to orders
- `bag_id`: Foreign key to bags
- `quantity`: Item quantity
- `price`: Item price at time of order
- `selected_color`: Chosen color

## API Endpoints

### Authentication
- `POST /login` - User login
- `POST /signup` - User registration
- `POST /logout` - User logout
- `GET /auth/google` - Google OAuth
- `GET /auth/google/callback` - Google OAuth callback

### Shopping Cart
- `POST /api/cart/add` - Add item to cart
- `PUT /api/cart/update/:itemId` - Update cart item
- `DELETE /api/cart/remove/:itemId` - Remove cart item
- `GET /api/cart/count` - Get cart item count
- `POST /api/checkout` - Process checkout

### Admin (Protected)
- `POST /api/admin/bags` - Add new product
- `PUT /api/admin/bags/:id` - Update product
- `DELETE /api/admin/bags/:id` - Delete product
- `PUT /api/admin/orders/:id/status` - Update order status
- `GET /api/admin/stats` - Get dashboard statistics
- `POST /api/admin/backup` - Create database backup

## Language Support

The application supports both English and Arabic languages with:
- Dynamic language switching
- RTL (Right-to-Left) layout for Arabic
- Translated content for all UI elements
- Localized date and number formatting

## Security Features

- Password hashing with bcryptjs
- Session-based authentication
- CSRF protection
- Rate limiting
- Input validation and sanitization
- Secure file upload handling
- Admin-only route protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please contact the development team.
