# Tatum KMS Implementation Guide

## Overview

Tatum Key Management System (KMS) is a self-hosted security solution designed to protect cryptocurrency transaction signing and wallet management without exposing private keys to external services.

## Core Security Principles

### 🔐 **Self-Custodial Design**
- **Tatum does NOT have access to any KMS instance by design**
- Private keys and mnemonics are stored locally in encrypted `wallet.dat` files
- All cryptographic operations happen on your infrastructure

### 🛡️ **Security Features**
- **AES Encryption**: Wallet data encrypted with user-defined passwords
- **Local Storage**: All sensitive data stays on your server
- **MITM Protection**: Prevents Man-in-the-Middle attacks
- **Four-Eye Principle**: Optional additional security layer for mainnet transactions

## Architecture

### **KMS Operational Modes**

1. **CLI Mode**: One-time wallet/key generation
2. **Daemon Mode**: Automated transaction processing
   - Pulls pending transactions from Tatum
   - Signs transactions locally
   - Broadcasts to blockchain networks

### **Signature ID Types**
- **Private Key-based**: Direct private key signing
- **Mnemonic-based**: HD wallet master key signing
- **Mnemonic + Index**: Specific derivation path signing

## Implementation Workflow

### **Phase 1: KMS Setup**

#### Docker Installation
```bash
# Pull KMS Docker image
docker pull tatumio/tatum-kms

# Create environment configuration
cat > .env << EOF
TATUM_API_KEY=your-api-key-here
TATUM_ENVIRONMENT=mainnet
EOF
```

#### Wallet Generation
```bash
# Generate Bitcoin wallet (example)
docker run -it --env-file .env -v ./kms-data:/root/.tatumrc \
  tatumio/tatum-kms generatemanagedwallet BTC --mainnet

# Generate Ethereum wallet
docker run -it --env-file .env -v ./kms-data:/root/.tatumrc \
  tatumio/tatum-kms generatemanagedwallet ETH --mainnet
```

#### Daemon Mode
```bash
# Start KMS daemon for automatic transaction processing
docker run -d --env-file .env -v ./kms-data:/root/.tatumrc \
  --name tatum-kms tatumio/tatum-kms daemon --mainnet
```

### **Phase 2: Application Integration**

#### Node.js Integration
```typescript
import { TatumSDK, Network, Ethereum } from '@tatumio/tatum'

// Initialize Tatum SDK
const tatum = await TatumSDK.init<Ethereum>({
  network: Network.ETHEREUM,
  apiKey: process.env.TATUM_API_KEY,
})

// Create wallet with KMS signature ID
const wallet = await tatum.wallets.generateWallet()
const signatureId = wallet.signatureId // Store this for transaction signing
```

## Security Best Practices

### 🔒 **Access Control**
- Restrict KMS server access (Deny-From-All environment)
- Implement four-eye principle for mainnet operations
- Use hardware authentication devices (e.g., Yubikey)

### 🗄️ **Wallet Management**
- **Password Security**: Use strong, unique passwords
- **Backup Strategy**: Securely store `wallet.dat` files
- **Cold Storage**: Regularly transfer funds to hardware wallets
- **Recovery Planning**: Document recovery procedures

### 📊 **Monitoring**
- Monitor unusual transaction activities
- Log all transaction requests
- Set up alerts for anomalous behaviors
- Maintain audit trails

## Critical Warnings

### ⚠️ **Data Loss Prevention**
- **Password Loss = Permanent Access Loss**
- **wallet.dat Loss = Complete Wallet Loss**
- **Tatum CANNOT recover lost passwords or files**

### 🚨 **Environment Separation**
- Use testnet for development and testing
- Separate KMS infrastructure from application servers
- Implement proper network segregation

## Integration with Cryptic Gateway

### **Current Implementation Issues**
```typescript
// ❌ INSECURE: Current implementation sends keys to Tatum
const walletResponse = await this.httpClient.get(`/v3/${chain}/wallet`)
const privateKeyResponse = await this.httpClient.post(`/v3/${chain}/wallet/priv`, {
  mnemonic: walletResponse.mnemonic  // Sending mnemonic to external service
})
```

### **Secure KMS Implementation**
```typescript
// ✅ SECURE: Generate wallets locally with KMS
import { generateMnemonic, mnemonicToSeed } from 'bip39'
import { fromSeed } from 'bip32'

class SecureWalletManager {
  async generateWalletLocally(derivationPath: string) {
    // Generate mnemonic locally (never leaves server)
    const mnemonic = generateMnemonic(256) // 24 words
    const seed = await mnemonicToSeed(mnemonic)
    const root = fromSeed(seed)
    
    // Derive xpub for address generation
    const account = root.derivePath(derivationPath)
    const xpub = account.neutered().toBase58()
    
    return {
      mnemonic: await this.encrypt(mnemonic),
      xpub,
      derivationPath
    }
  }
}
```

## Recovery Procedures

### **Wallet Recovery Process**
1. **Access encrypted mnemonic** from database
2. **Decrypt using HD_WALLET_ENCRYPTION_KEY**
3. **Generate seed** from mnemonic
4. **Derive all addresses** using original derivation paths
5. **Restore wallet state** in KMS

### **Emergency Recovery Script**
```bash
#!/bin/bash
# Emergency wallet recovery using mnemonic

# Extract encrypted mnemonic from database
ENCRYPTED_MNEMONIC=$(psql -d cryptic_gateway -t -c "SELECT mnemonicEncrypted FROM \"GlobalHDWallet\" WHERE currency='BTC'")

# Decrypt mnemonic (implement decryption logic)
MNEMONIC=$(decrypt_mnemonic "$ENCRYPTED_MNEMONIC")

# Restore wallet in KMS
docker run -it --env-file .env -v ./kms-recovery:/root/.tatumrc \
  tatumio/tatum-kms generatemanagedwallet BTC --mainnet --mnemonic "$MNEMONIC"
```

## Migration Plan

### **Step 1: Backup Current State**
- Export all current wallet data
- Document existing derivation paths
- Create encrypted backups

### **Step 2: KMS Setup**
- Deploy KMS infrastructure
- Configure secure environment
- Test with small amounts

### **Step 3: Wallet Migration**
- Generate new secure wallets using KMS
- Update database schema if needed
- Migrate funds from old to new wallets

### **Step 4: Application Updates**
- Update transaction signing to use KMS
- Implement proper error handling
- Test all wallet operations

## Monitoring and Maintenance

### **Regular Tasks**
- Monitor KMS daemon health
- Verify wallet.dat backups
- Test recovery procedures
- Update security configurations

### **Alerting Setup**
- Transaction signing failures
- Unusual wallet activities
- KMS daemon downtime
- Security policy violations

---

## Conclusion

Tatum KMS provides enterprise-grade security for cryptocurrency wallet management by ensuring that private keys never leave your infrastructure. Proper implementation requires careful planning, robust security practices, and comprehensive monitoring.

**Remember**: With great security comes great responsibility. KMS is self-custodial by design, meaning you are fully responsible for key management and recovery.