# 🛡️ Admin Dashboard Architecture

## Overview

You need **TWO separate dashboards** with different purposes and permissions:

### 1. **Merchant Dashboard** (Current)
- **URL**: `/dashboard/*`
- **Users**: Merchants (business owners)
- **Purpose**: Manage their own business
- **Access**: Only their own data

### 2. **Admin Dashboard** (New)
- **URL**: `/admin/*`
- **Users**: System administrators
- **Purpose**: Manage entire platform
- **Access**: All data across all merchants

---

## 📊 Architecture Comparison

```
┌─────────────────────────────────────────────────────────────┐
│                     YOUR SYSTEM                             │
│                                                             │
│  ┌────────────────────────┐  ┌────────────────────────┐   │
│  │  MERCHANT DASHBOARD    │  │   ADMIN DASHBOARD      │   │
│  │  /dashboard/*          │  │   /admin/*             │   │
│  │                        │  │                        │   │
│  │  - My Invoices         │  │  - All Invoices        │   │
│  │  - My Balance          │  │  - All Merchants       │   │
│  │  - My Withdrawals      │  │  - All Transactions    │   │
│  │  - My API Keys         │  │  - Coin Management     │   │
│  │  - My Settings         │  │  - System Stats        │   │
│  │                        │  │  - User Management     │   │
│  └────────────────────────┘  └────────────────────────┘   │
│           │                            │                    │
│           ▼                            ▼                    │
│  ┌────────────────────────┐  ┌────────────────────────┐   │
│  │  USER.role = MERCHANT  │  │  USER.role = ADMIN     │   │
│  └────────────────────────┘  └────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Admin Dashboard Features

### 1. **Coin Management (CRUD)**
```
✅ View all coins/tokens
✅ Add new coins (with AI tool)
✅ Edit coin details
✅ Enable/disable coins
✅ View coin statistics
```

### 2. **Transaction Monitoring**
```
✅ View all transactions across all merchants
✅ Filter by merchant, coin, status, date
✅ Transaction details
✅ Payment confirmations
✅ Failed transactions
```

### 3. **Merchant Management**
```
✅ View all merchants
✅ Approve/suspend merchants
✅ View merchant balances
✅ Merchant activity logs
✅ API key management
```

### 4. **System Monitoring**
```
✅ Total revenue
✅ Total transactions
✅ Active merchants
✅ System health
✅ Webhook status
✅ KMS wallet status
```

### 5. **User Management**
```
✅ View all users
✅ Assign roles (ADMIN, MERCHANT, OPERATOR)
✅ User activity logs
✅ Ban/unban users
```

---

## 🏗️ Implementation Structure

### Directory Structure

```
src/
├── app/
│   ├── dashboard/              # ← Merchant Dashboard (exists)
│   │   ├── merchants/
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── invoices/
│   │   │       ├── withdrawals/
│   │   │       └── settings/
│   │   └── layout.tsx
│   │
│   └── admin/                  # ← New Admin Dashboard
│       ├── layout.tsx          # Admin layout
│       ├── page.tsx            # Admin home
│       ├── coins/              # Coin management
│       │   ├── page.tsx        # List all coins
│       │   ├── add/
│       │   │   └── page.tsx    # Add new coin (AI tool)
│       │   └── [id]/
│       │       └── edit/
│       │           └── page.tsx # Edit coin
│       ├── transactions/       # All transactions
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx    # Transaction details
│       ├── merchants/          # Merchant management
│       │   ├── page.tsx        # List all merchants
│       │   └── [id]/
│       │       ├── page.tsx    # Merchant details
│       │       ├── invoices/
│       │       ├── transactions/
│       │       └── balances/
│       ├── users/              # User management
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       ├── system/             # System monitoring
│       │   ├── health/
│       │   ├── webhooks/
│       │   └── kms/
│       └── settings/           # Admin settings
│           └── page.tsx
│
├── lib/
│   └── trpc/
│       ├── routers/
│       │   ├── merchant.ts     # ← Merchant routes (exists)
│       │   └── admin.ts        # ← New Admin routes
│       └── procedures.ts       # ← Add adminProcedure
│
└── components/
    ├── dashboard/              # Merchant components
    └── admin/                  # Admin components
        ├── coin-table.tsx
        ├── transaction-table.tsx
        ├── merchant-table.tsx
        └── system-stats.tsx
