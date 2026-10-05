# 🎓 Lost & Found Portal - College Campus Platform

A modern, production-ready web application designed for college campuses to report lost and found belongings, search existing listings with real-time filters, safely contact finders/owners with privacy controls, and mark items as returned/resolved.

---

## 🌟 Key Features

1. **User Authentication & Session Security**:
   - Secure registration & login with **bcrypt** password encryption (passwords are never stored in plain text and never exposed in API responses).
   - Stateless **JWT (JSON Web Token)** authentication stored in client-side storage for session persistence.
   - Protected API endpoints with server-side authorization middleware.

2. **Dedicated Reporting Forms**:
   - **Report Lost Item**: Capture item name, category, campus zone/location, date lost, detailed description, and optional photo.
   - **Report Found Item**: Post recovered belongings with location, date found, safekeeping details, and photo upload.

3. **Photo Upload Pipeline**:
   - **Multer** file handling with file type filtering (JPEG, JPG, PNG, WEBP) and 5MB size limit validation.
   - Images stored in local server directory (`backend/uploads/`) and served statically.

4. **Instant Keyword Search & Campus Zone Filtering**:
   - Real-time search by title, description, and keywords.
   - Filter by Item Type (`Lost` / `Found`), Category, Campus Location, and Status (`Active` / `Resolved`).
   - Campus zones include Central Library, Computer Lab 2, Main Canteen, Sports Ground, Main Auditorium, Campus Main Gate, Academic Blocks, and Hostels.

5. **Student Contact Privacy Protection**:
   - **Spam Prevention**: Personal phone numbers and direct contact links are **hidden from public visitors** and exposed **only to authenticated students**.
   - Authenticated students can call or initiate a WhatsApp chat with a single click.

6. **Post Management ("My Posts")**:
   - Logged-in students can view all their active and resolved submissions.
   - **Status Toggle**: Mark items as `Resolved` once returned, or reopen them.
   - **Edit & Delete**: Full CRUD with strict backend ownership verification (`item.postedBy === req.user._id`).

7. **Modern Responsive Design**:
   - Built with HTML5, CSS3 (Vanilla CSS design system), and vanilla JavaScript.
   - Responsive layouts optimized for desktop, tablet, and mobile screens.
   - Deep navy glassmorphism aesthetic with cyan/blue accents matching the presentation slides.

---

## 📂 Project Structure

```text
lost-found-portal/
├── frontend/
│   ├── index.html            # Campus Landing Page with live counters & feed
│   ├── login.html            # Student Login with demo auto-fill buttons
│   ├── signup.html           # Account Registration with privacy notices
│   ├── dashboard.html        # Student Hub & Personal Metrics
│   ├── report-lost.html      # Report Lost Belonging Form
│   ├── report-found.html     # Report Found Belonging Form
│   ├── search.html           # Real-time Search & Filter Portal
│   ├── item-details.html     # Full Item View with Privacy-Guarded Contact
│   ├── my-posts.html         # Post Management, Edit Modal, & Resolve Toggle
│   ├── profile.html          # Student Profile & Account Details
│   ├── css/
│   │   ├── style.css         # Design tokens, typography, & layout grid
│   │   ├── components.css    # Cards, badges, buttons, modals, & toasts
│   │   └── responsive.css    # Breakpoints for mobile, tablet, and desktop
│   └── js/
│       ├── api.js            # Centralized API fetch wrapper & JWT handling
│       ├── auth.js           # Auth state, login/signup handlers, redirects
│       ├── navbar.js         # Dynamic navigation & mobile drawer
│       ├── toast.js          # Animated toast notifications
│       ├── items.js          # Item cards, search queries, & details view
│       ├── forms.js          # Form validation, drag-and-drop & photo preview
│       ├── my-posts.js       # Post editing, resolution toggle, & deletion
│       └── main.js           # Counters animation & landing page logic
│
├── backend/
│   ├── server.js             # Express app entry, static serving & error handler
│   ├── seed.js               # Database seeder with realistic campus belongings
│   ├── config/
│   │   └── db.js             # MongoDB connection handler with persistent fallback
│   ├── controllers/
│   │   ├── authController.js # Signup, Login, Me, UpdateProfile
│   │   └── itemController.js # Create, Read, Update, Delete, Resolve, Stats
│   ├── middleware/
│   │   ├── auth.js           # JWT verification & optionalAuth for privacy
│   │   └── upload.js         # Multer configuration and file validation
│   ├── models/
│   │   ├── User.js           # Mongoose User Schema
│   │   ├── Item.js           # Mongoose Item Schema
│   │   ├── dbAdapter.js      # Robust Mongoose adapter & local persistence layer
│   │   └── index.js          # Model exports
│   ├── routes/
│   │   ├── authRoutes.js     # /api/auth routes
│   │   └── itemRoutes.js     # /api/items routes
│   ├── data/                 # Local persistent storage (backend/data/db.json)
│   └── uploads/              # Uploaded photographs directory
│
├── test/
│   └── test-suite.js         # Automated 23-point end-to-end test suite
├── .env                      # Environment configuration
├── .env.example              # Example environment configuration
├── .gitignore                # Ignored files (node_modules, uploads, .env)
├── package.json              # Project scripts & dependencies
└── README.md                 # Documentation
```

