# 🤖 AI Integration Setup Guide

## Overview

The AI-powered coin addition tool now uses **Claude Sonnet 4.5** (the latest model as of January 2025) to automatically research cryptocurrency details and configure them in your system.

---

## 🔑 Get Your Anthropic API Key

### Step 1: Create Account
1. Visit https://console.anthropic.com/
2. Sign up or log in
3. Navigate to **API Keys** section

### Step 2: Generate API Key
1. Click **"Create Key"**
2. Name it: `cryptic-gateway-coin-research`
3. Copy the API key (starts with `sk-ant-...`)

### Step 3: Add to Environment
```bash
# Edit .env file
ANTHROPIC_API_KEY="sk-ant-api03-xxxxx..."
```

---

## 💰 Pricing (Very Affordable)

**Claude Sonnet 4.5 Pricing** (Latest Model):
- **Input**: $3 per million tokens (~$0.003 per 1K tokens)
- **Output**: $15 per million tokens (~$0.015 per 1K tokens)

**Cost per Coin Research**:
- Input: ~800 tokens = $0.0024
- Output: ~400 tokens = $0.006
- **Total: ~$0.01 per coin** 💵

Even researching 100 coins = **~$1.00** 🎉

### Available Models:

You can change the model in the script if needed:

| Model | API ID | Best For | Cost |
|-------|--------|----------|------|
| **Claude Sonnet 4.5** | `claude-sonnet-4-5-20250929` | Most capable, recommended | $3/$15 per million tokens |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Fastest, cheapest | $1/$5 per million tokens |
| Claude Opus 4.1 | `claude-opus-4-1-20250805` | Complex reasoning | $15/$75 per million tokens |

---

## 🚀 Usage

### Basic Usage (AI Mode)
```bash
npm run ai:add-coin

# AI will automatically research:
🪙 Enter cryptocurrency symbol: SOL
💡 Any hints for AI: (optional)

🔍 Calling Claude AI...
✅ AI Response received!

{
  "symbol": "SOL",
  "name": "Solana",
  "networkType": "SOLANA",
  "isNative": true,
  "decimals": 9,
  ...complete details...
}

✅ Proceed with this configuration? y
```

### Fallback to Manual Mode
If AI fails (no API key, rate limit, etc.):
```bash
❌ AI Research Failed: API key not found
⚠️  Falling back to manual input...

# Tool continues with manual input mode
Coin Symbol: SOL
Full Name: Solana
...
```

---

## 🎯 What AI Researches

### For Every Coin, AI Provides:

1. **Basic Information**
   - ✅ Full name
   - ✅ Description
   - ✅ Native coin vs Token

2. **Network Classification**
   - ✅ Network type (EVM, UTXO, TRON, SOLANA)
   - ✅ Multi-network deployment (for tokens)

3. **Technical Specifications**
   - ✅ Decimals
   - ✅ BIP44 coin type
   - ✅ Derivation path
   - ✅ Block confirmations

4. **Contract Addresses** (for tokens)
   - ✅ Ethereum (ERC-20)
   - ✅ BSC (BEP-20)
   - ✅ Polygon
   - ✅ Arbitrum
   - ✅ Tron (TRC-20)

5. **Blockchain Details** (for native coins)
   - ✅ Chain name
   - ✅ Explorer URL
   - ✅ Tatum chain ID

6. **Integration Details**
   - ✅ Tatum API support
   - ✅ KMS chain code
   - ✅ Logo URL

---

## 📊 AI Response Examples

### Example 1: Solana (Native Coin)
```json
{
  "symbol": "SOL",
  "name": "Solana",
  "description": "High-performance blockchain supporting smart contracts and DeFi",
  "networkType": "SOLANA",
  "isNative": true,
  "decimals": 9,
  "derivationPath": "m/44'/501'/0'/0'",
  "coinType": 501,
  "chainName": "Solana",
  "tatumChainId": "solana-mainnet",
  "explorerUrl": "https://explorer.solana.com",
  "blockConfirmations": 32,
  "logoUrl": "https://cryptologos.cc/logos/solana-sol-logo.png",
  "tatumSupported": true,
  "kmsChainCode": "SOL"
}
```

### Example 2: USDC (Multi-Network Token)
```json
{
  "symbol": "USDC",
  "name": "USD Coin",
  "description": "Fully-backed dollar stablecoin by Circle and Coinbase",
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
  "logoUrl": "https://cryptologos.cc/logos/usd-coin-usdc-logo.png",
  "tatumSupported": true
}
```

### Example 3: Avalanche (EVM Native)
```json
{
  "symbol": "AVAX",
  "name": "Avalanche",
  "description": "Smart contracts platform for decentralized applications",
  "networkType": "EVM",
  "isNative": true,
  "decimals": 18,
  "derivationPath": "m/44'/9000'/0'/0",
  "coinType": 9000,
  "chainName": "Avalanche",
  "tatumChainId": "avalanche-mainnet",
  "explorerUrl": "https://snowtrace.io",
  "blockConfirmations": 12,
  "logoUrl": "https://cryptologos.cc/logos/avalanche-avax-logo.png",
  "tatumSupported": true,
  "kmsChainCode": "AVAX"
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Required for AI mode
ANTHROPIC_API_KEY="sk-ant-api03-xxxxx..."

# Optional: Model selection (default: claude-sonnet-4-5-20250929)
# You can change this to use different models:
# - claude-sonnet-4-5-20250929 (recommended, most capable)
# - claude-haiku-4-5-20251001 (fastest, cheapest)
# - claude-opus-4-1-20250805 (best reasoning)
```