```

---

## 🔐 Authentication & Authorization

### Update Prisma Schema

```prisma
// In schema.prisma - UserRole enum (already exists)
enum UserRole {
  ADMIN      // ← Can access /admin/*
  MERCHANT   // ← Can access /dashboard/*
  OPERATOR   // ← Limited admin access (view only)
}
```

### Create Admin Procedure

```typescript
// src/lib/trpc/procedures.ts

/**
 * Admin-only procedure
 * Requires user to have ADMIN role
 */
export const adminProcedure = baseProcedure.use(async ({ ctx, next }) => {
  // Check if user is authenticated
  if (!ctx.session?.user?.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }

  // Get user from database
  const user = await ctx.prisma.user.findUnique({
    where: { id: ctx.session.user.userId },
  });

  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'User not found',
    });
  }

  // Check if user is admin
  if (user.role !== 'ADMIN') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }

  // User is admin, proceed
  return next({
    ctx: {
      ...ctx,
      user,
    },
  });
});
```

---

## 📋 Admin tRPC Router

### Create Admin Router

```typescript
// src/lib/trpc/routers/admin.ts

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { createTRPCRouter, adminProcedure } from '../procedures';

export const adminRouter = createTRPCRouter({
  // ============================================
  // COIN MANAGEMENT
  // ============================================

  // List all coins
  listCoins: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};
      if (input.search) {
        where.OR = [
          { symbol: { contains: input.search, mode: 'insensitive' } },
          { name: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      const [assets, total] = await Promise.all([
        ctx.prisma.asset.findMany({
          where,
          include: {
            assetOnNetworks: {
              include: {
                network: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.asset.count({ where }),
      ]);

      return {
        assets,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  // Toggle coin active status
  toggleCoinStatus: adminProcedure
    .input(
      z.object({
        assetId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.asset.update({
        where: { id: input.assetId },
        data: { isActive: input.isActive },
      });
    }),

  // ============================================
  // TRANSACTION MONITORING
  // ============================================

  // List all transactions
  listAllTransactions: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(50),
        merchantId: z.string().optional(),
        status: z.enum(['PENDING', 'CONFIRMED', 'FAILED']).optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};
      if (input.merchantId) {
        where.invoice = { merchantId: input.merchantId };
      }
      if (input.status) {
        where.status = input.status;
      }
      if (input.startDate || input.endDate) {
        where.createdAt = {};
        if (input.startDate) where.createdAt.gte = new Date(input.startDate);
        if (input.endDate) where.createdAt.lte = new Date(input.endDate);
      }

      const [transactions, total] = await Promise.all([
        ctx.prisma.transaction.findMany({
          where,
          include: {
            invoice: {
              include: {
                merchant: {
                  select: {
                    id: true,
                    name: true,
                    businessName: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.transaction.count({ where }),
      ]);

      return {
        transactions,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  // ============================================
  // MERCHANT MANAGEMENT
  // ============================================

  // List all merchants
  listAllMerchants: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};
      if (input.search) {
        where.OR = [
          { name: { contains: input.search, mode: 'insensitive' } },
          { businessName: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      if (input.isActive !== undefined) {
        where.isActive = input.isActive;
      }

      const [merchants, total] = await Promise.all([
        ctx.prisma.merchant.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
            merchantWallets: {
              include: {
                assetNetwork: {
                  include: {
                    asset: true,
                    network: true,
                  },
                },
              },
            },
            _count: {
              select: {
                invoices: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.merchant.count({ where }),
      ]);

      return {
        merchants,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  // Toggle merchant status
  toggleMerchantStatus: adminProcedure
    .input(
      z.object({
        merchantId: z.string(),
        isActive: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.merchant.update({
        where: { id: input.merchantId },
        data: { isActive: input.isActive },
      });
    }),

  // ============================================
  // SYSTEM STATISTICS
  // ============================================

  // Get system statistics
  getSystemStats: adminProcedure.query(async ({ ctx }) => {
    const [
      totalMerchants,
      activeMerchants,
      totalTransactions,
      totalInvoices,
      pendingInvoices,
      paidInvoices,
      totalUsers,
    ] = await Promise.all([
      ctx.prisma.merchant.count(),
      ctx.prisma.merchant.count({ where: { isActive: true } }),
      ctx.prisma.transaction.count(),
      ctx.prisma.invoice.count(),
      ctx.prisma.invoice.count({ where: { status: 'PENDING' } }),
      ctx.prisma.invoice.count({ where: { status: 'PAID' } }),
      ctx.prisma.user.count(),
    ]);

    // Get total volume by currency
    const volumeByCurrency = await ctx.prisma.transaction.groupBy({
      by: ['invoice'],
      _sum: {
        amount: true,
      },
      where: {
        status: 'CONFIRMED',
      },
    });

    return {
      merchants: {
        total: totalMerchants,
        active: activeMerchants,
      },
      transactions: {
        total: totalTransactions,
      },
      invoices: {
        total: totalInvoices,
        pending: pendingInvoices,
        paid: paidInvoices,
      },
      users: {
        total: totalUsers,
      },
    };
  }),

  // ============================================
  // USER MANAGEMENT
  // ============================================

  // List all users
  listAllUsers: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        search: z.string().optional(),
        role: z.enum(['ADMIN', 'MERCHANT', 'OPERATOR']).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const skip = (input.page - 1) * input.limit;

      const where: any = {};
      if (input.search) {
        where.OR = [
          { email: { contains: input.search, mode: 'insensitive' } },
          { name: { contains: input.search, mode: 'insensitive' } },
        ];
      }
      if (input.role) {
        where.role = input.role;
      }

      const [users, total] = await Promise.all([
        ctx.prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            emailVerified: true,
            lastLogin: true,
            createdAt: true,
            _count: {
              select: {
                merchants: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: input.limit,
        }),
        ctx.prisma.user.count({ where }),
      ]);

      return {
        users,
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          pages: Math.ceil(total / input.limit),
        },
      };
    }),

  // Update user role
  updateUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(['ADMIN', 'MERCHANT', 'OPERATOR']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.user.update({
        where: { id: input.userId },
        data: { role: input.role },
      });
    }),
});
```

---

## 🎨 Admin Dashboard UI Components

### Admin Layout

```typescript
// src/app/admin/layout.tsx

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import AdminSidebar from '@/components/admin/admin-sidebar';
import AdminHeader from '@/components/admin/admin-header';

export default async function AdminLayout({
  children,
}: {
  children: React.node;
}) {
  const session = await getServerSession(authOptions);

  // Check if user is logged in
  if (!session?.user) {
    redirect('/auth/login?callbackUrl=/admin');
  }

  // Check if user is admin
  if (session.user.role !== 'ADMIN') {
    redirect('/dashboard'); // Redirect non-admins to merchant dashboard
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <AdminHeader user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Admin Sidebar

```typescript
// src/components/admin/admin-sidebar.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Coins,
  Receipt,
  Users,
  Building2,
  Settings,
  Activity,
  Shield,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Coins', href: '/admin/coins', icon: Coins },
  { name: 'Transactions', href: '/admin/transactions', icon: Receipt },
  { name: 'Merchants', href: '/admin/merchants', icon: Building2 },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'System', href: '/admin/system', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-gray-900 text-white">
      <div className="p-6">
        <div className="flex items-center space-x-2">
          <Shield className="w-8 h-8 text-blue-400" />
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
      </div>
      <nav className="px-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

---

## 🚨 Key Differences: Admin vs Merchant

| Feature | Merchant Dashboard | Admin Dashboard |
|---------|-------------------|-----------------|
| **URL** | `/dashboard/*` | `/admin/*` |
| **Role Required** | `MERCHANT` | `ADMIN` |
| **Data Access** | Own data only | All data |
| **Coin Management** | View only | Full CRUD |
| **Transactions** | Own transactions | All transactions |
| **Merchants** | Can't see others | View all merchants |
| **Users** | Can't manage | Full user management |
| **System** | No access | Full monitoring |

---

## 🔒 Security Checklist

### Authentication
- [ ] Admin role check in middleware
- [ ] Admin role check in tRPC procedures
- [ ] Redirect non-admins to merchant dashboard
- [ ] Session validation on every request

### Authorization
- [ ] All admin routes protected
- [ ] API routes check admin role
- [ ] Audit logs for admin actions
- [ ] Rate limiting on admin actions

### Data Protection
- [ ] Admin can't see user passwords
- [ ] Sensitive data masked in UI
- [ ] API keys shown partially (mk_***...)
- [ ] Webhook secrets hidden

---

## 📊 Admin Dashboard Pages

### 1. Admin Home (`/admin`)
```
- System statistics
- Recent activity
- Quick actions
- Alerts & notifications
```

### 2. Coins Management (`/admin/coins`)
```
- List all coins
- Add new coin (integrate AI tool)
- Edit coin details
- Enable/disable coins
- View coin statistics
```

### 3. Transactions (`/admin/transactions`)
```
- All transactions table
- Filter by merchant, coin, status
- Transaction details modal
- Export to CSV
```

### 4. Merchants (`/admin/merchants`)
```
- All merchants table
- Merchant details page
- View merchant balances
- Approve/suspend merchant
- Merchant activity logs
```

### 5. Users (`/admin/users`)
```
- All users table
- User details
- Assign roles
- Ban/unban users
- User activity logs
```

### 6. System (`/admin/system`)
```
- System health
- Webhook status
- KMS wallet status
- Database stats
- Performance metrics
```

---

## 🎯 Implementation Priority

### Phase 1: Core Admin (Week 1)
1. ✅ Create admin procedure
2. ✅ Create admin router
3. ✅ Build admin layout
4. ✅ Admin authentication

### Phase 2: Coin Management (Week 2)
5. ✅ Coin list page
6. ✅ Add coin page (integrate AI tool)
7. ✅ Edit coin page
8. ✅ Coin statistics

### Phase 3: Monitoring (Week 3)
9. ✅ Transaction monitoring
10. ✅ Merchant management
11. ✅ System statistics
12. ✅ Audit logs

### Phase 4: User Management (Week 4)
13. ✅ User list
14. ✅ Role management
15. ✅ Activity logs
16. ✅ User permissions

---

## 💡 Benefits of Separate Dashboards

### For Merchants:
- ✅ Simple, focused interface
- ✅ Only see their own data
- ✅ No confusion with admin features
- ✅ Better UX for business owners

### For Admins:
- ✅ Complete system visibility
- ✅ Manage all aspects
- ✅ Monitor platform health
- ✅ Quick problem resolution

### For Security:
- ✅ Clear separation of concerns
- ✅ Role-based access control
- ✅ Audit trail
- ✅ Reduced attack surface

---

## 📝 Next Steps

1. **Create Admin Procedure**
   ```bash
   # Add to src/lib/trpc/procedures.ts
   ```

2. **Create Admin Router**
   ```bash
   # Create src/lib/trpc/routers/admin.ts
   ```

3. **Build Admin Layout**
   ```bash
   # Create src/app/admin/layout.tsx
   ```

4. **Create First Admin Page**
   ```bash
   # Create src/app/admin/page.tsx (statistics)
   ```

5. **Integrate AI Coin Tool**
   ```bash
   # Create src/app/admin/coins/add/page.tsx
   # Use the AI tool we built!
   ```

---

**Ready to build the Admin Dashboard?** Let me know which part you want to implement first! 🚀