---

## ⚙️ Installation & Setup Instructions

### 1. Prerequisites
- **Node.js**: v18.x or newer (tested on v24.x)
- **npm**: v9.x or newer

### 2. Clone / Open Project
Navigate to the project root:
```bash
cd lost-found-portal
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env` configuration:
```env
PORT=5000
MONGODB_URI=
JWT_SECRET=super_secret_lost_found_campus_jwt_key_2026_xyz!
NODE_ENV=development
```

> **Note on MongoDB**:
> - If `MONGODB_URI` is left blank, the portal operates in **Local Schema Persistence Mode** using `backend/data/db.json`, requiring **zero database configuration** to run and test immediately.
> - To connect to **MongoDB Atlas** or a local MongoDB service, simply provide the connection string in `.env`:
>   ```env
>   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/lost_found?retryWrites=true&w=majority
>   ```

### 5. Seed Demo Campus Items (Optional but Recommended)
Populate realistic campus items (ID cards, Casio calculators, water bottles, chargers):
```bash
npm run seed
```

---

## 🚀 Running the Application

### Start Development Server
```bash
npm start
```
or
```bash
node backend/server.js
```

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🧪 Running the Automated Test Suite

A comprehensive 23-point automated test suite verifies all system requirements:
- Server and database connection handling
- User signup and bcrypt password hashing
- Duplicate email prevention
- User login with token generation
- Password safety (passwords never exposed in API responses)
- JWT protected routes (`/api/auth/me`)
- Creating lost items
- Creating found items with **Multer** photo upload
- Real database keyword search
- Filtering by type (`Lost`/`Found`)
- Filtering by campus location
- Contact privacy enforcement (unauthenticated users cannot view phone numbers)
- Authenticated contact reveal
- User's "My Posts" retrieval
- Marking items as `Resolved`
- **Ownership security**: Unauthorized edit, delete, and resolve attempts are blocked with `403 Forbidden`
- Authorized post update and deletion

Run the test suite with:
```bash
npm test
```

---

## 📡 REST API Reference

### Authentication Endpoints (`/api/auth`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Public | Register new campus user (`name`, `email`, `password`, `phone`). Returns JWT. |
| `POST` | `/api/auth/login` | Public | Authenticate user with email and password. Returns JWT. |
| `GET` | `/api/auth/me` | Protected | Fetch current logged-in user details. |
| `PUT` | `/api/auth/profile` | Protected | Update current user's name and phone number. |

### Item Endpoints (`/api/items`)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/items/stats/summary` | Public | Summary statistics (total lost, found, resolved, active). |
| `GET` | `/api/items` | Public | Browse items with query filters (`search`, `type`, `category`, `location`, `status`, `sort`, `page`, `limit`). |
| `GET` | `/api/items/:id` | Public / Optional Auth | Item details. Unauthenticated view redacts contact phone/email for privacy. |
| `POST` | `/api/items` | Protected | Create a new lost or found item. Accepts multipart form-data with optional/required `image`. |
| `PUT` | `/api/items/:id` | Protected (Owner only) | Update item details or replace photo. Enforces backend ownership check. |
| `DELETE` | `/api/items/:id` | Protected (Owner only) | Delete post and unlinks uploaded photo from disk. Enforces backend ownership. |
| `PATCH` | `/api/items/:id/resolve` | Protected (Owner only) | Toggle or set item status to `Resolved` or `Active`. |
| `GET` | `/api/items/user/my-posts` | Protected | Retrieve all posts authored by the logged-in user. |

---

## 👥 Demo Accounts

The database comes pre-seeded with sample campus accounts for quick demonstration:

| Name | Role | Email | Password |
|---|---|---|---|
| **Rohan Sharma** | Student | `rohan@campus.edu` | `password123` |
| **Priya Sharma** | Student | `priya.sharma@campus.edu` | `password123` |
| **Rahul Verma** | Student | `rahul.verma@campus.edu` | `password123` |

*Note: Quick demo buttons are provided on `login.html` to auto-fill credentials with one click.*

---

## 🚢 Deployment Preparation

1. **MongoDB Atlas**:
   - Create a free cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
   - Add your cluster connection string to `.env` as `MONGODB_URI`.
2. **Production Hosting**:
   - Can be hosted on platforms such as **Render**, **Railway**, **AWS EC2**, or **Heroku**.
   - Set environment variables `PORT`, `MONGODB_URI`, and `JWT_SECRET` in your hosting dashboard.
   - For cloud image persistence across server restarts, images can be mirrored to AWS S3 or Cloudinary.

---

## 📜 Credits & License

- **Project Specification**: College Campus Lost & Found System
- **License**: MIT
#   L o s t _ f o u n d - p o r t a l  
 