# 💸 Withdrawal Guide - How to Get Your Funds Out

## 🎯 Your Specific Case: 26 BAT Tokens

### What You Received:

**Transaction Details:**
- **Asset**: Basic Attention Token (BAT)
- **Amount**: 26 BAT
- **Network**: Ethereum (ERC-20)
- **Deposit Address**: `0x04a4b35543f873e9cd86a74f629d97765ef3371f`
- **From**: `0x0639556f03714a74a5feeaf5736a4a64ff70d206`
- **Transaction Hash**: `0x379fd5af84d54596cfb631b8efd1f45a1dfe38f3bbb4cc4aa6ebfe968ad10f5f`
- **Block**: 23719095
- **Chain**: Ethereum Mainnet

**Status**: ✅ Transaction confirmed on blockchain

### Why `asset: undefined`?

The Tatum webhook sometimes doesn't include the token symbol in the payload, but we can identify it by:
1. The invoice details (which currency was requested)
2. The contract address (BAT has a known contract)
3. The network (Ethereum ERC-20)

---

## 💰 Where Are Your Funds?

### Current Location:

Your 26 BAT tokens are stored in:

```
📍 Location: Merchant's Deposit Address
   Address: 0x04a4b35543f873e9cd86a74f629d97765ef3371f

🔐 Security: KMS Wallet (Tatum Key Management System)
   Signature ID: [Your KMS wallet signature ID]

💼 Ownership: Your Merchant Account
   Merchant ID: [Your merchant ID]

📊 Balance Type: Available Balance
   Amount: 26 BAT (minus any fees)
```

### Security Architecture:

```
┌──────────────────────────────────────────────────┐
│  Blockchain (Ethereum Mainnet)                   │
│  └─ Deposit Address: 0x04a4b35...                │
│     └─ Balance: 26 BAT                           │
└──────────────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────────────┐
│  Tatum KMS (Secure Private Keys)                 │
│  └─ Signature ID: e04e8c5e...                    │
│     └─ Can sign transactions for withdrawals     │
└──────────────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────────────┐
│  Your Database (Merchant Balance)                │
│  └─ Merchant Wallet                              │
│     └─ Available Balance: 26 BAT                 │
└──────────────────────────────────────────────────┘
```

---

## 🏦 How to Withdraw Your BAT

### Method 1: Using the Dashboard (Recommended)

1. **Navigate to Merchant Dashboard**
   ```
   http://localhost:3000/dashboard/merchants/{your-merchant-id}
   ```

2. **Go to "Withdrawal" Tab**
   - You'll see your available balances
   - BAT balance should show: 26 BAT on Ethereum

3. **Fill Withdrawal Form**:
   - **Currency**: BAT
   - **Amount**: 26 (or less if you want to keep some)
   - **Target Network**: Ethereum (or another network if BAT is on multiple networks)
   - **Target Address**: Your personal wallet address (e.g., MetaMask)
     ```
     Example: 0xYourPersonalWalletAddress...
     ```

4. **Review Fees**:
   - **Network Fee**: ~$10-30 (Ethereum gas fees)
   - **System Fee**: Variable (check dashboard)
   - **You Receive**: 26 BAT minus fees

5. **Confirm Withdrawal**
   - Click "Withdraw"
   - System will:
     1. Create withdrawal request
     2. Use KMS to sign transaction
     3. Broadcast to Ethereum network
     4. Update your balance

6. **Track Status**:
   - **Pending**: Transaction submitted
   - **Processing**: Waiting for confirmations
   - **Completed**: Funds in your wallet!

### Method 2: Using the API

```bash
curl -X POST https://your-domain.com/api/trpc/merchant.requestWithdrawal \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "merchantId": "your-merchant-id",
    "currency": "BAT",
    "amount": 26,
    "targetNetwork": "ethereum",
    "targetAddress": "0xYourPersonalWalletAddress"
  }'
```

**Response:**
```json
{
  "success": true,
  "withdrawalId": "wd_abc123...",
  "status": "PENDING",
  "txHash": "0xabcdef...",
  "estimatedTime": "2-5 minutes"
}
```

---

## 🔧 How Withdrawals Work (Technical Flow)

### Step-by-Step Process:

```
1. User Requests Withdrawal
   └─ Dashboard form or API call
   └─ Validates: balance, address, network

2. System Creates Withdrawal Record
   └─ Database: withdrawals table
   └─ Status: PENDING
   └─ Locks balance (prevents double-spend)

3. KMS Signs Transaction
   └─ Calls Tatum KMS: "Sign this transaction"
   └─ KMS uses private key (never leaves KMS)
   └─ Returns signed transaction

4. Broadcast to Blockchain
   └─ Sends signed transaction to Ethereum network
   └─ Gets transaction hash
   └─ Updates withdrawal: Status → PROCESSING

5. Wait for Confirmations
   └─ Monitors blockchain for confirmations
   └─ Ethereum: ~12 blocks (~3 minutes)
   └─ Updates withdrawal: Status → COMPLETED

6. Update Balances
   └─ Deducts amount + fees from merchant balance
   └─ Records transaction in database
   └─ Sends confirmation webhook/email
```

### KMS Command for Signing:

When you request a withdrawal, the system runs:

```bash
# Example KMS signing command (happens automatically)
docker exec -i cryptic-kms node /opt/app/dist/index.js signandbroadcast \
  --chain ETH \
  --from 0x04a4b35543f873e9cd86a74f629d97765ef3371f \
  --to 0xYourPersonalWalletAddress \
  --amount 26 \
  --token 0x0D8775F648430679A709E98d2b0Cb6250d2887EF \
  --signatureId e04e8c5e-fa09-4577-8506-b084069a3877
```

