# Tatum's Derivation Path

In blockchain technology, the **Derivation path** is a critical element of a wallet structure. The Derivation Path determines how exactly a wallet generates the XPUB, addresses, and Private Keys.

To generate the expected Blockchain Addresses and Private Keys, the **Derivation Path must match 1:1**. Blockchain Addresses generated via other services external to the Tatum API and or KMS may or may not match the expected Derivation Path. For example, Wallet services like [MetaMask use a different derivation path](https://metamask.zendesk.com/hc/en-us/articles/360060331752).

> 📘 Tatum wallets use specific Mnemonic derivation paths per chain. These derivation paths are the same for API, SDKs, and KMS.

## Tatum Mnemonic Derivation Paths

```Text JSON
//MAINNET
  BTC: "m/44'/0'/0'/0", //SegWit (starts with a "bc1q")
  LTC: "m/44'/2'/0'/0",
  ETH: "m/44'/60'/0'/0",
  DOGE: "m/44'/3'/0'/0",
  CELO: "m/44'/52752'/0'/0",
  POLYGON: "m/44'/966'/0'/0",
  KCS: "m/44'/60'/0'/0",
  HARMONY: "m/44'/1023'/0'/0",
  KLAY: "m/44'/8217'/0'/0",
  BSC: "m/44'/60'/0'/0",
  BCH: "m/44'/145'/0'/0",
  TRON: "m/44'/195'/0'/0",
  EGLD: "m/44'/508'/0'/0'",
  ALGO: '@TODO - TBD',
  ADA: "m/1852'/1815'/0'",
  FLOW: "m/44'/539'/0'/0",
  NEO: "m/44'/888'/0'/0",
  SOL: "m/44'/501'/0'/0'",
  VET: "m/44'/818'/0'/0",
  XDC: "m/44'/550'/0'/0",
  XLM: "m/44'/148'/0'",
  XRP: "m/44'/144'/0'/0",
  BNB: "m/44'/714'/0'/0",

//TESTNET
  COMMON_TESTNET_DERIVATION_PATH = "m/44'/1'/0'/0"
```

> 📘 Additional information is available at [the following link](https://github.com/tatumio/tatum-js/blob/ad5471b726ae3c0e0578862b480264f89b69b11d/src/constants.ts).