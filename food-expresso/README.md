# 🍲 Food Waste Management & Donation System - Frontend

React + Vite frontend for the Food Donation System. Fully integrated with Spring Boot backend.

## 📋 Features

- **Role-Based Login**: Admin, Donor, NGO
- **Admin Dashboard**: Approve/Reject donation requests
- **Donor Dashboard**: Post food items for donation
- **NGO Dashboard**: View available foods and request donations
- **Real-time API Integration**: Axios for backend communication
- **Responsive UI**: Clean and minimal design

## 🚀 Quick Start

### Prerequisites

- Node.js (v16+)
- Spring Boot backend running at `http://localhost:8086`

### Installation

1. **Navigate to project directory:**
   ```bash
   cd food-don
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   ```
   http://localhost:5173
   ```

## 📁 Project Structure

```
food-don/
├── src/
│   ├── pages/
│   │   ├── Login.jsx           # Login page with role selection
│   │   ├── AdminDashboard.jsx  # Admin request approval panel
│   │   ├── DonorDashboard.jsx  # Donor food posting panel
│   │   └── NgoDashboard.jsx    # NGO food request panel
│   ├── components/
│   │   └── Navbar.jsx          # Navigation bar with user info
│   ├── services/
│   │   └── api.js              # Axios API service
│   ├── App.jsx                 # Main app router
│   ├── main.jsx                # React entry point
│   └── index.css               # Global styles
├── index.html                  # HTML template
├── package.json                # Dependencies
├── vite.config.js              # Vite configuration
├── .env                        # Environment variables
└── .gitignore                  # Git ignore file
```

## 🔑 Login Credentials

Use test users from your backend:

| Email | Role | Password |
|-------|------|----------|
| admin@example.com | ADMIN | (from backend) |
| donor@example.com | DONOR | (from backend) |
| ngo@example.com | NGO | (from backend) |

**Note**: The login matches email + role. Fetch users from `GET /users` endpoint.

## 🎯 Functionality

### Admin Panel (`/admin`)
- View all donation requests
- Approve requests to mark food as CLAIMED
- Request status: PENDING → APPROVED → CLAIMED

### Donor Panel (`/donor`)
- Add new food items (title, quantity, location, expiry date)
- View personal food listings
- Delete food items (only if AVAILABLE)
- Track food status: AVAILABLE → CLAIMED

### NGO Panel (`/ngo`)
- Browse all AVAILABLE foods
- Request specific foods
- View my request history
- Track request status: PENDING → APPROVED

## 🔌 API Endpoints

### Users
```
GET    /users              - Get all users
POST   /users              - Create user
GET    /users/{id}         - Get user by ID
PUT    /users/{id}         - Update user profile
DELETE /users/{id}         - Delete user
```

### Food
```
POST   /foods              - Add food (Donor)
GET    /foods              - Get all foods
GET    /foods/available    - Get AVAILABLE foods (NGO)
GET    /foods/donor/{id}   - Get foods by donor
DELETE /foods/{id}         - Delete food (Donor)
```

### Requests
```
POST   /requests           - Create request (NGO)
GET    /requests           - Get all requests (Admin)
GET    /requests/ngo/{id}  - Get requests by NGO
PUT    /requests/approve/{id} - Approve request (Admin)
```

### Analytics
```
GET    /analytics          - Get system analytics
```

## 🛠️ Build for Production

```bash
npm run build
npm run preview
```

## 📝 Technologies Used

- **React 18**: UI framework
- **Vite**: Build tool
- **React Router v6**: Navigation
- **Axios**: HTTP client
- **CSS-in-JS**: Inline styles

## 🔐 Local Storage

User data is stored in `localStorage`:
```javascript
{
  "id": 1,
  "name": "Admin User",
  "email": "admin@example.com",
  "role": "ADMIN",
  "phone": "1234567890",
  "address": "123 Main St",
  "createdAt": "2024-01-15T10:30:00"
}
```

## 🚨 Troubleshooting

### Backend not connecting?
- Verify Spring Boot is running at `http://localhost:8086`
- Check browser console for CORS errors
- Ensure backend `@CrossOrigin` is configured

### Login fails?
- Verify test users exist in backend database
- Check email matches exactly (case-sensitive)
- Verify role value matches (ADMIN, DONOR, NGO)

### Styles not loading?
- Hard refresh browser (Ctrl+F5)
- Clear cache if using DevTools

## 📞 Support

For issues:
1. Check backend logs for API errors
2. Check browser console for client errors
3. Verify database connection
4. Test API endpoints with Postman

## ✅ Today's Updates (2026-04-06)

This section records the major changes completed today.

### Profile & Navbar

- Added dedicated Profile page route: `/profile`
- Moved logout behavior to Profile tab (removed from dashboard views)
- Redesigned profile UI with cleaner alignment and unified edit mode
- One single edit flow now updates:
   - Name
   - Email
   - Phone
   - NGO Description
   - Address/Location
- Removed role display from Profile view
- Added NGO description display from backend user data
- Added NGO description edit/save support from Profile

### NGO fixed location

- Moved NGO fixed-location management from NGO dashboard to Profile tab
- Added Set/Change/Clear fixed-location controls in Profile
- Kept route guidance behavior in NGO available-food cards using saved fixed location

### NGO Dashboard

- Available foods now sorted by newest first (recently added on top)
- Replaced plain requests table with richer request cards
- Removed request ID display in NGO request cards
- Added donor and request food detail layout
- Added resilient fallback loading for food details when one food endpoint fails
- Added support to render food images in NGO cards when backend provides image fields

### Admin Dashboard

- Simplified heavy request-card UI to lighter, cleaner aligned request rows
- Kept all important request, NGO, and timeline information visible

### Donor Dashboard

- Added food image upload option in add-food form (`.jpg`, `.jpeg`, `.png`)
- Added image validation (type + size) and preview before submit
- Added image rendering on donor food cards
- Demo-safe storage currently uses localStorage mapping by food ID

### API service

- Added `updateUser(id, user)` helper for profile updates

### Backend image persistence notes

- Added dedicated implementation note file:
   - `IMAGE_BACKEND_DB_CHANGES.md`
- This file documents DB schema and Spring changes needed for true cross-user image visibility.

---

**Built with ❤️ for Food Donation System**