**Output:**
```json
{
  "txHash": "0x123abc...",
  "status": "success"
}
```

---

## 💡 Important Notes

### Network Fees (Gas):

Ethereum gas fees can be expensive:
- **Low Traffic**: $5-10
- **Medium Traffic**: $10-30
- **High Traffic**: $30-100+

**Tip**: Check gas prices before withdrawing:
- https://etherscan.io/gastracker
- Withdraw during off-peak hours (weekends, late night UTC)

### Minimum Withdrawal Amounts:

Because of gas fees, it's recommended to withdraw larger amounts:
- **Below $50**: Not recommended (fees eat into balance)
- **$50-$100**: Consider carefully
- **Above $100**: Fees are a smaller percentage

For your 26 BAT (~$10-20), gas fees might be ~50% of the value!

**Better Strategy**:
1. Wait until you have more BAT (e.g., 100+ BAT)
2. Or convert to a cheaper network token first
3. Or use Layer 2 solutions (if available)

### Multi-Network Tokens:

Some tokens (like USDC, USDT) are available on multiple networks:
- **Ethereum**: High fees, most secure
- **BSC**: Lower fees (~$0.50)
- **Polygon**: Very low fees (~$0.01)
- **Tron**: Low fees (~$1)

If BAT were available on multiple networks, you could choose the cheapest!

### Bridging (If Needed):

If you want to withdraw to a different network than where funds are stored:

```
Your Balance: 26 BAT on Ethereum
You Want: BAT on BSC (cheaper fees)

System Will:
1. Bridge from Ethereum → BSC (fee: ~$5)
2. Then withdraw on BSC (fee: ~$0.50)
Total Fees: ~$5.50 vs $30 direct Ethereum withdrawal
```

---

## 🚨 Safety Tips

### Before Withdrawing:

1. **Double-check the address**:
   - BAT is ERC-20, needs Ethereum address
   - Wrong address = funds lost forever
   - Use a fresh address from MetaMask/Trust Wallet

2. **Test with small amount first**:
   - Withdraw 1 BAT first to verify it works
   - Then withdraw the rest

3. **Check network compatibility**:
   - Ethereum addresses start with `0x`
   - 42 characters long (including 0x)
   - Case-insensitive but checksum matters

4. **Save transaction hash**:
   - You'll get a TX hash like `0x379fd5...`
   - Track it on Etherscan.io
   - Proof of withdrawal

### Security Best Practices:

✅ **DO**:
- Use hardware wallet (Ledger, Trezor) for receiving
- Keep private keys secure
- Enable 2FA on merchant account
- Verify addresses character-by-character

❌ **DON'T**:
- Don't send to exchange deposit address (may have minimum)
- Don't use addresses from screenshots (potential typo)
- Don't rush (gas fees won't change in 5 minutes)
- Don't withdraw to smart contract addresses

---

## 📊 Check Your Current Balance

### Using Dashboard:

```
1. Go to: /dashboard/merchants/{your-merchant-id}
2. Look for "Balances" section
3. Find BAT row:

   Currency | Network  | Available | Pending | Actions
   ---------|----------|-----------|---------|--------
   BAT      | Ethereum | 26.00     | 0.00    | [Withdraw]
```

### Using API:

```bash
curl -X GET https://your-domain.com/api/trpc/merchant.getBalances?merchantId=YOUR_ID \
  -H "Authorization: Bearer YOUR_API_KEY"
```

**Response:**
```json
{
  "balances": [
    {
      "currency": "BAT",
      "network": "ethereum",
      "availableBalance": "26.00",
      "pendingBalance": "0.00",
      "lockedBalance": "0.00"
    }
  ]
}
```

---

## 🎓 Summary

**Your 26 BAT:**
- ✅ Safely stored in KMS wallet
- ✅ Associated with your merchant account
- ✅ Can be withdrawn anytime

**To Withdraw:**
1. Use dashboard withdrawal form
2. Enter your personal wallet address
3. Pay network fees (~$10-30 for Ethereum)
4. Wait 3-5 minutes for confirmations
5. Funds arrive in your wallet!

**Recommendation**:
Given the high Ethereum gas fees, consider:
- Waiting until you have more BAT (~100+)
- Or accepting that gas fees will be significant
- Or checking if BAT can be bridged to cheaper network

---

## 🆘 Troubleshooting

### "Insufficient Balance" Error

**Cause**: Trying to withdraw more than available
**Solution**: Check available balance, subtract fees

### "Invalid Address" Error

**Cause**: Target address is not valid Ethereum address
**Solution**:
- Must start with `0x`
- Must be 42 characters
- Use address from MetaMask/Trust Wallet

### "Gas Price Too High" Warning

**Cause**: Ethereum network is congested
**Solution**:
- Wait for lower gas prices
- Check https://etherscan.io/gastracker
- Withdraw during off-peak hours

### Withdrawal Stuck on "Pending"

**Cause**: Transaction waiting for blockchain confirmations
**Solution**:
- Check transaction on Etherscan
- Wait for 12 confirmations (~3 minutes)
- If stuck >10 minutes, contact support

---

## 📞 Need Help?

Contact support with:
- Your merchant ID
- Transaction hash
- Screenshot of error
- Amount and currency

---

**Your funds are safe and can be withdrawn anytime!** 🎉
