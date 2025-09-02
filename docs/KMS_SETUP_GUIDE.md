# Tatum KMS Integration Setup Guide

## 🔐 Overview

This guide walks you through setting up real Tatum KMS (Key Management Service) integration for the Cryptic Gateway unified wallet architecture. The KMS replaces mock signature IDs with real, secure wallet generation using Docker.

## 🚀 Quick Start

### 1. Setup KMS Environment
```bash
# Copy environment template
cp .env.kms.example .env

# Edit .env and set a strong KMS password
# TATUM_KMS_PASSWORD=YourSecurePassword123!

# Setup and start KMS
npm run kms:setup
```

### 2. Generate Real Wallets
```bash
# Generate KMS wallets for all assets and networks
npm run kms:generate-wallets
```

### 3. Test Integration
```bash
# Test KMS connectivity and functionality
npm run kms:test
```

## 📋 Detailed Setup

### Prerequisites
- Docker installed and running
- PostgreSQL database with unified schema
- Environment variables configured

### Step 1: Configure Environment

Create `.env` file with KMS settings:
```env
# Tatum KMS Configuration
TATUM_KMS_PASSWORD=your-secure-kms-password-here
TATUM_KMS_DOCKER=true
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cryptic_gateway
```

**⚠️ Security Note**: Use a strong password with:
- At least 16 characters
- Uppercase and lowercase letters
- Numbers and special characters
- Example: `MySecureKMS!Pass2024#Crypto`

### Step 2: Start KMS Service

#### Automatic Setup
```bash
npm run kms:setup
```

#### Manual Setup
```bash
# Create KMS data directory
mkdir -p ./kms

# Start KMS daemon
npm run kms:start

# Check status
docker-compose -f docker-compose.kms.yml ps

# View logs
npm run kms:logs
```

### Step 3: Generate Real Wallets

The real KMS wallet generator replaces mock signature IDs with genuine Tatum KMS-generated wallets:

```bash
npm run kms:generate-wallets
```

This script:
1. **Connects to KMS** - Tests Docker container connectivity
2. **Processes All Assets** - Generates wallets for all 13 asset-network combinations
3. **Real Signature IDs** - Creates genuine KMS signature IDs (not mock `kms_*` prefixes)
4. **Database Updates** - Updates SystemWallet records with real KMS data
5. **Merchant Wallets** - Creates corresponding MerchantWallet records

## 🔧 KMS Service Architecture

### Docker Container Structure
```yaml
tatum-kms:
  image: tatumio/tatum-kms:latest
  container: cryptic-tatum-kms
  volumes: ./kms:/kms
  command: daemon --pwd="$TATUM_KMS_PASSWORD"
```

### Supported Blockchains
- **Bitcoin (BTC)** - Native SegWit addresses
- **Ethereum (ETH)** - EVM-compatible chains  
- **Binance Smart Chain (BSC)** - BEP-20 tokens
- **TRON (TRX)** - TRC-20 tokens
- **Polygon (MATIC)** - Polygon network
- **Litecoin (LTC)** - UTXO-based
- **Dogecoin (DOGE)** - UTXO-based
- **Bitcoin Cash (BCH)** - UTXO-based

### KMS Operations

#### 1. Wallet Generation
```typescript
const wallet = await tatumKMS.generateWallet('BTC', 'bitcoin')
// Returns: { signatureId: "real-uuid", xpub: "xpub...", mnemonic: "..." }
```

#### 2. Address Derivation  
```typescript
const address = await tatumKMS.deriveAddress(signatureId, 0, 'BTC', 'bitcoin')
// Returns: { address: "bc1q...", derivationKey: 0, signatureId: "..." }
```

#### 3. Wallet Management
```typescript
const wallets = await tatumKMS.listWallets()
const info = await tatumKMS.getWalletInfo(signatureId, 'BTC', 'bitcoin')
```

## 📊 Generated Wallet Structure

After running KMS generation:

### SystemWallets (Platform-Level)
```sql
SELECT 
  assetNetwork.asset.symbol,
  assetNetwork.network.name,
  signatureId,
  walletType,
  status
FROM SystemWallet
WHERE metadata->>'hasRealKMS' = 'true'
```

