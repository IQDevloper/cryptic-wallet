'use client';

import { trpc } from '@/lib/trpc/client';
import {
  Building2,
  Receipt,
  FileText,
  Users,
  Coins,
  TrendingUp,
  Activity,
  AlertCircle,
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = trpc.admin.getSystemStats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-800">Error loading statistics: {error.message}</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Merchants',
      value: stats?.merchants.total || 0,
      subtitle: `${stats?.merchants.active || 0} active`,
      icon: Building2,
      color: 'blue',
    },
    {
      title: 'Total Transactions',
      value: stats?.transactions.total || 0,
      subtitle: `${stats?.transactions.confirmed || 0} confirmed`,
      icon: Receipt,
      color: 'green',
    },
    {
      title: 'Total Invoices',
      value: stats?.invoices.total || 0,
      subtitle: `${stats?.invoices.pending || 0} pending, ${stats?.invoices.paid || 0} paid`,
      icon: FileText,
      color: 'purple',
    },
    {
      title: 'Total Users',
      value: stats?.users.total || 0,
      subtitle: 'System users',
      icon: Users,
      color: 'orange',
    },
    {
      title: 'Total Assets',
      value: stats?.assets.total || 0,
      subtitle: `${stats?.assets.active || 0} active`,
      icon: Coins,
      color: 'yellow',
    },
  ];

  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">System overview and statistics</p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-gray-500 text-sm font-medium">{stat.title}</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">{stat.subtitle}</p>
          </div>
        ))}
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Merchants Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Merchants Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Merchants</span>
              <span className="text-green-600 font-semibold">{stats?.merchants.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Inactive Merchants</span>
              <span className="text-red-600 font-semibold">{stats?.merchants.inactive || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-900 font-medium">Total</span>
              <span className="text-gray-900 font-semibold">{stats?.merchants.total || 0}</span>
            </div>
          </div>
        </div>

        {/* Transactions Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transactions Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Confirmed</span>
              <span className="text-green-600 font-semibold">{stats?.transactions.confirmed || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending</span>
              <span className="text-yellow-600 font-semibold">{stats?.transactions.pending || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-900 font-medium">Total</span>
              <span className="text-gray-900 font-semibold">{stats?.transactions.total || 0}</span>
            </div>
          </div>
        </div>

        {/* Invoices Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoices Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Paid</span>
              <span className="text-green-600 font-semibold">{stats?.invoices.paid || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pending</span>
              <span className="text-yellow-600 font-semibold">{stats?.invoices.pending || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-900 font-medium">Total</span>
              <span className="text-gray-900 font-semibold">{stats?.invoices.total || 0}</span>
            </div>
          </div>
        </div>

        {/* Assets Overview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets Overview</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Active Assets</span>
              <span className="text-green-600 font-semibold">{stats?.assets.active || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Inactive Assets</span>
              <span className="text-gray-600 font-semibold">{stats?.assets.inactive || 0}</span>
            </div>
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="text-gray-900 font-medium">Total</span>
              <span className="text-gray-900 font-semibold">{stats?.assets.total || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <a
            href="/admin/coins"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Coins className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Manage Coins</p>
          </a>
          <a
            href="/admin/merchants"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">View Merchants</p>
          </a>
          <a
            href="/admin/transactions"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Receipt className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Monitor Transactions</p>
          </a>
          <a
            href="/admin/users"
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-center"
          >
            <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Manage Users</p>
          </a>
        </div>
      </div>
    </div>
  );
}
