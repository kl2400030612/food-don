# 🚀 SETUP GUIDE - Food Donation Frontend

## Step 1: Install Dependencies

Open PowerShell/Terminal in the `food-don` directory and run:

```bash
npm install
```

This installs:
- react (UI framework)
- react-dom (React rendering)
- react-router-dom (Navigation)
- axios (HTTP client)
- @vitejs/plugin-react (React plugin for Vite)
- vite (Build tool)

**Time**: ~2-3 minutes

---

## Step 2: Configure Backend URL

The backend URL is already set to `http://localhost:8086` in:
- `src/services/api.js` (Line 3: `baseURL: 'http://localhost:8086'`)

✅ **No changes needed if backend runs on default port.**

---

## Step 3: Start Development Server

```bash
npm run dev
```

Expected output:
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

Visit: **http://localhost:5173**

---

## Step 4: Test Login

Use credentials from your backend:

1. Email: `admin@example.com` | Role: `ADMIN`
2. Email: `donor@example.com` | Role: `DONOR`
3. Email: `ngo@example.com` | Role: `NGO`

The frontend fetches users from `GET /users` and matches email + role.

---

## Step 5: Test Each Role

### Admin Flow:
1. Login as ADMIN
2. View requests at `/admin`
3. Click "✓ Approve" to approve pending requests

### Donor Flow:
1. Login as DONOR
2. Click "+ Add Food" at `/donor`
3. Fill in food details (title, quantity, location, expiry date)
4. Submit form
5. View your food items
6. Delete if needed

### NGO Flow:
1. Login as NGO
2. Go to "Available Foods" tab at `/ngo`
3. Browse available foods from donors
4. Click "🙏 Request Food"
5. Go to "My Requests" tab to track status

---

## File Reference

| File | Purpose |
|------|---------|
| `src/main.jsx` | React entry point |
| `src/App.jsx` | Route configuration |
| `src/pages/Login.jsx` | Login form with role selection |
| `src/pages/AdminDashboard.jsx` | Admin request approval |
| `src/pages/DonorDashboard.jsx` | Donor food posting |
| `src/pages/NgoDashboard.jsx` | NGO food browsing |
| `src/components/Navbar.jsx` | Top navigation bar |
| `src/services/api.js` | Axios API wrapper |
| `src/index.css` | Global CSS |
| `vite.config.js` | Vite build config |
| `.env` | Environment variables |

---

## API Service Functions

All in `src/services/api.js`:

```javascript
// Users
getUsers()                      // GET /users
createUser(user)                // POST /users
getUser(id)                     // GET /users/{id}
deleteUser(id)                  // DELETE /users/{id}

// Food
createFood(food)                // POST /foods
getFoods()                      // GET /foods
getAvailableFoods()             // GET /foods/available
getFoodsByDonor(donorId)        // GET /foods/donor/{id}
deleteFood(id)                  // DELETE /foods/{id}

// Requests
createRequest(request)          // POST /requests
getRequests()                   // GET /requests
getRequestsByNgo(ngoId)         // GET /requests/ngo/{id}
approveRequest(id)              // PUT /requests/approve/{id}

// Analytics
getAnalytics()                  // GET /analytics
```

---

## Common Issues & Fixes

### ❌ "Error connecting to backend"
**Cause**: Spring Boot backend not running
**Fix**: Start backend at `http://localhost:8086`

### ❌ "Invalid email or role. User not found."
**Cause**: User doesn't exist or role mismatch
**Fix**: Verify test users in backend database

### ❌ "Cannot find module react"
**Cause**: Dependencies not installed
**Fix**: Run `npm install`

### ❌ CORS error in console
**Cause**: Backend CORS not configured
**Fix**: Add to Spring Boot controller:
```java
@CrossOrigin(origins = "http://localhost:5173")
```

---

## Build for Production

```bash
npm run build
```

Outputs optimized files to `dist/` folder.

To preview production build:

```bash
npm run preview
```

---

## Key Features Implemented ✅

✅ Role-based login (ADMIN, DONOR, NGO)
✅ Admin request approval system
✅ Donor food posting/deletion
✅ NGO food browsing/requesting
✅ localStorage for user persistence
✅ Error handling
✅ Loading states
✅ Responsive design
✅ All backend APIs integrated
✅ Tab navigation for NGO panel

---

## Next Steps

1. ✅ Backend running at http://localhost:8086
2. ✅ Dependencies installed (`npm install`)
3. ✅ Development server running (`npm run dev`)
4. ✅ Frontend accessible at http://localhost:5173
5. ✅ Test all three roles
6. ✅ Test donation flow: Donor adds food → NGO requests → Admin approves

---

## Need Help?

1. Check browser console (`F12`)
2. Check Spring Boot logs
3. Test API endpoints with Postman
4. Verify all test users exist in database

---

**✨ Your frontend is ready! Start the development server and begin testing.**
