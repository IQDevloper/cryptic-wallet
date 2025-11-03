# 🚀 Admin Dashboard - Quick Start Guide

## TL;DR

You need **2 separate dashboards** that don't conflict:

```
✅ Merchant Dashboard: /dashboard/*  → For merchants (MERCHANT role)
✅ Admin Dashboard: /admin/*         → For admins (ADMIN role)
```

---

## Quick Implementation (30 minutes)

### Step 1: Update Procedures (5 min)

Add admin procedure to `src/lib/trpc/procedures.ts`:

```typescript
export const adminProcedure = baseProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user?.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not logged in' });
  }

  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.session.user.userId },
  });

  if (!user || user.role !== 'ADMIN') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }

  return next({ ctx: { ...ctx, user } });
});
```

### Step 2: Create Admin Router (10 min)

Create `src/lib/trpc/routers/admin.ts`:

```typescript
import { createTRPCRouter, adminProcedure } from '../procedures';
import { z } from 'zod';

export const adminRouter = createTRPCRouter({
  // Get system stats
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [totalMerchants, totalTransactions, totalInvoices] = await Promise.all([
      ctx.prisma.merchant.count(),
      ctx.prisma.transaction.count(),
      ctx.prisma.invoice.count(),
    ]);

    return { totalMerchants, totalTransactions, totalInvoices };
  }),

  // List all coins
  listCoins: adminProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.asset.findMany({
      include: {
        assetOnNetworks: {
          include: { network: true },
        },
      },
    });
  }),

  // List all transactions
  listTransactions: adminProcedure
    .input(z.object({ page: z.number().default(1), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;
      const transactions = await ctx.prisma.transaction.findMany({
        include: {
          invoice: {
            include: {
              merchant: { select: { name: true, businessName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: input.limit,
      });
      return transactions;
    }),
});
```

Add to `src/lib/trpc/routers/index.ts`:

```typescript
import { adminRouter } from './admin';

export const appRouter = createTRPCRouter({
  auth: authRouter,
  merchant: merchantRouter,
  invoice: invoiceRouter,
  admin: adminRouter,  // ← Add this
});
```

### Step 3: Create Admin Layout (10 min)

Create `src/app/admin/layout.tsx`:

```typescript
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import Link from 'next/link';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();

  // Redirect if not logged in
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/admin');
  }

  // Redirect if not admin
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8">Admin Panel</h1>
        <nav className="space-y-2">
          <Link href="/admin" className="block py-2 px-4 rounded hover:bg-gray-800">
            Dashboard
          </Link>
          <Link href="/admin/coins" className="block py-2 px-4 rounded hover:bg-gray-800">
            Coins
          </Link>
          <Link href="/admin/transactions" className="block py-2 px-4 rounded hover:bg-gray-800">
            Transactions
          </Link>
          <Link href="/admin/merchants" className="block py-2 px-4 rounded hover:bg-gray-800">
            Merchants
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto p-8 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
```

### Step 4: Create Admin Home Page (5 min)

Create `src/app/admin/page.tsx`:

```typescript
'use client';

import { trpc } from '@/lib/trpc/client';

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.admin.getStats.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Merchants</h3>
          <p className="text-3xl font-bold">{stats?.totalMerchants || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Transactions</h3>
          <p className="text-3xl font-bold">{stats?.totalTransactions || 0}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-gray-500 text-sm">Total Invoices</h3>
          <p className="text-3xl font-bold">{stats?.totalInvoices || 0}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ No Conflicts!

### Why They Don't Conflict:

1. **Different URLs**:
   - Merchant: `/dashboard/*`
   - Admin: `/admin/*`

2. **Different Layouts**:
   - Merchant: `src/app/dashboard/layout.tsx`
   - Admin: `src/app/admin/layout.tsx`

3. **Different Auth Checks**:
   - Merchant: `userOwnsMerchantProcedure` (checks MERCHANT role)
   - Admin: `adminProcedure` (checks ADMIN role)

4. **Different tRPC Routers**:
   - Merchant: `trpc.merchant.*`
   - Admin: `trpc.admin.*`

---

## 🧪 Testing

### 1. Create Admin User

```sql
-- In your database
UPDATE users
SET role = 'ADMIN'
WHERE email = 'your-email@example.com';
```

### 2. Login and Test

```bash
# Login as admin user
# Navigate to: http://localhost:3000/admin

# You should see:
✅ Admin Dashboard
✅ System statistics
✅ Admin sidebar
```

### 3. Test Non-Admin

```bash
# Login as merchant user
# Try to access: http://localhost:3000/admin

# You should be:
✅ Redirected to /dashboard
```

---

## 📊 Feature Roadmap

### Phase 1: Core (This Week) ✅
- [x] Admin authentication
- [x] Admin layout
- [x] System statistics
- [ ] Coin list page

### Phase 2: Coin Management (Next Week)
- [ ] Add coin page (integrate AI tool)
- [ ] Edit coin page
- [ ] Toggle coin status
- [ ] Coin statistics

### Phase 3: Monitoring
- [ ] Transaction monitoring
- [ ] Merchant management
- [ ] User management
- [ ] Audit logs

---

## 💡 Key Benefits

### For You (Admin):
```
✅ Manage all coins from UI
✅ Monitor all transactions
✅ View all merchants
✅ System health monitoring
✅ No code changes needed to add coins
```

### For Merchants:
```
✅ Simple interface
✅ Only see their data
✅ No confusion
✅ Professional dashboard
```

### No Conflicts Because:
```
✅ Separate URLs (/admin vs /dashboard)
✅ Separate auth (ADMIN vs MERCHANT)
✅ Separate layouts
✅ Separate tRPC routers
✅ Separate components
```

---

## 🎯 What to Build Next?

### Option 1: Coin Management (Recommended)
```
Admin can:
- View all coins
- Add new coins via AI tool
- Edit coin details
- Enable/disable coins
```

### Option 2: Transaction Monitoring
```
Admin can:
- View all transactions
- Filter by merchant/coin/status
- See transaction details
- Export to CSV
```

### Option 3: Merchant Management
```
Admin can:
- View all merchants
- Approve/suspend merchants
- View merchant balances
- See merchant activity
```

---

## 📚 Full Documentation

- **Architecture**: `ADMIN_DASHBOARD_ARCHITECTURE.md` (complete guide)
- **This File**: Quick start (30 minutes)

---

**Ready to implement?** Start with Step 1! 🚀

The admin and merchant dashboards will work side-by-side with zero conflicts! ✨
