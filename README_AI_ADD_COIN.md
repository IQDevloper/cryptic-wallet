# 🤖 AI-Powered Cryptocurrency Addition System

## 🚀 Quick Start

```bash
npm run ai:add-coin
```

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **`AI_ADD_COIN_GUIDE.md`** | Complete guide with examples and troubleshooting |
| **`COIN_TEMPLATE.json`** | JSON schema and template for coin definitions |
| **`scripts/ai-add-coin.ts`** | The actual AI tool implementation |

## 🎯 What This Tool Does

### Automatic Research (AI-Powered)
The AI researches and provides:
- ✅ Full coin name and description
- ✅ Network type detection (EVM, UTXO, TRON, SOLANA)
- ✅ Technical specifications (decimals, BIP44 paths)
- ✅ Contract addresses across multiple networks
- ✅ Tatum API compatibility check
- ✅ KMS wallet support verification

### Database Setup
Automatically creates:
- ✅ **Network** entries (for native coins)
- ✅ **Asset** entries
- ✅ **AssetNetwork** links
- ✅ **KmsWallet** (optional, for deposits)

### Ready for Production
After adding a coin, you can immediately:
- ✅ Create invoices in this currency
- ✅ Generate unique payment addresses
- ✅ Monitor payments via webhooks
- ✅ Track merchant balances

---

## 📋 How to Use

### Step 1: Start the Tool
```bash
npm run ai:add-coin
```

### Step 2: Provide Coin Symbol
```
🪙 Enter cryptocurrency symbol: SOL
💡 Any hints for AI? Solana blockchain
```

### Step 3: AI Research
The AI will research and provide complete details:
```json
{
  "symbol": "SOL",
  "name": "Solana",
  "networkType": "SOLANA",
  "isNative": true,
  "decimals": 9,
  "derivationPath": "m/44'/501'/0'/0'",
  "tatumChainId": "solana-mainnet",
  "kmsChainCode": "SOL"
}
```

### Step 4: Confirm and Create
```
✅ Proceed with this configuration? y

🚀 Creating database entries...
📊 Creating Network: Solana
💰 Creating Asset: SOL
🔗 Creating Asset-Network Relationships
🔐 Generating KMS Wallet

✅ Successfully added SOL to the system!
```

---

## 🎓 Supported Coin Types

### Native Coins (Examples)
- **Bitcoin** (BTC) - UTXO
- **Ethereum** (ETH) - EVM
- **Solana** (SOL) - SOLANA
- **Tron** (TRX) - TRON
- **Avalanche** (AVAX) - EVM
- **Polygon** (MATIC) - EVM

### Tokens (Examples)
- **USDT** - ERC-20, BEP-20, TRC-20, Polygon
- **USDC** - ERC-20, BEP-20, Polygon
- **LINK** - ERC-20, BEP-20, Polygon
- **UNI** - ERC-20

---

## 🏗️ Network Type Reference

### EVM (Ethereum Virtual Machine)
```
Networks: Ethereum, BSC, Polygon, Arbitrum, Avalanche, Optimism
Derivation: m/44'/60'/0'/0 (all use ETH path)
Confirmations: 12 blocks
```

### UTXO (Unspent Transaction Output)
```
Networks: Bitcoin, Litecoin, Dogecoin, Bitcoin Cash
Derivation: m/44'/{coinType}'/0'/0
  - Bitcoin (0)
  - Litecoin (2)
  - Dogecoin (3)
Confirmations: 6 blocks
```

### TRON
```
Network: Tron
Derivation: m/44'/195'/0'/0
Confirmations: 19 blocks
```

### SOLANA
```
Network: Solana
Derivation: m/44'/501'/0'/0'
Confirmations: 32 blocks
```

---

## 📊 Template Structure

### For Native Coins:
```json
{
  "symbol": "SOL",
  "name": "Solana",
  "isNative": true,
  "networkType": "SOLANA",
  "decimals": 9,
  "coinType": 501,
  "derivationPath": "m/44'/501'/0'/0'",
  "chainName": "Solana",
  "tatumChainId": "solana-mainnet",
  "explorerUrl": "https://explorer.solana.com",
  "blockConfirmations": 32,
  "kmsChainCode": "SOL"
}
```

### For Tokens:
```json
{
  "symbol": "USDC",
  "name": "USD Coin",
  "isNative": false,
  "networkType": "EVM",
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
    }
  ]
}
```

---

## 🧪 Testing After Addition

