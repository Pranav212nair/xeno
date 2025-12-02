# Testing Guide - Xeno Marketing Platform

## Prerequisites
- Backend server running on `http://localhost:3000`
- Modern web browser (Chrome, Firefox, Edge)

## Test Credentials
- **Email**: admin@acme.com
- **Password**: password123

## Testing Steps

### 1. Start Backend Server (if not already running)
```powershell
cd backend
npm start
```

Server should start on `http://localhost:3000`

### 2. Test Backend API Health Check
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/health" -UseBasicParsing
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "database": "connected",
  "version": "2.0.0"
}
```

### 3. Test Login API
```powershell
$body = @{ email = "admin@acme.com"; password = "password123" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
```

Expected: JWT token and user object returned

### 4. Open Frontend Login Page

**Option A - Using File Protocol:**
Open in browser: `file:///C:/Users/Pranav Nair/OneDrive/Desktop/xeno/homepage/login.html`

**Option B - Using Live Server (Recommended):**
1. Install VS Code extension: "Live Server" by Ritwick Dey
2. Right-click on `homepage/login.html`
3. Select "Open with Live Server"

### 5. Test Login Flow

1. **Navigate to Login Page**
   - Enter email: `admin@acme.com`
   - Enter password: `password123`
   - Click "Sign in"

2. **Expected Behavior**:
   - Button shows "Signing in..."
   - Success message appears
   - Redirect to dashboard (index.html)
   - Dashboard loads with real data from API

3. **Verify Data**:
   - KPI cards show: ₹12.50L revenue, 1 active campaign
   - Campaign table shows 2 campaigns (WhatsApp, Email)
   - Lifecycle shows: 1 new, 2 active, 0 at-risk, 0 churned
   - Segments show: "High-Value VIPs" (8,240), "At-Risk Customers" (7,850)
   - Journey shows: "Welcome Journey" (3,240 enrolled, 42% conversion)

### 6. Test Registration Flow

1. **Navigate to Signup Page**
   - Click "Sign up" link on login page
   - Or open: `file:///C:/Users/Pranav Nair/OneDrive/Desktop/xeno/homepage/signup.html`

2. **Fill Registration Form**:
   - First Name: `Test`
   - Last Name: `User`
   - Company: `Test Company`
   - Email: `test@example.com`
   - Password: `password123`
   - Check terms checkbox
   - Click "Create account"

3. **Expected Behavior**:
   - Button shows "Creating account..."
   - Success message appears
   - Redirect to dashboard
   - New tenant and user created in database

### 7. Test Logout

1. Click on user avatar (top-right)
2. Click "Logout"
3. Confirm logout
4. Should redirect to login page
5. Try accessing dashboard directly - should redirect to login

## Known Limitations

### CORS Issues with File Protocol
If testing with `file://` protocol, you may encounter CORS errors because:
- Browsers block cross-origin requests from `file://` to `http://localhost:3000`

**Solutions**:

1. **Use Live Server Extension (Recommended)**:
   - Serves files on `http://127.0.0.1:5500`
   - No CORS issues
   - Hot reload on file changes

2. **Temporarily Disable CORS** (Development Only):
   - Chrome: Launch with `--disable-web-security --user-data-dir="C:/temp/chrome-dev"`
   - NOT recommended for production

3. **Serve Frontend from Backend** (Production Approach):
   ```javascript
   // In backend/server.js (add after other middleware)
   app.use(express.static(path.join(__dirname, '../homepage')));
   
   // Fallback route
   app.get('*', (req, res) => {
     res.sendFile(path.join(__dirname, '../homepage/index.html'));
   });
   ```

## API Endpoints Used by Frontend

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | User authentication |
| `/api/auth/register` | POST | New user/tenant registration |
| `/api/dashboard/stats?days=30` | GET | Dashboard KPIs and data |
| `/api/campaigns` | GET | List all campaigns |
| `/api/segments` | GET | List all segments |
| `/api/journeys` | GET | List all journeys |

## Troubleshooting

### 1. "Failed to fetch" Error
- **Cause**: Backend server not running or CORS issue
- **Fix**: Ensure backend is running on port 3000, use Live Server for frontend

### 2. "401 Unauthorized" Error
- **Cause**: Invalid or expired JWT token
- **Fix**: Logout and login again

### 3. Dashboard Shows No Data
- **Cause**: API call failed or returned empty data
- **Fix**: Check browser console for errors, verify backend is running

### 4. "Cannot read property of undefined" Error
- **Cause**: API response structure mismatch
- **Fix**: Check backend response format matches frontend expectations

## Database Verification

Check seeded data in database:
```powershell
cd backend
npx prisma studio
```

Opens GUI at `http://localhost:5555` to browse:
- Tenants (should have ACME Retail)
- Users (should have admin@acme.com)
- Customers (should have 3 customers)
- Campaigns (should have 2 campaigns)
- Segments (should have 2 segments)
- Journeys (should have 1 journey)

## Next Steps

After basic testing works:
1. Implement remaining CRUD operations (Edit/Delete campaigns)
2. Add Shopify OAuth flow
3. Implement real Shopify data sync
4. Add webhook handlers
5. Set up cron jobs for periodic sync
6. Deploy to production
