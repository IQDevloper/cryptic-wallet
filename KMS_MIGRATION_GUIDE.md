# Cryptic Gateway KMS Migration Guide

This guide covers the complete migration from HD Wallet system to Tatum Key Management Service (KMS).

## 🔄 What Changed

### From HD Wallets to KMS Wallets

**Before (HD Wallet System):**
- Locally stored encrypted mnemonics
- Manual address derivation
- Complex key management

**After (KMS System):**
- Tatum KMS manages all cryptographic operations
- Signature IDs instead of raw private keys
- Docker-based secure key storage
- Automatic transaction signing

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Application   │    │   Tatum KMS      │    │   Blockchain    │
│                 │    │   (Docker)       │    │                 │
│ - Create Tx     │───▶│ - Store Keys     │───▶│ - Execute Tx    │
│ - Use Signature │    │ - Sign Tx        │    │ - Confirm Tx    │
│   IDs           │    │ - Daemon Mode    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 📊 Database Schema Changes

### New Models

```prisma
model Wallet {
  signatureId        String       @unique  // KMS signature ID
  currency           String                // BTC, ETH, USDT
  network            String                // bitcoin, ethereum, bsc
  contractAddress    String?               // For tokens
  derivationPath     String                // Derivation path
  status             WalletStatus          // ACTIVE, INACTIVE, etc.
  // ... other fields
}

model Address {
  walletId          String                 // References Wallet
  address           String       @unique   // Blockchain address
  signatureId       String?      @unique   // Optional individual key signature ID
  derivationIndex   BigInt                 // Address index
  // ... other fields
}
```

## 🚀 Migration Steps

### 1. Environment Setup

Create `.env.kms` file:
```bash
# Required
TATUM_API_KEY=your-tatum-api-key-here
TATUM_KMS_PASSWORD=your-super-secure-kms-password

# Optional
TATUM_ENVIRONMENT=mainnet
DEBUG=false
```

### 2. Docker Setup

KMS runs in Docker for security and isolation:
```bash
# Start KMS daemon
docker-compose -f docker-compose.kms.yml up -d

# Check status
docker-compose -f docker-compose.kms.yml ps
```

### 3. Database Migration

```bash
# Generate new Prisma client
npx prisma generate

# Create and run migration
npx prisma db push

# Or create migration file
npx prisma migrate dev --name kms-migration
```

### 4. Initialize KMS Wallets

Use the automated script:
```bash
# For mainnet (production)
./scripts/kms-manager.sh 2

# For testnet (development)
./scripts/kms-manager.sh 3

# Or run directly
node scripts/init-kms-wallets.js --testnet
```

### 5. Start KMS Daemon

```bash
# Start the KMS daemon
./scripts/kms-manager.sh 4

# Check it's running
./scripts/kms-manager.sh 7
```

## 🔧 Usage Examples

### Creating Transactions with KMS

**Before (HD Wallet):**
```javascript
// Had to manage private keys directly
const transaction = await createTransaction({
  privateKey: "raw-private-key-here",
  fromAddress: "address",
  // ...
})
```

**After (KMS):**
```javascript
// Use signature IDs - KMS handles the rest
const transaction = await createTransaction({
  signatureId: "kms-signature-id-here", 
  fromAddress: "address",
  // ...
})
```

### Address Generation

**Before:**
```javascript
// Manual derivation from mnemonic
const address = deriveAddress(mnemonic, index)
```

**After:**
```javascript
// KMS generates and tracks addresses
const address = await generateKMSAddress(walletSignatureId, index)
```

## 📋 Supported Cryptocurrencies

The system automatically generates KMS wallets for:

- **Bitcoin (BTC)** - Native blockchain
- **Ethereum (ETH)** - Native + Base network
- **USDT** - Multi-network (BSC, Tron, Ethereum, Polygon, Arbitrum)
- **USDC** - Multi-network (Ethereum, BSC, Polygon, Arbitrum) 
- **Solana (SOL)** - Native blockchain
- **Litecoin (LTC)** - Native blockchain
- **Dogecoin (DOGE)** - Native blockchain
- **Dash (DASH)** - Native blockchain

