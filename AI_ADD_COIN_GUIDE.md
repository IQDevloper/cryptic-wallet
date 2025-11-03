# 🤖 AI-Powered Coin Addition Guide

## Overview

The **AI Add Coin** tool is an intelligent assistant that automatically researches cryptocurrency details and adds them to your payment gateway system with minimal manual input.

---

## 🚀 Quick Start

```bash
npm run ai:add-coin
```

That's it! The AI will guide you through the entire process.

---

## ✨ Features

### 🤖 AI Research (Coming Soon)
- Automatically researches coin/token details
- Determines network type (EVM, UTXO, TRON, SOLANA)
- Finds contract addresses across multiple networks
- Discovers technical specifications (decimals, derivation paths)
- Validates Tatum API support

### 📊 Smart Configuration
- **Network Detection**: Automatically identifies if it's EVM, UTXO, TRON, or SOLANA
- **Derivation Paths**: Suggests correct BIP44 paths based on coin type
- **Multi-Network Tokens**: Supports tokens deployed on multiple chains
- **KMS Integration**: Optional wallet generation via Tatum KMS

### 🔧 Database Management
- Creates/updates Network entries
- Creates/updates Asset entries
- Links assets to networks (AssetNetwork)
- Generates KMS wallets (optional)
- Full transaction support with rollback

---

## 📋 How It Works

### Step 1: AI Research Phase

The tool asks Claude AI to research:

```
You are a cryptocurrency expert assistant. Research the following cryptocurrency:

Cryptocurrency Symbol: SOL
User Description: Solana blockchain

Please provide:
1. Full name and description
2. Network type (EVM, UTXO, TRON, SOLANA)
3. Technical specs (decimals, BIP44 coin type, derivation path)
4. Contract addresses (if token)
5. Blockchain details (if native)
6. Tatum support status
```

### Step 2: AI Returns Structured Data

**For Native Coins** (e.g., Solana):
```json
{
  "symbol": "SOL",
  "name": "Solana",
  "description": "High-performance blockchain supporting smart contracts",
  "networkType": "SOLANA",
  "isNative": true,
  "decimals": 9,
  "derivationPath": "m/44'/501'/0'/0'",
  "coinType": 501,
  "chainName": "Solana",
  "tatumChainId": "solana-mainnet",
  "explorerUrl": "https://explorer.solana.com",
  "blockConfirmations": 32,
  "tatumSupported": true,
  "kmsChainCode": "SOL"
}
```

**For Tokens** (e.g., USDC):
```json
{
  "symbol": "USDC",
  "name": "USD Coin",
  "description": "Fully-backed dollar stablecoin",
  "networkType": "EVM",
  "isNative": false,
  "decimals": 6,
  "networks": [
    {
      "networkCode": "ethereum",
      "contractAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      "tokenStandard": "ERC-20"
    },
    {
      "networkCode": "bsc",
      "contractAddress": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
      "tokenStandard": "BEP-20"
    },
    {
      "networkCode": "polygon",
      "contractAddress": "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      "tokenStandard": "Polygon"
    }
  ],
  "tatumSupported": true
}
```

### Step 3: Database Creation

The tool automatically creates:

1. **Network** (if native coin):
   ```sql
   INSERT INTO networks (
     code, name, type, tatumChainId,
     explorerUrl, blockConfirmations
   )
   ```

2. **Asset**:
   ```sql
   INSERT INTO assets (
     symbol, name, type, logoUrl
   )
   ```

3. **AssetNetwork** (links asset to network):
   ```sql
   INSERT INTO asset_networks (
     assetId, networkId, contractAddress,
     tokenStandard, decimals
   )
   ```

4. **KmsWallet** (optional, for native coins):
   ```sql
   INSERT INTO kms_wallets (
     networkId, signatureId, xpub,
     derivationPath, purpose, status
   )
   ```

---

## 🎯 Usage Examples

### Example 1: Add Solana (Native Coin)

```bash
$ npm run ai:add-coin

🪙 Enter cryptocurrency symbol: SOL
💡 Any hints for AI? Solana blockchain

🤖 AI Research Mode Activated...
📊 Researching: SOL

[AI provides complete details]

✅ Proceed with this configuration? y

🚀 Creating database entries...
📊 Creating Network: Solana
✅ Network created: solana
💰 Creating Asset: SOL
✅ Asset created: SOL
🔗 Creating Asset-Network Relationships...
✅ Native asset-network created

🔐 Generating KMS Wallet...
Generate KMS wallet for SOL? y
Enter KMS password: ****

✅ KMS Wallet created
   Signature ID: abc-123-def
   xPub: xpub6D4BDPcP2GT577...

✅ Successfully added SOL to the system!
```

