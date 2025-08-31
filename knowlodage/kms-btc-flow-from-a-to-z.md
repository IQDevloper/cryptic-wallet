# Bitcoin Flow from A to Z (KMS)

This guide covers using the Tatum Key Management System (KMS) on Bitcoin (and similar blockchains) to generate wallets, private keys, blockchain addresses, and sign transactions locally using KMS.

> 📘 The following steps and examples are based on Bitcoin (Testnet).

> 🚧 Mind the KMS flag "--testnet" for testnet operations.

## Steps

### Step_1: Generate a BTC Wallet (Mnemonic)

To generate a wallet managed by KMS, use the command `generatemanagedwallet` in **CLI mode**.

**Request Example**:

- The response contains your **wallet mnemonic's signature ID** as the first parameter

```shell
tatum-kms --path=wallet.dat --testnet generatemanagedwallet BTC

Enter password to access wallet storage:*****

#Response:
{
  "xxx-59be-4792-81c5-yyy": {
    "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
    "xpub": "tpubBCDEF"
  }
}
```

> 📘 Be mindful of [Tatum's Derivation Path](https://docs.tatum.io/docs/mnemonic-derivation-path).

> 🚧 When you first use KMS, you will be prompted to enter a password to encrypt your data. This password is created the first time you enter it, and you should store it in a safe place.

### Step_2: Generate a PrivateKey

PrivateKeys are used to authorize transfers of funds from blockchain addresses. Use the `getprivatekey` command to generate a private key.

**Request Example:**

- Your wallet mnemonic's **signature ID**  
  Signature ID is the first parameter in the **Response** from **Step_1 - Generate a managed wallet**.
- The **derivation index** of the private key you are generating  
  A derivation index can be any value but it must be unique to the wallet you are generating. You may start at “0” (as in the response example above) and work chronologically.
- The response is the PrivateKey of the derivation index that you have specified

```shell
tatum-kms --path=wallet.dat --testnet getprivatekey xxx-59be-4792–81c5-yyy 0

#Response:
{
  "privateKey": "XXXNAV3tX3vWPG4uThixuqdYYY"
}
```

### Step_3: Generate a Blockchain Address

Create an address for the private key that you just generated. You can receive funds to the address and use the private key to send them from the address.

Use the `getaddress ****` command to generate an address for the same derivation index (0) that you specified in **Step_2 - Generate a PrivateKey**.

**Request Example:**

- Your wallet mnemonic's **signature ID**
- The **derivation index** of the address you are generating — the same derivation index that you specified in **Step_2 - Generate a PrivateKey**.
- The response will contain the address you have just generated

```shell
tatum-kms --path=wallet.dat --testnet getaddress xxx-59be-4792–81c5-yyy 0

#Respnse:
{
  "address": "AAAA3JPvMuwgpKovMTjBBB"
}
```

### Step_4: Store the PrivateKey in your Wallet

Store the PrivateKey that you have just generated in the wallet using the `storemanagedprivatekey` command.

**Request Example**:

- The response will contain the **signature ID** of the private key, which you can then use to sign transactions

```shell
tatum-kms --path=wallet.dat --testnet storemanagedprivatekey BTC

#When prompted, enter the PrivateKey and the password that you created earlier in this guide.

Enter private key to store:XXXNAV3tX3vWPG4uThixuqdYYY
Enter password to access wallet store:******

#Response:
{
 "signatureId": "QQQ-4b41-4ec9-b66c-WWW"
}

#Now you can export the wallet and review it. Enter the following command to export:
tatum-kms --path=wallet.dat --testnet export

#When prompted, enter your password. 
#The response will give you details about your wallet:
{
 "QQQ-4b41-4ec9-b66c-WWW": {
   "privateKey": "XXXNAV3tX3vWPG4uThixuqdYYY",
   "chain": "BTC",
   "testnet": true
 },
 "xxx-59be-4792-81c5-yyy": {
   "mnemonic": "urge pulp usage sister evidence arrest palm math please chief egg abuse",
   "xpub": "tpubBCDEF",
   "chain": "BTC",
   "testnet": true
 }
}
```

### Step_5: Enable KMS to run in Daemon mode - waiting for transactions to sign

**Daemon mode** is essentially KMS running in the background and listening for pending transactions to sign and broadcast them.

- Transactions to sign are identified via the API key.
- You can filter transactions by blockchain.

To enable Daemon mode, enter the code below on your local server.

**Request Example:**

- Find **Pending** transaction to sign by KMS using the following [v3 REST API endpoint](https://docs.tatum.io/reference/getpendingtransactionstosign#operation/GetPendingTransactionsToSign).
- KMS frequency checks for pending transactions to sign may be changed using the [period parameter](https://github.com/tatumio/tatum-kms/blob/master/README.md#change-the-frequency-of-checking-for-the-pending-transactions). 

```shell
tatum-kms daemon --path=wallet.dat --testnet --chain=BTC --api-key=your-testnet-api-key --period=10

#You must enter the password to unlock the wallet storage.
#The password is required whenever you start the daemon or restart the daemon after it stopped.
```

> 📘 By default, KMS checks for the pending transactions every 5 seconds.

### Step_6: Send test BTC to your new Address

1. Use a Bitcoin testnet faucet to get some BTC coins. You may use [Tatum faucet](https://tatum.io/faucets) 
2. See the Address generated in **Step_3 - Generate a Blockchain Address** - `AAAA3JPvMuwgpKovMTjBBB`
3. Send testnet BTC coins to your Address.

### Step_7: Initiate a BTC transaction and let KMS sign it

1. Send Bitcoin, **from Your Production Environment**, from your address to any other address.  
   Use the standard BTC transaction [v3 REST API endpoint](https://docs.tatum.io/reference/btctransferblockchain) 
2. KMS will detect a new pending transaction, sign it locally, and send the transaction to the blockchain.  
   [v3 REST API endpoint](https://docs.tatum.io/reference/getpendingtransactionstosign#operation/GetPendingTransactionsToSign)
3. KMS should also mark the transaction as **processed**so that it won't be sent to the blockchain again  
   [v3 REST API endpoint](https://docs.tatum.io/reference/completependingsignature)

> ❗️ The API key registered in KMS must match 1:1 with the API key registered to broadcast transactions from your Production environment.

**Request Example:**

- Request initiated in your Production Environment
- See Request Body Schema: **BtcTransactionFromAddressKMS**.
- Instead of using `privateKey`, for KMS it's used the `signatureId` field that contains your signature ID from **Step_4 - Store the PrivateKey in your Wallet**

```json cURL

curl --location --request POST 'https://api.tatum.io/v3/bitcoin/transaction' \
--header 'x-api-key: {YOUR_API_KEY}' \ // This key must match the one you set up in KMS
--header 'Content-Type: application/json' \
--data-raw '{
"fromAddress": [
       {
           "address": "AAAA3JPvMuwgpKovMTjBBB", //FROM STEP_ 3
           "signatureId": "QQQ-4b41-4ec9-b66c-WWW" //FROM STEP_4
       }
   ],
   "to": [
       {
           "address": "testnet-bitcoin-address",
           "value": 0.00001 //AMOUNT OF BTC TO SEND
       },
       {
           "address": "AAAA3JPvMuwgpKovMTjBBB",
           "value": 0.00007 //AMOUNT OF BTC TO send back to your sender's address 
       }
   ]
}'
//response:
{
   "signatureId": "61fe7c68cf2fbc595cbb89dd"
}
```

**When KMS picks up the pending transaction, it will output something like the following sample**:

```shell
Processing pending transaction - {
  "withdrawalId": null,
  "chain": "BTC",
  "serializedTransaction": "{\"hash\":\"81e62bdfbfc7bcb66c2a2f17335d033fd98b84c1188a7bb379a2dce9f1cda989\",\"version\":2,\"inputs\":[{\"prevTxId\":\"121702fd7acd1b2cca6bd19658009140730ba26ca67cd222c00f952a111e11f4\",\"outputIndex\":0,\"sequenceNumber\":4294967295,\"script\":\"\",\"scriptString\":\"\",\"output\":{\"satoshis\":2000,\"script\":\"76a914c8e668ee829837a2355c1e234a41f53f86b8156c88ac\"}}],\"outputs\":[{\"satoshis\":1000,\"script\":\"001487c70889f0a1d2f632d216a01472dde71f062aa7\"}],\"nLockTime\":0}",
  "hashes": [
    "b8eb99cd-ba04-4031-a65f-11d6420ebdd1"
  ],
  "index": null,
  "withdrawalResponses": null,
  "id": "61fe7c68cf2fbc595cbb89dd"
}.
```

### Step_8: Get Transaction Details

Using the KMS transaction ID from the `id` field of the response to the previous request `61fe7c68cf2fbc595cbb89dd`, use the Get transaction details - [v3 REST API endpoint ](https://docs.tatum.io/reference/getpendingtransactiontosign)

**Request Example:**

- Returns the details of the signed transaction you performed.
- The response contains a Bitcoin transaction ID in the `txId` field: `f7572ef070d381612b7594940cc73ec008e796b37a73ff031f3855d2a23c9ade`
- You can check the `txId` on any Explorer. [Example link](https://live.blockcypher.com/btc-testnet/tx/f7572ef070d381612b7594940cc73ec008e796b37a73ff031f3855d2a23c9ade/)

```json

curl --request GET
--url https://api.tatum.io/v3/kms/61fe7c68cf2fbc595cbb89dd
--header 'x-api-key: {YOUR_API_KEY}'
//Response:
{
 "withdrawalId": null,
 "chain": "BTC",
 "serializedTransaction": "{\"hash\":\"81e62bdfbfc7bcb66c2a2f17335d033fd98b84c1188a7bb379a2dce9f1cda989\",\"version\":2,\"inputs\":[{\"prevTxId\":\"121702fd7acd1b2cca6bd19658009140730ba26ca67cd222c00f952a111e11f4\",\"outputIndex\":0,\"sequenceNumber\":4294967295,\"script\":\"\",\"scriptString\":\"\",\"output\":{\"satoshis\":2000,\"script\":\"76a914c8e668ee829837a2355c1e234a41f53f86b8156c88ac\"}}],\"outputs\":[{\"satoshis\":1000,\"script\":\"001487c70889f0a1d2f632d216a01472dde71f062aa7\"}],\"nLockTime\":0}",
 "hashes": [
   "b8eb99cd-ba04-4031-a65f-11d6420ebdd1"
 ],
 "index": null,
 "withdrawalResponses": null,
 "txId": "f7572ef070d381612b7594940cc73ec008e796b37a73ff031f3855d2a23c9ade",
 "id": "61fe7c68cf2fbc595cbb89dd"
```

## Good to Know

- The wallet storage is encrypted with an AEC cipher and is stored on your local server. 
  - The password you provide is used to encrypt the Mnemonics and PrivateKeys inside the file "`wallet.dat`".
  - You must enter the password to unlock a wallet storage file.
  - The password is required whenever you start the Daemon or restart the Daemon after it stops.
  - Using the wrong password will return an error. Some of those errors may look like a [malformed UTF-8](https://docs.tatum.io/docs/kms-malformed-utf-8-data-error) 
- The API key from your Production Environment must match 1:1 with the API key used in KMS.
- Users have to generate their signature_IDs before a transaction broadcast attempt can happen. Otherwise, KMS won't know what transaction is supposed to sign.
- The only way to pass a private key or Mnemonic to KMS is by using the interactive method.
  - The command `storemanagedprivatekey` is interactive, on purpose. 
  - If the private key was non-interactive and an attacker accessed the user's CLI history, the attacker could read the private key.
- If you want to use a non-interactive method to pass a private key or Mnemonic to KMS, you will have to fork KMS
  - You can code on your fork any changes you may need.
  - Tatum does **not** provide any support for forked versions.

> ❗️ If you lose your password, you will lose access to your Mnemonics and PrivateKeys. **Tatum cannot help you.**