Each cryptocurrency maps to its corresponding KMS chain identifier.

## 🔒 Security Features

### KMS Security Benefits
- **Encrypted Storage**: All keys encrypted with AES
- **No Key Exposure**: Raw keys never leave KMS container
- **Signature-Based**: Transactions signed locally by KMS
- **Password Protected**: Wallet storage requires password
- **Docker Isolated**: KMS runs in isolated container

### Key Management
- **Mnemonic Wallets**: Generate multiple addresses from one mnemonic
- **Individual Keys**: Store specific private keys when needed
- **Signature IDs**: Unique identifiers for each key/mnemonic
- **Backup System**: Encrypted backups of wallet data

## 🛠️ Management Scripts

### KMS Manager (`kms-manager.sh`)
```bash
./scripts/kms-manager.sh          # Interactive menu
./scripts/kms-manager.sh 1        # Complete setup
./scripts/kms-manager.sh 4        # Start daemon
./scripts/kms-manager.sh 7        # Show status
```

### Wallet Initialization (`init-kms-wallets.js`)
- Reads crypto assets configuration
- Generates KMS wallets for all supported currencies
- Stores signature IDs in database
- Handles both mainnet and testnet

## 🔍 Monitoring & Debugging

### KMS Logs
```bash
# View logs
docker-compose -f docker-compose.kms.yml logs -f

# Check daemon status
docker-compose -f docker-compose.kms.yml ps
```

### Export Wallet Information
```bash
# Export wallet details (for debugging)
./scripts/kms-manager.sh 8
```

### Health Checks
The Docker setup includes health checks to ensure KMS is running properly.

## 📦 File Structure

```
cryptic-wallet/
├── docker-compose.kms.yml         # KMS Docker configuration
├── .env.kms                       # KMS environment variables
├── kms-data/                      # KMS wallet storage (encrypted)
├── kms-logs/                      # KMS operation logs
├── kms-backups/                   # Encrypted wallet backups
├── scripts/
│   ├── kms-manager.sh            # Management script
│   └── init-kms-wallets.js       # Wallet initialization
└── prisma/
    └── schema.prisma             # Updated schema with KMS models
```

## ⚠️ Important Notes

### Security Warnings
- **Never commit** `.env.kms` to version control
- **Backup** your KMS password securely
- **Store** wallet backups in secure, offline location
- **Use** strong passwords for KMS encryption

### Production Considerations
- KMS password is required on every daemon restart
- API key must match between KMS and application
- Signature IDs must be generated before transactions
- Test thoroughly on testnet before mainnet deployment

### Migration Checklist
- [ ] Update environment variables
- [ ] Run database migration
- [ ] Initialize KMS wallets
- [ ] Start KMS daemon
- [ ] Update application code to use signature IDs
- [ ] Test transaction signing
- [ ] Create secure backups
- [ ] Monitor KMS health

## 🆘 Troubleshooting

### Common Issues

**KMS won't start:**
- Check `.env.kms` file exists and has correct API key
- Verify Docker is running
- Check if ports are available

**Wallet generation fails:**
- Ensure Tatum API key is valid
- Check network connectivity
- Verify KMS Docker image is latest version

**Transactions not signing:**
- Confirm KMS daemon is running
- Check API key matches between app and KMS
- Verify signature IDs exist in KMS

**"Malformed UTF-8" errors:**
- Usually indicates wrong KMS password
- Check password in `.env.kms` file
- Try regenerating wallet if password is lost

## 📞 Support

For issues specific to:
- **KMS Setup**: Check Tatum documentation
- **Database Migration**: Review Prisma migration guides  
- **Docker Issues**: Verify Docker installation and permissions
- **Cryptic Gateway Integration**: Review application logs and merchant router

Remember: **If you lose your KMS password, you lose access to your wallets. Tatum cannot help recover lost passwords.**