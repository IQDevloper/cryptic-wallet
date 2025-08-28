// Comprehensive icon mapping for the Cryptic Gateway system
import React from 'react'
import { 
  // Cryptocurrency Icons
  FaBitcoin,
  FaEthereum,
} from 'react-icons/fa'
// No Simple Icons imports - using fallbacks from other libraries
import {
  // Business & UI Icons
  MdDashboard,
  MdAccountBalanceWallet,
  MdPayment,
  MdReceipt,
  MdSettings,
  MdNotifications,
  MdSecurity,
  MdApi,
  MdTrendingUp,
  MdTrendingDown,
  MdSwapHoriz,
  MdAccountBalance,
  MdPerson,
  MdBusiness,
  MdHelp,
  MdRefresh,
  MdVisibility,
  MdContentCopy,
  MdCheck,
  MdClose,
  MdWarning,
  MdError,
  MdInfo,
  MdAdd,
  MdEdit,
  MdDelete,
  MdMoreVert,
  MdFilterList,
  MdSearch,
  MdDownload,
  MdUpload,
  MdShare,
  MdQrCode,
  MdVerified,
  MdShield,
  MdSpeed,
  MdLanguage,
  MdSchedule,
  MdHistory,
  MdAnalytics,
} from 'react-icons/md'
import {
  // Arrow & Navigation Icons
  IoMdArrowUp,
  IoMdArrowDown,
  IoMdArrowRoundUp,
  IoMdArrowRoundDown,
  IoMdArrowForward,
  IoMdArrowBack,
} from 'react-icons/io'
import {
  // Additional UI Icons from Heroicons v2
  HiOutlineChartBarSquare,
  HiOutlineClipboardDocumentCheck,
  HiOutlineCurrencyDollar,
  HiOutlineBolt,
  HiOutlineGlobeAlt,
  HiOutlineShieldCheck,
  HiOutlineDevicePhoneMobile,
  HiOutlineClock,
  HiOutlineCheckCircle,
  HiOutlineExclamationTriangle,
  HiOutlineXCircle,
  HiOutlineInformationCircle,
} from 'react-icons/hi2'