To change the model, edit line 223 in `scripts/ai-add-coin.ts`:
```typescript
model: 'claude-sonnet-4-5-20250929',  // Change this
```

### Custom AI Prompt

The AI prompt is in the `aiResearchCoin()` function in `scripts/ai-add-coin.ts`.

To customize what AI researches, edit the prompt starting at line 136.

---

## 🧪 Testing AI Integration

### Test 1: Basic Coin Research
```bash
npm run ai:add-coin

# Enter: BTC
# Expected: Complete Bitcoin details
```

### Test 2: Token Research
```bash
npm run ai:add-coin

# Enter: LINK
# Expected: Chainlink with ERC-20, BEP-20, Polygon contracts
```

### Test 3: New Coin
```bash
npm run ai:add-coin

# Enter: AVAX
# Expected: Avalanche with EVM configuration
```

---

## 🔍 How It Works

### Workflow:

```
1. User Input
   ├── Coin Symbol: SOL
   └── Optional Hint: "Solana blockchain"
       │
       ▼
2. Call Claude API
   ├── Send research prompt
   ├── Include coin symbol and hints
   └── Request structured JSON response
       │
       ▼
3. AI Research
   ├── Analyzes cryptocurrency
   ├── Determines network type
   ├── Finds technical specs
   ├── Locates contract addresses
   └── Verifies Tatum support
       │
       ▼
4. Parse Response
   ├── Extract JSON from response
   ├── Remove markdown formatting
   ├── Validate required fields
   └── Return structured data
       │
       ▼
5. Database Creation
   ├── Create Network (if native)
   ├── Create Asset
   ├── Create AssetNetwork links
   └── Generate KMS wallet (optional)
```

---

## ⚠️ Error Handling

### No API Key
```
❌ AI Research Failed: API key not found
⚠️  Falling back to manual input...

# Tool continues with manual mode
```

### Rate Limit
```
❌ AI Research Failed: Rate limit exceeded
⚠️  Falling back to manual input...

# Retry in a few minutes or use manual mode
```

### Invalid Response
```
❌ AI Research Failed: Invalid JSON response
⚠️  Falling back to manual input...

# AI response will be shown for debugging
```

### Network Error
```
❌ AI Research Failed: Network request failed
⚠️  Falling back to manual input...

# Check internet connection
```

---

## 💡 Pro Tips

### 1. Provide Hints for Better Results
```bash
# Good hints:
💡 Hint: Solana blockchain
💡 Hint: Dollar stablecoin on multiple networks
💡 Hint: Avalanche C-Chain EVM compatible

# Bad hints:
💡 Hint: crypto
💡 Hint: coin
```

### 2. Verify AI Results
Always review AI responses before confirming:
```bash
📋 AI Research Results:
{...}

✅ Proceed? y  # Review first!
```

### 3. Test on Testnet First
```bash
# Add testnet version first
Symbol: ETH
Hint: Ethereum Sepolia testnet

# Then add mainnet
Symbol: ETH
Hint: Ethereum mainnet
```

### 4. Batch Research
Research multiple coins in one session:
```bash
# Run tool multiple times
npm run ai:add-coin  # SOL
npm run ai:add-coin  # AVAX
npm run ai:add-coin  # LINK
```

---

## 🔒 Security

### API Key Safety
- ✅ Never commit `.env` to git
- ✅ Use environment-specific keys
- ✅ Rotate keys periodically
- ✅ Set usage limits in Anthropic console

### Data Validation
- ✅ AI responses are validated
- ✅ Contract addresses are checksummed
- ✅ Network types are restricted to known values
- ✅ Decimals are range-checked

---

## 📊 Cost Optimization

### Reduce AI Usage Costs:

1. **Use Manual Mode for Known Coins**
   ```bash
   # For well-known coins, manual input is faster
   # Save AI for obscure/new coins
   ```

2. **Batch Research**
   ```bash
   # Research multiple coins in one AI call
   # (Future enhancement)
   ```

3. **Cache Results**
   ```bash
   # Save AI responses for reuse
   # (Future enhancement)
   ```

---

## 🚀 Quick Start Checklist

- [ ] Get Anthropic API key
- [ ] Add `ANTHROPIC_API_KEY` to `.env`
- [ ] Install dependencies: `npm install`
- [ ] Test: `npm run ai:add-coin`
- [ ] Enter test coin: `BTC`
- [ ] Verify AI response
- [ ] Confirm and create in database
- [ ] Test invoice creation with new coin

---

## 📚 Related Documentation

- **Complete Guide**: `AI_ADD_COIN_GUIDE.md`
- **Template Reference**: `COIN_TEMPLATE.json`
- **Quick Reference**: `README_AI_ADD_COIN.md`
- **Anthropic Docs**: https://docs.anthropic.com/

---

## 🆘 Troubleshooting

### "ANTHROPIC_API_KEY is not set"
```bash
# Add to .env
ANTHROPIC_API_KEY="sk-ant-api03-xxxxx..."

# Verify
grep ANTHROPIC_API_KEY .env
```

### "AI response is empty"
```bash
# Check API key is valid
# Check internet connection
# Check Anthropic console for errors
```

### "Invalid JSON response"
```bash
# AI response format changed
# Check console output
# Report issue with response text
```

---

**Ready to use AI-powered coin research!** 🤖

```bash
npm run ai:add-coin
```

The AI will handle all the research for you! 🎉
