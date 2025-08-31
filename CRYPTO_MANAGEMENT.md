# Cryptocurrency Management Guide

## Overview

The Cryptic Gateway supports multiple cryptocurrencies across various blockchain networks. This guide explains how to add, remove, or modify supported cryptocurrencies.

## Configuration Files

### Main Configuration File
- **File**: `/src/lib/crypto-assets-config.ts`
- **Purpose**: Contains all cryptocurrency definitions
- **⚠️  Important**: This is the ONLY file you need to edit to manage cryptocurrencies

### Helper Files (Don't Edit)
- `/src/lib/crypto-config.ts` - Provides helper functions
- `/src/lib/hdwallet/address-generator.ts` - Handles address generation

## How to Add a New Cryptocurrency

### Step 1: Edit Configuration
Open `/src/lib/crypto-assets-config.ts` and add your new cryptocurrency to `CRYPTO_ASSETS_CONFIG`:

```typescript
// Example: Adding Cardano (ADA)
ADA: {
  symbol: 'ADA',
  name: 'Cardano',
  decimals: 6,
  networks: [
    {
      network: 'cardano',
      isNative: true,
      derivationPath: "m/44'/1815'/0'/0",
      tatumChain: 'ADA',
      displayName: 'ADA (Cardano)'
    }
  ],
  icon: '/icons/ada.svg'
}
```

### Step 2: Add Icon
Place your cryptocurrency icon in `/public/icons/` as an SVG file:
- Format: `{symbol}.svg` (lowercase)
- Size: Recommended 20x20px or scalable SVG
- Example: `/public/icons/ada.svg`

### Step 3: Update Address Generation
If the cryptocurrency uses a different address format, update `/src/lib/hdwallet/address-generator.ts` in the `generateMockAddress` function.

### Step 4: Sync Database
After modifying the crypto configuration, you need to create wallets in the database:

```bash
# Apply any pending database migrations
npx prisma migrate dev

# Initialize wallets for all configured cryptocurrencies
npx tsx src/scripts/init-comprehensive-wallets.ts
```

The script will:
- ✅ Create HD wallets for all cryptocurrencies in your config
- ✅ Generate unique mnemonic phrases for each wallet
- ✅ Set up derivation paths and contract addresses
- ✅ Skip existing wallets (safe to run multiple times)

## How to Remove a Cryptocurrency

### Step 1: Remove from Configuration
Delete the cryptocurrency entry from `/src/lib/crypto-assets-config.ts`

### Step 2: Clean Database (Optional)
If you want to remove existing wallets from the database:
```bash
# This will need to be done manually in your database
```

## How to Modify Networks

### Adding a Network to Existing Cryptocurrency
```typescript
// Example: Adding Polygon network to USDT
USDT: {
  // ... existing config
  networks: [
    // ... existing networks
    {
      network: 'polygon',
      isNative: false,
      contractAddress: '0xc2132D05D31c914a87C6613C10748AaCbA0D5c45',
      derivationPath: "m/44'/60'/0'/0",
      tatumChain: 'MATIC',
      displayName: 'USDT (Polygon)'
    }
  ]
}
```

### Removing a Network
Simply delete the network entry from the `networks` array.

## Network Configuration Fields

| Field | Description | Example |
|-------|-------------|---------|
| `network` | Internal network identifier | `ethereum` |
| `isNative` | Is this the blockchain's native coin? | `true` for ETH, `false` for USDT |
| `contractAddress` | Token contract address (tokens only) | `0xdAC17F958D...` |
| `derivationPath` | HD wallet derivation path | `m/44'/60'/0'/0` |
| `tatumChain` | Tatum API chain identifier | `ETH` |
| `displayName` | User-friendly name for UI | `USDT (ERC20)` |

## Current Supported Cryptocurrencies

### Stablecoins
- **USDT** - Tether USD
  - Ethereum (ERC20)
  - BSC (BEP20) 
  - Polygon
  - Tron (TRC20)
  - Arbitrum

- **USDC** - USD Coin
  - Ethereum (ERC20)
  - BSC (BEP20)
  - Polygon
  - Arbitrum
  - Sui (Native)

### Native Cryptocurrencies
- **BTC** - Bitcoin
- **ETH** - Ethereum (+ Base network)
- **SOL** - Solana
- **SUI** - Sui
- **LTC** - Litecoin
- **DOGE** - Dogecoin
- **DASH** - Dash

## Testing Changes

After making changes:

1. **Build the project**: `npm run build`
2. **Test invoice creation**: Try creating invoices with new/modified cryptocurrencies
3. **Check UI**: Verify names display correctly in the dropdown

## Troubleshooting

### Issue: New cryptocurrency not appearing
- Check that the configuration syntax is correct
- Verify the icon file exists in `/public/icons/`
- Restart your development server

### Issue: Address generation fails
- Check that the network is handled in `generateMockAddress()` function
- Verify the derivation path is correct for the blockchain

### Issue: Tatum integration fails
- Verify the `tatumChain` value matches Tatum's API documentation
- Check that contract addresses are correct

## Database Management

### After Updating Configuration

**Always run these commands after editing `/src/lib/crypto-assets-config.ts`:**

```bash
# 1. Apply database schema changes
npx prisma migrate dev

# 2. Create wallets for new cryptocurrencies  
npx tsx src/scripts/init-comprehensive-wallets.ts

# 3. Sync currency/network records (IMPORTANT!)
npx tsx src/scripts/sync-currencies.ts

# 4. (Optional) View wallets in Prisma Studio
npx prisma studio
```

⚠️  **Step 3 is critical** - without it, you'll get "No active currencies found" when creating merchants!

### Check Current Wallets

```bash
# View all wallets in your database
npx prisma studio

# Or query directly
npx prisma db execute --stdin <<< "
  SELECT currency, network, status, \"contractAddress\" 
  FROM \"GlobalHDWallet\" 
  ORDER BY currency, network;
"
```

### Reset All Wallets (⚠️ DESTRUCTIVE)

```bash
# WARNING: This deletes all existing wallets and data
npx prisma migrate reset --force

# Then recreate wallets
npx tsx src/scripts/init-comprehensive-wallets.ts
```

## Current Database State

After running the scripts, you should have **17 mainnet wallets**:

**Stablecoins:**
- 5× USDT wallets (BSC, Tron, Ethereum, Polygon, Arbitrum)
- 4× USDC wallets (Ethereum, BSC, Polygon, Arbitrum)

**Native Cryptocurrencies:**
- 1× BTC wallet (Bitcoin)
- 2× ETH wallets (Ethereum, Base) 
- 1× SOL wallet (Solana)
- 1× SUI wallet (Sui)
- 1× LTC wallet (Litecoin)
- 1× DOGE wallet (Dogecoin)
- 1× DASH wallet (Dash)

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Review the server logs for backend errors
3. Verify all configuration fields match the expected format
4. Test with a simple configuration first (single network)
5. **Database issues**: Run `npx prisma migrate status` to check migrations