### Database Schema Updates
```typescript
// Before: Mock signature IDs
signatureId: "kms_BTC_bitcoin_1756732755853_abc123"

// After: Real KMS signature IDs  
signatureId: "550e8400-e29b-41d4-a716-446655440000" // UUID format
```

### Metadata Tracking
```json
{
  "hasRealKMS": true,
  "kmsProvider": "tatum-kms-docker",
  "createdBy": "tatum-kms-generator",
  "generationTimestamp": "2025-01-01T12:00:00Z"
}
```

## 🧪 Testing & Validation

### Basic KMS Test
```bash
npm run kms:test
```

Tests include:
1. **Connection Test** - Verify KMS Docker container
2. **Wallet Listing** - List existing KMS wallets  
3. **Wallet Generation** - Create test BTC wallet
4. **Address Derivation** - Derive payment address
5. **Database Integration** - Verify SystemWallet records
6. **Performance Metrics** - Measure response times

### Manual Docker Commands
```bash
# List KMS wallets directly
docker exec cryptic-tatum-kms tatum-kms getmanagedwallets --pwd="$TATUM_KMS_PASSWORD"

# Generate test wallet
docker exec cryptic-tatum-kms tatum-kms generatemanagedwallet BTC --label="test" --pwd="$TATUM_KMS_PASSWORD"

# Container status
docker ps | grep tatum-kms
```

## 🔒 Security Best Practices

### Production Deployment
1. **Strong Passwords** - Use complex KMS passwords
2. **Backup Strategy** - Regular backup of `./kms/` directory
3. **Access Control** - Limit Docker access to KMS container
4. **Network Security** - Use private Docker networks
5. **Monitoring** - Log KMS operations for audit trails

### KMS Data Protection
```bash
# Backup KMS data
tar -czf kms-backup-$(date +%Y%m%d).tar.gz ./kms/

# Restore KMS data  
tar -xzf kms-backup-YYYYMMDD.tar.gz

# Secure permissions
chmod -R 600 ./kms/
```

## 🛠️ Troubleshooting

### Common Issues

#### KMS Container Not Starting
```bash
# Check Docker status
docker info

# View container logs
npm run kms:logs

# Restart container
npm run kms:stop && npm run kms:start
```

#### Connection Failures
```bash
# Test KMS connectivity
npm run kms:test

# Manual connection test
docker exec cryptic-tatum-kms ps aux | grep daemon
```

#### Wallet Generation Errors
1. **Check Password** - Verify `TATUM_KMS_PASSWORD` in `.env`
2. **Container Health** - Ensure KMS daemon is running
3. **Permissions** - Check `./kms/` directory permissions
4. **Network Issues** - Verify Docker network connectivity

### Debug Commands
```bash
# Container status
docker-compose -f docker-compose.kms.yml ps

# Container logs
docker logs cryptic-tatum-kms --tail 50

# Interactive shell
docker exec -it cryptic-tatum-kms /bin/sh

# KMS process status  
docker exec cryptic-tatum-kms ps aux | grep tatum-kms
```

## 🎯 Production Checklist

Before deploying to production:

- [ ] **Strong KMS Password** - Changed from default
- [ ] **KMS Data Backup** - Automated backup strategy
- [ ] **Docker Security** - Container access controls
- [ ] **Network Security** - Private Docker networks
- [ ] **Monitoring Setup** - KMS operation logging
- [ ] **Recovery Plan** - KMS disaster recovery procedures
- [ ] **Performance Testing** - Load testing KMS operations
- [ ] **Security Audit** - Third-party security review

## 📈 Performance Expectations

- **Wallet Generation**: ~2-5 seconds per wallet
- **Address Derivation**: ~1-2 seconds per address  
- **Connection Test**: ~500ms-1s
- **Wallet Listing**: ~1-3 seconds

## 🎉 Success Indicators

After successful setup:
1. ✅ **KMS Container Running** - `docker ps` shows healthy container
2. ✅ **Real Signature IDs** - Database has UUID-format signature IDs  
3. ✅ **Address Generation** - Can derive payment addresses
4. ✅ **Test Suite Passes** - `npm run kms:test` succeeds
5. ✅ **Wallet Coverage** - All 13 asset-networks have SystemWallets

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review Docker and KMS logs
3. Verify environment configuration
4. Test with simplified configurations first

The KMS integration provides enterprise-grade security for cryptocurrency wallet management in the Cryptic Gateway! 🚀