### Example 2: Add LINK Token (Multi-Network)

```bash
$ npm run ai:add-coin

🪙 Enter cryptocurrency symbol: LINK
💡 Any hints for AI? Chainlink oracle token

🤖 AI Research Mode Activated...
📊 Researching: LINK

[AI detects LINK is a token on multiple networks]

Is this a native coin? n

📍 Enter contract addresses for each network:

Add Ethereum (ERC-20) contract? y
  Contract Address: 0x514910771AF9Ca656af840dff83E8264EcF986CA

Add BSC (BEP-20) contract? y
  Contract Address: 0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD

Add Polygon contract? y
  Contract Address: 0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39

✅ Proceed with this configuration? y

🚀 Creating database entries...
💰 Creating Asset: LINK
✅ Asset created: LINK
🔗 Creating Asset-Network Relationships...
✅ Token on ethereum: link-eth
✅ Token on bsc: link-bsc
✅ Token on polygon: link-polygon

✅ Successfully added LINK to the system!
   Available on 3 networks
```

---

## 🏗️ Network Type Templates

The tool automatically applies the correct configuration based on network type:

### EVM Networks
```typescript
{
  type: NetworkType.EVM,
  derivationPath: "m/44'/60'/0'/0",  // All EVM use ETH path
  defaultConfirmations: 12,
  tatumChainFormat: "{name}-mainnet"
}
```

**Supported**: Ethereum, BSC, Polygon, Arbitrum, Avalanche, Optimism, etc.

### UTXO Networks
```typescript
{
  type: NetworkType.UTXO,
  derivationPath: "m/44'/{coinType}'/0'/0",
  defaultConfirmations: 6,
  tatumChainFormat: "{name}-mainnet"
}
```

**Supported**: Bitcoin (0), Litecoin (2), Dogecoin (3), Bitcoin Cash (145)

### TRON Network
```typescript
{
  type: NetworkType.TRON,
  derivationPath: "m/44'/195'/0'/0",
  defaultConfirmations: 19,
  tatumChainFormat: "tron-mainnet"
}
```

### SOLANA Network
```typescript
{
  type: NetworkType.SOLANA,
  derivationPath: "m/44'/501'/0'/0'",
  defaultConfirmations: 32,
  tatumChainFormat: "solana-mainnet"
}
```

---

## 📊 AI Research Template

### Input to AI (Prompt):
```typescript
interface CoinResearchPrompt {
  symbol: string;           // "AVAX", "DOT", "ADA"
  userDescription?: string; // Optional hints
}
```

### Output from AI (Response):
```typescript
interface AIResearchedCoin {
  // Basic Info
  symbol: string;
  name: string;
  description: string;

  // Network Classification
  networkType: 'EVM' | 'UTXO' | 'TRON' | 'SOLANA';
  isNative: boolean;

  // Technical Details
  decimals: number;
  derivationPath: string;
  coinType: number;

  // Network Info (native coins)
  chainName?: string;
  tatumChainId?: string;
  explorerUrl?: string;
  blockConfirmations?: number;

  // Token Info (tokens)
  networks?: Array<{
    networkCode: string;
    contractAddress: string;
    tokenStandard: string;
  }>;

  // Tatum Support
  tatumSupported: boolean;
  kmsChainCode?: string;
}
```

---

## 🔐 KMS Wallet Generation

For **native coins** that support Tatum KMS:

```bash
🔐 Generating KMS Wallet...
Generate KMS wallet for SOL? y
Enter KMS password: ****

🔧 Running: docker exec -i cryptic-kms \
    node /opt/app/dist/index.js generatemanagedwallet SOL

{
  "signatureId": "abc-123-def-456",
  "xpub": "xpub6D4BDPcP2GT577Vvch3R8wjR9V2s..."
}

✅ KMS Wallet created: wallet_xyz789
   Signature ID: abc-123-def-456
   xPub: xpub6D4BDPcP2GT577...
```

**Stored in database**:
```sql
INSERT INTO kms_wallets (
  networkId = 'solana_id',
  signatureId = 'abc-123-def-456',
  xpub = 'xpub6D4BDPcP2GT577...',
  derivationPath = "m/44'/501'/0'/0'",
  purpose = 'DEPOSIT',
  status = 'ACTIVE'
)
```

---

## 🎨 Token Standards Supported

