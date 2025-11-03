# 🧪 Admin Dashboard - Testing Guide

## ✅ What Was Implemented

### Backend:
1. ✅ **Admin Procedure** (`src/lib/trpc/procedures.ts`)
   - Checks user authentication
   - Verifies ADMIN role
   - Blocks non-admins

2. ✅ **Admin Router** (`src/lib/trpc/routers/admin.ts`)
   - `getSystemStats` - System statistics
   - `listAssets` - List all coins/tokens
   - `toggleAssetStatus` - Enable/disable coins
   - `listAllTransactions` - All transactions
   - `listAllMerchants` - All merchants
   - `toggleMerchantStatus` - Enable/disable merchants
   - `listAllUsers` - All users
   - `updateUserRole` - Change user roles

3. ✅ **Router Integration** (`src/lib/trpc/server.ts`)
   - Admin router added to main appRouter

### Frontend:
4. ✅ **Admin Layout** (`src/app/admin/layout.tsx`)
   - Server-side authentication check
   - Redirects non-admins to merchant dashboard
   - Redirects unauthenticated to login

5. ✅ **Admin Sidebar** (`src/components/admin/admin-sidebar.tsx`)
   - Navigation menu
   - Quick link to merchant dashboard

6. ✅ **Admin Header** (`src/components/admin/admin-header.tsx`)
   - User info display
   - Search bar
   - Notifications
   - Logout button

7. ✅ **Admin Home** (`src/app/admin/page.tsx`)
   - System statistics dashboard
   - Merchant, transaction, invoice stats
   - Quick action links

8. ✅ **Coins List** (`src/app/admin/coins/page.tsx`)
   - List all coins/tokens
   - Search and filter
   - Enable/disable coins
   - Add coin link

---

## 🚀 Testing Steps

### Step 1: Create Admin User

Run this in your database or Prisma Studio:

```sql
-- Update existing user to admin
UPDATE users
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

Or using Prisma Studio:
```bash
npx prisma studio

# Navigate to users table
# Find your user
# Change role to 'ADMIN'
# Save
```

### Step 2: Start Development Server

```bash
npm run dev
```

### Step 3: Login as Admin

```
1. Open http://localhost:3000/auth/login
2. Login with your admin user credentials
3. Navigate to http://localhost:3000/admin
```

### Step 4: Test Admin Dashboard

#### ✅ Test Authentication:
```
1. Navigate to http://localhost:3000/admin
2. Should see admin dashboard (not redirected)
3. Logout
4. Try accessing /admin again
5. Should redirect to /auth/login?callbackUrl=/admin
```

#### ✅ Test Non-Admin Access:
```
1. Create or login as a regular merchant user
2. Try accessing http://localhost:3000/admin
3. Should redirect to /dashboard (merchant dashboard)
4. Should see "Admin access required" or be redirected
```

#### ✅ Test System Statistics:
```
1. Navigate to http://localhost:3000/admin
2. Should see cards with:
   - Total Merchants
   - Total Transactions
   - Total Invoices
   - Total Users
   - Total Assets
3. Numbers should match database
```

#### ✅ Test Coins Management:
```
1. Navigate to http://localhost:3000/admin/coins
2. Should see list of all coins
3. Test search (type "BTC" or "ETH")
4. Test filter (Active/Inactive/All)
5. Test enable/disable toggle
6. Click "Add Coin" (will create this page later)
```

---

## 🎯 Expected Results

### URLs and Access:

| URL | Admin User | Merchant User | Not Logged In |
|-----|-----------|---------------|---------------|
| `/admin` | ✅ Access granted | ❌ Redirect to `/dashboard` | ❌ Redirect to `/auth/login` |
| `/admin/coins` | ✅ Access granted | ❌ Redirect to `/dashboard` | ❌ Redirect to `/auth/login` |
| `/dashboard` | ✅ Access granted | ✅ Access granted | ❌ Redirect to `/auth/login` |

### tRPC Calls:

| Endpoint | Admin User | Merchant User |
|----------|-----------|---------------|
| `trpc.admin.getSystemStats` | ✅ Returns data | ❌ "Admin access required" |
| `trpc.admin.listAssets` | ✅ Returns all coins | ❌ "Admin access required" |
| `trpc.merchant.getBalances` | ✅ Returns data | ✅ Returns data |

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@/lib/auth'"

**Solution**: Check that your auth setup exists at `src/lib/auth.ts` or update the import in `layout.tsx`

### Issue: "Cannot find module '@/lib/prisma'"

**Solution**: Check that prisma is exported properly:
```typescript
// src/lib/prisma.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

### Issue: "User role check not working"

**Solution**:
1. Verify user has ADMIN role in database
2. Check session is being passed correctly
3. Verify JWT token includes userId

### Issue: "Admin page shows loading forever"

**Solution**:
1. Check browser console for errors
2. Verify tRPC is configured correctly
3. Check that admin router is exported and included in appRouter

---

## 📊 Test Scenarios

### Scenario 1: Admin Login Flow
```
1. Start logged out
2. Go to /admin
3. Redirected to /auth/login?callbackUrl=/admin
4. Login with admin credentials
5. Redirected to /admin
6. See admin dashboard with stats
✅ PASS
```

### Scenario 2: Non-Admin Blocked
```
1. Login as merchant user
2. Go to /admin
3. Redirected to /dashboard
4. Try calling trpc.admin.getSystemStats via browser console
5. Error: "Admin access required"
✅ PASS
```

### Scenario 3: Admin Can Access Merchant Dashboard
```
1. Login as admin user
2. Go to /admin
3. See admin dashboard
4. Click "Merchant Dashboard" in sidebar
5. Go to /dashboard
6. See merchant dashboard
7. Can access both dashboards
✅ PASS
```

### Scenario 4: Coin Management
```
1. Login as admin user
2. Go to /admin/coins
3. See list of coins
4. Search for "BTC"
5. See only Bitcoin
6. Clear search
7. Toggle a coin active/inactive
8. Confirm action
9. See status updated
✅ PASS
```

---

## 🎉 Success Checklist

- [ ] Admin user created in database
- [ ] Can access /admin as admin
- [ ] Non-admin cannot access /admin
- [ ] System statistics showing correctly
- [ ] Coins list page works
- [ ] Search and filter work
- [ ] Enable/disable coins works
- [ ] Sidebar navigation works
- [ ] Header shows user info
- [ ] Logout works
- [ ] Can switch between admin and merchant dashboards

---

## 📝 Next Steps

After testing is complete, you can add:

1. **Add Coin Page** (`/admin/coins/add`)
   - Integrate the AI coin tool
   - Form to manually add coins

2. **Transactions Page** (`/admin/transactions`)
   - View all transactions
   - Filter by merchant, status, date

3. **Merchants Page** (`/admin/merchants`)
   - View all merchants
   - Approve/suspend merchants
   - View merchant details

4. **Users Page** (`/admin/users`)
   - View all users
   - Change user roles
   - Ban/unban users

---

## 🔍 Verification Commands

```bash
# Check if admin router is registered
npm run dev
# Open browser console
# Type: window.__NEXT_DATA__.props.pageProps.trpcState.queries
# Should see admin queries

# Check database for admin user
npx prisma studio
# Navigate to users table
# Verify role = 'ADMIN'

# Test API directly
curl -X POST http://localhost:3000/api/trpc/admin.getSystemStats \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
# Should return stats or auth error
```

---

**Admin Dashboard is ready to test!** 🎉

Start by creating an admin user and accessing http://localhost:3000/admin