// Icon components with consistent styling - using only verified icons
export const CryptoIcons = {
  BTC: ({ className = "w-5 h-5", color = "text-orange-500" }) => (
    <FaBitcoin className={`${className} ${color}`} />
  ),
  ETH: ({ className = "w-5 h-5", color = "text-blue-500" }) => (
    <FaEthereum className={`${className} ${color}`} />
  ),
  BNB: ({ className = "w-5 h-5", color = "text-yellow-500" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      B
    </div>
  ),
  BSC: ({ className = "w-5 h-5", color = "text-yellow-500" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      B
    </div>
  ),
  USDT: ({ className = "w-5 h-5", color = "text-green-500" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      T
    </div>
  ),
  USDC: ({ className = "w-5 h-5", color = "text-blue-500" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      $
    </div>
  ),
  MATIC: ({ className = "w-5 h-5", color = "text-purple-500" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      M
    </div>
  ),
  TRX: ({ className = "w-5 h-5", color = "text-red-500" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      T
    </div>
  ),
  DOGE: ({ className = "w-5 h-5", color = "text-yellow-600" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      D
    </div>
  ),
  LTC: ({ className = "w-5 h-5", color = "text-gray-500" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      L
    </div>
  ),
  BCH: ({ className = "w-5 h-5", color = "text-green-600" }) => (
    <FaBitcoin className={`${className} ${color}`} />
  ),
  ADA: ({ className = "w-5 h-5", color = "text-blue-600" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      A
    </div>
  ),
  SOL: ({ className = "w-5 h-5", color = "text-purple-600" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      S
    </div>
  ),
  LINK: ({ className = "w-5 h-5", color = "text-blue-700" }) => (
    <div className={`${className} ${color} rounded-full bg-current flex items-center justify-center text-white text-xs font-bold`}>
      L
    </div>
  ),
}

// Business & UI Icons
export const BusinessIcons = {
  Dashboard: MdDashboard,
  Wallet: MdAccountBalanceWallet,
  Payment: MdPayment,
  Receipt: MdReceipt,
  Invoice: MdReceipt,
  Settings: MdSettings,
  Notifications: MdNotifications,
  Security: MdSecurity,
  API: MdApi,
  TrendingUp: MdTrendingUp,
  TrendingDown: MdTrendingDown,
  Swap: MdSwapHoriz,
  Balance: MdAccountBalance,
  Person: MdPerson,
  Business: MdBusiness,
  Help: MdHelp,
  Refresh: MdRefresh,
  View: MdVisibility,
  Copy: MdContentCopy,
  Check: MdCheck,
  Close: MdClose,
  Warning: MdWarning,
  Error: MdError,
  Info: MdInfo,
  Add: MdAdd,
  Edit: MdEdit,
  Delete: MdDelete,
  More: MdMoreVert,
  Filter: MdFilterList,
  Search: MdSearch,
  Download: MdDownload,
  Upload: MdUpload,
  Share: MdShare,
  QrCode: MdQrCode,
  Verified: MdVerified,
  Shield: MdShield,
  Speed: MdSpeed,
  Globe: MdLanguage,
  Clock: MdSchedule,
  History: MdHistory,
  Analytics: MdAnalytics,
}

// Arrow Icons
export const ArrowIcons = {
  Up: IoMdArrowUp,
  Down: IoMdArrowDown,
  UpRight: IoMdArrowRoundUp,
  DownRight: IoMdArrowRoundDown,
  Forward: IoMdArrowForward,
  Back: IoMdArrowBack,
}

// Status Icons
export const StatusIcons = {
  Success: HiOutlineCheckCircle,
  Warning: HiOutlineExclamationTriangle,
  Error: HiOutlineXCircle,
  Info: HiOutlineInformationCircle,
  Pending: HiOutlineClock,
  Confirmed: HiOutlineClipboardDocumentCheck,
  Shield: HiOutlineShieldCheck,
  Lightning: HiOutlineBolt,
  Globe: HiOutlineGlobeAlt,
  Mobile: HiOutlineDevicePhoneMobile,
  Chart: HiOutlineChartBarSquare,
  Dollar: HiOutlineCurrencyDollar,
}

// Helper function to get crypto icon by currency code
export const getCryptoIcon = (currencyCode: string, props?: { className?: string; color?: string }) => {
  const IconComponent = CryptoIcons[currencyCode.toUpperCase() as keyof typeof CryptoIcons]
  if (IconComponent) {
    return <IconComponent {...props} />
  }
  
  // Fallback to a generic crypto icon
  return <FaBitcoin className={`${props?.className || 'w-5 h-5'} ${props?.color || 'text-gray-500'}`} />
}

// Helper function to get status color classes
export const getStatusColors = (status: string) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'paid':
    case 'completed':
    case 'success':
      return {
        bg: 'bg-green-100 dark:bg-green-900/20',
        text: 'text-green-800 dark:text-green-300',
        border: 'border-green-200 dark:border-green-800',
        icon: 'text-green-500'
      }
    case 'pending':
    case 'processing':
    case 'waiting':
      return {
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-800 dark:text-yellow-300',
        border: 'border-yellow-200 dark:border-yellow-800',
        icon: 'text-yellow-500'
      }
    case 'failed':
    case 'rejected':
    case 'cancelled':
    case 'error':
      return {
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-800 dark:text-red-300',
        border: 'border-red-200 dark:border-red-800',
        icon: 'text-red-500'
      }
    case 'expired':
    case 'underpaid':
    case 'overpaid':
      return {
        bg: 'bg-orange-100 dark:bg-orange-900/20',
        text: 'text-orange-800 dark:text-orange-300',
        border: 'border-orange-200 dark:border-orange-800',
        icon: 'text-orange-500'
      }
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-800 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-700',
        icon: 'text-gray-500'
      }
  }
}

export default {
  CryptoIcons,
  BusinessIcons,
  ArrowIcons,
  StatusIcons,
  getCryptoIcon,
  getStatusColors,
}