| Standard | Networks | Example Tokens |
|----------|----------|---------------|
| **ERC-20** | Ethereum | USDT, USDC, LINK, UNI |
| **BEP-20** | BSC | USDT, BUSD, CAKE |
| **Polygon** | Polygon | USDC, USDT, WETH |
| **TRC-20** | Tron | USDT, USDC |
| **SPL** | Solana | USDC, USDT |

---

## ⚡ BIP44 Coin Types Reference

| Coin | Coin Type | Derivation Path |
|------|-----------|----------------|
| Bitcoin (BTC) | 0 | m/44'/0'/0'/0 |
| Litecoin (LTC) | 2 | m/44'/2'/0'/0 |
| Dogecoin (DOGE) | 3 | m/44'/3'/0'/0 |
| Ethereum (ETH) | 60 | m/44'/60'/0'/0 |
| Bitcoin Cash (BCH) | 145 | m/44'/145'/0'/0 |
| Tron (TRX) | 195 | m/44'/195'/0'/0 |
| Solana (SOL) | 501 | m/44'/501'/0'/0' |
| Polkadot (DOT) | 354 | m/44'/354'/0'/0 |
| Avalanche (AVAX) | 9000 | m/44'/9000'/0'/0 |

Full list: https://github.com/satoshilabs/slips/blob/master/slip-0044.md

---

## 🧪 Testing After Adding Coin

### 1. Verify Database Entries
```bash
npx prisma studio

# Check tables:
# - assets (symbol, name, type)
# - networks (code, tatumChainId)
# - asset_networks (links)
# - kms_wallets (signatureId, xpub)
```

### 2. Test Invoice Creation
```typescript
// Dashboard or API
const invoice = await trpc.invoice.create({
  merchantId: "merchant_123",
  amount: 10,
  currency: "SOL",  // ← Your new coin
  network: "solana"
})

// Should create unique address and webhook
```

### 3. Test Address Generation
```bash
npm run kms:test-addresses

# Should show your new coin's addresses
```

---

## 🎯 Supported Coin Categories

### ✅ Currently Easy to Add
- **EVM Chains**: Any Ethereum-compatible chain
- **EVM Tokens**: Any ERC-20, BEP-20, Polygon token
- **UTXO Coins**: Bitcoin forks (requires different derivation)
- **Tron**: TRX and TRC-20 tokens
- **Solana**: SOL and SPL tokens (if Tatum supports)

### ⚠️ Requires Custom Work
- **Cosmos Ecosystem**: ATOM, OSMO (different signing)
- **Polkadot**: DOT (different key derivation)
- **Cardano**: ADA (different model entirely)
- **Ripple**: XRP (account-based, not HD)

---

## 🔄 Future AI Integration

### Phase 1: Manual Input (Current)
- User provides coin details manually
- AI prompt template shows what's needed
- Tool creates database entries

### Phase 2: AI Research (Coming Soon)
```typescript
// Call Claude API
const response = await callClaudeAPI({
  prompt: aiPrompt,
  model: "claude-3-sonnet-20240229"
});

// Parse AI response
const coinData = JSON.parse(response.content);

// Auto-populate all fields
```

### Phase 3: Full Automation
- Just provide coin symbol
- AI researches everything
- Validates contract addresses
- Checks Tatum support
- Creates database entries
- Generates wallets
- Tests invoice creation

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `scripts/ai-add-coin.ts` | Main AI tool script |
| `scripts/add-coin.ts` | Original manual tool |
| `prisma/seed.networks.ts` | Network/asset seeding |
| `src/lib/kms/address-generator.ts` | Address generation |
| `src/lib/trpc/routers/invoice.ts` | Invoice creation |

---

## 🆘 Troubleshooting

### "Network not found for {network}"
**Solution**: The network doesn't exist in database. Add it first or check network code.

### "KMS wallet generation failed"
**Solution**:
1. Ensure Docker KMS is running: `docker ps | grep cryptic-kms`
2. Check KMS supports this coin: `docker exec cryptic-kms ls /opt/app/dist`
3. Verify password is correct

### "Contract address validation failed"
**Solution**: Double-check contract address on blockchain explorer (Etherscan, BscScan, etc.)

---

## 💡 Pro Tips

1. **Research First**: Use CoinGecko or CoinMarketCap to verify coin details before starting
2. **Test Networks**: Add testnet versions first to test without risk
3. **Backup Wallets**: Always backup KMS mnemonics before generating production wallets
4. **Verify Tatum**: Check https://docs.tatum.io/ for supported chains/tokens
5. **Start Simple**: Add native coins before adding their tokens

---

**Ready to add your first coin?** 🚀

```bash
npm run ai:add-coin
```
