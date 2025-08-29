/*
DEPRECATED: This service used the old individual wallet system.

The new HD wallet system uses:
- GlobalHDWallet for global wallet management
- MerchantBalance for merchant-specific balances  
- DerivedAddress for payment addresses

See HD_WALLET_MIGRATION_TRACKER.md for migration details.

For payment processing, use:
- src/lib/trpc/routers/invoice.ts (invoice creation with HD wallets)
- src/lib/hdwallet/address-generator.ts (address generation)
- src/lib/trpc/routers/merchant.ts (balance management)
*/

// This file has been deprecated and replaced with the HD wallet system
export {}