### 1. Check Database
```bash
npx prisma studio
```

Verify:
- ✅ Asset created in `assets` table
- ✅ Network created in `networks` table (if native)
- ✅ Link created in `asset_networks` table
- ✅ Wallet created in `kms_wallets` table (if native)

### 2. Test Invoice Creation
```typescript
const invoice = await trpc.invoice.create({
  merchantId: "merchant_123",
  amount: 10,
  currency: "SOL",  // Your new coin
  network: "solana"
});

// Should return:
// - invoiceId
// - depositAddress (unique)
// - qrCodeData
// - expiresAt
```

### 3. Test Address Generation
```bash
npm run kms:test-addresses
```

Should show addresses for your new coin.

---

## 🎯 Common Use Cases

### Adding Solana (SOL)
```bash
$ npm run ai:add-coin
Symbol: SOL
Type: Native coin
Network: SOLANA
Result: Ready for SOL payments
```

### Adding USDC Token
```bash
$ npm run ai:add-coin
Symbol: USDC
Type: Token
Networks: Ethereum, BSC, Polygon
Result: Ready for USDC on 3 networks
```

### Adding Avalanche (AVAX)
```bash
$ npm run ai:add-coin
Symbol: AVAX
Type: Native coin (EVM)
Network: Avalanche
Result: Ready for AVAX payments
```

---

## 🔍 AI Research Process

### What AI Researches:

1. **Basic Info**
   - Full name
   - Description
   - Native vs Token

2. **Technical Details**
   - Decimals
   - BIP44 coin type
   - Derivation path
   - Network type

3. **Blockchain Info** (if native)
   - Chain name
   - Explorer URL
   - Block confirmations
   - Tatum chain ID

4. **Token Info** (if token)
   - Networks deployed on
   - Contract addresses
   - Token standards

5. **Tatum Support**
   - API support status
   - KMS chain code

### AI Response Format:
```typescript
interface AIResearchedCoin {
  symbol: string;
  name: string;
  description: string;
  networkType: 'EVM' | 'UTXO' | 'TRON' | 'SOLANA';
  isNative: boolean;
  decimals: number;
  // ... complete structure in COIN_TEMPLATE.json
}
```

---

## 💡 Pro Tips

### Before Adding:
1. ✅ Research the coin on CoinGecko/CoinMarketCap
2. ✅ Verify contract addresses on blockchain explorers
3. ✅ Check Tatum docs for support status
4. ✅ Ensure KMS Docker is running (for native coins)

### For Tokens:
1. ✅ Verify on **Etherscan** (Ethereum)
2. ✅ Verify on **BscScan** (BSC)
3. ✅ Verify on **PolygonScan** (Polygon)
4. ✅ Check token decimals match across networks

### For Native Coins:
1. ✅ Find correct BIP44 coin type
2. ✅ Determine block confirmation requirements
3. ✅ Test on testnet first if available
4. ✅ Backup KMS mnemonic before generating wallet

---

## 🆘 Common Issues

### "Network not found"
**Solution**: Add the network first, or check network code matches.

### "KMS generation failed"
**Solution**:
```bash
# Check Docker is running
docker ps | grep cryptic-kms

# Check KMS supports coin
docker exec cryptic-kms ls /opt/app/dist
```

### "Invalid contract address"
**Solution**: Verify on blockchain explorer:
- Ethereum: https://etherscan.io
- BSC: https://bscscan.com
- Polygon: https://polygonscan.com

---

## 📦 Complete File Structure

```
cryptic-wallet/
├── AI_ADD_COIN_GUIDE.md          # Complete guide
├── COIN_TEMPLATE.json            # JSON schema template
├── README_AI_ADD_COIN.md         # This file (quick reference)
├── scripts/
│   └── ai-add-coin.ts            # AI tool implementation
└── package.json
    └── "ai:add-coin": "tsx scripts/ai-add-coin.ts"
```

---

## 🔗 Related Documentation

- **Tatum API Docs**: https://docs.tatum.io/
- **BIP44 Coin Types**: https://github.com/satoshilabs/slips/blob/master/slip-0044.md
- **Token Standards**: https://ethereum.org/en/developers/docs/standards/tokens/
- **Simplified Architecture**: `SIMPLIFIED_ARCHITECTURE.md`
- **Webhook Setup**: `TATUM_WEBHOOK_SETUP.md`

---

## 🚀 Ready to Start?

```bash
npm run ai:add-coin
```

The AI will guide you through everything! 🎉
