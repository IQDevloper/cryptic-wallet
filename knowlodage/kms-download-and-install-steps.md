# Download, Install, Setup & Run KMS

Tatum KMS is a Key Management System, an open sourced and audited docker image that enables you to securely store your private keys and sign transaction requests originated from Tatum API using those keys.

This guide will walk you through setting up your local Tatum KMS instance, creating a wallet, and signing transaction requests.

## Steps

We recommend that you run KMS from the [Docker image](https://hub.docker.com/repository/docker/tatumio/tatum-kms)  regardless of the operating system used.

> 🚧 Tatum KMS should be installed in the Deny-From-All environment to meet the highest security standards.

### Step_1: Download the KMS Docker Image and Set up your API key

```typescript
docker pull tatumio/tatum-kms
nano .env
```

. env file:

```typescript
TATUM_API_KEY=XXXXX-YOUR-API-KEY
```

You can validate that the KMS has been downloaded correctly by displaying the help page:

```typescript
docker run tatumio/tatum-kms --help
```

### Step_2: Set up your encryption password

All private keys are **always stored locally** within the `wallet.dat` **password-encrypted** file, and they never leave your KMS instance\*.

The `wallet.dat` file is encrypted using a password that’s required for all wallet operations, including signing transactions. You can choose whether - and where - to store the password.

- a) **In your local `.env` file: **The `wallet.dat` file is stored locally, its encryption password is created by you and also stored locally. Even though there are no enforced password rules, this password should be secure and different from your Tatum account password.
- b) **In your VGS Vault:** The `wallet.dat` file is stored locally, its encryption password is created automatically and stored in the [VGS cloud service](https://www.verygoodsecurity.com/).
- c) **In your Microsoft Azure Key Vault:** The `wallet.dat` file is stored locally, its encryption password is created automatically and stored in the [Microsoft cloud service](https://azure.microsoft.com/en-us/products/key-vault/).
- d) **In your AWS Secrets Manager:** The `wallet.dat` file is stored locally, its encryption password is created automatically and stored in the [Amazon cloud service](https://aws.amazon.com/secrets-manager/).
- e) **Not stored at all:** All wallet operations (e.g. creating a new wallet) will require you to manually enter the password. The `daemon` process that signs incoming transaction requests will require you to enter the password manually upon its start.

#### Step_2a: Store the encryption password in your local .env file

Add the following line to your `.env` file:

```typescript
TATUM_KMS_PASSWORD=XXXXPASSWORD
```

#### Step_2b: Store the encryption password in your VGS Vault

Add the following lines to your `.env` file

```typescript
TATUM_KMS_VGS_USERNAME=XXXXUSERNAME
TATUM_KMS_VGS_PASSWORD=XXXXPASSWORDVGS
TATUM_KMS_VGS_ALIAS=XXXVSGALIAS
```

#### Step_2c: Store the encryption password in your Microsoft Azure Key Vault

Add the following lines to your `.env` file

```typescript
TATUM_KMS_AZURE_SECRETVERSION=XXVERSION
TATUM_KMS_AZURE_SECRETNAME=XXSECRETNAME
TATUM_KMS_AZURE_VAULTURL=XXXXVAULTURL
```

#### Step_2d: Store the encryption password in your AWS Secrets Manager

Add the following lines to your `.env` file:

```typescript
TATUM_KMS_AWS_REGION=us-east-1
TATUM_KMS_AWS_SECRET_NAME=YOUR_KMS_SECRET_NAME
TATUM_KMS_AWS_ACCESS_KEY_ID=EXAMPLE_KEY_ID_REPLACE_ME
TATUM_KMS_AWS_SECRET_ACCESS_KEY=EXAMPLE_SECRET_KEY_REPLACE_ME
TATUM_KMS_AWS_SECRET_KEY=pwd
```

### Step_3: Create a Wallet

The following command does 3 things:

1. Passes your `.env` file to the container
2. Mounts your current folder to the container
3. Generates and stores a wallet using the `generatemanagedwallet` command.

```typescript
docker run -it --env-file .env -v ./:/root/.tatumrc tatumio/tatum-kms generatemanagedwallet BTC --testnet
//Response:
{
  "signatureId": "52e363d0-bffc-4eda-88cc-82be47a21b19",
  "xpub": "tpubDEmHbnN2P17T3uUzBerJVxH7Lj6d4fzz3UXpzZ39xY5D2zjFLGsBwoPvZJJtdmaxzkJT1PUDck4PLDXFfLAiyXisES1mCh3Qq3RkA1QRWWV"
}
```

- The `wallet.dat` file is created and stored within your current folder.
- `signatureId` is the wallet ID that you’ll be using while creating a transaction sign request.
- Since the wallet is mnemonic-based (extended private key), the output doesn’t display the sensitive data directly. But you’ll receive its corresponding `xpub` (extended public key).
- You may store multiple wallets within the KMS.

> 🚧 Mind the KMS flag "--testnet" for testnet operations.

### Step_4: Retrieve private key and address from a wallet

Each wallet is mnemonic-based, so you’ll need to use an index to derive its specific private key + address.

In the following command, the first argument after getprivatekey is the signatureId, and the second argument is the index.

```typescript
docker run -it --env-file .env -v ./:/root/.tatumrc tatumio/tatum-kms getprivatekey 52e363d0-bffc-4eda-88cc-82be47a21b19 0 --testnet
//Response:
{
  "privateKey": "<redacted>"
}
```

Retrieving an address follows the same specifics:

```typescript
docker run -it --env-file .env -v ./:/root/.tatumrc tatumio/tatum-kms getaddress 52e363d0-bffc-4eda-88cc-82be47a21b19 0  --testnet
//Response:
{
  "address": "tb1qk46z6vwl2nxqwqwkxn0s52nwwmuzx9crwpsqq8"
}
```

> 🚧 Mind the KMS flag "--testnet" for testnet operations.

### Step_5: Construct an unsigned transaction

You may use any of the many transaction endpoints that support the \*KMS suffix. For example the [Send BTC v3 REST API endpoint](https://docs.tatum.io/reference/btctransferblockchain). The full list of Tatum endpoints is available in the [API Documentation](https://docs.tatum.io/).

In the endpoint payload, don’t forget to specify the `signatureId` of the mnemonic-based wallet, and the `index` to derive the specific sender private key from the mnemonic.

Once you successfully submit the data, Tatum API constructs an unsigned transaction that is waiting on Tatum servers until your KMS picks it up.

> 📘 Find a step-by-step guide in the [Bitcoin Flow from A to Z](https://docs.tatum.io/docs/kms-btc-flow-from-a-to-z).

### Step_6: Sign and broadcast transactions

The KMS must run in `daemon` mode to periodically check for new unsigned transactions.

```typescript
docker run -d --env-file .env -v ./:/root/.tatumrc tatumio/tatum-kms daemon  --testnet
```

> 🚧 Mind the KMS flag "--testnet" for testnet operations.

- Once the KMS picks up the unsigned transaction, it automatically signs it and sends the signed transaction back to Tatum servers to broadcast it to the network.
- All signing happens locally, and the private key never leaves your KMS instance.

> 📘 If your password is not specified within the `.env` file, the command will prompt you for the password. In that case, do not use the `-d` option, otherwise your system won’t show the prompt.

### Step_7: Enabling the Four-eye Principle

Once you’re ready to start using the KMS on Mainnet, there’s one additional feature that you need to be aware of. This feature is optional on Testnet but **required** on Mainnet

The four-eye principle comes as an additional security measure from traditional finance systems, and requires the transaction to be validated by an external service before actually signing it.

This external service is usually your own service outside of the KMS instance - but you may also choose a 3rd party service if you wish.

You can specify the external service URL with the `--external-url` option of the daemon command.

```typescript
docker run -d --env-file .env -v ./:/root/.tatumrc tatumio/tatum-kms daemon --external-url=http://192.168.57.63/
```

Before the daemon signs a transaction, it sends a request to the external server, along with the transaction hash.

Using the example above - if the transaction hash to be signed is 0x1234, the request is sent to url: `http://192.168.57.63/0x1234`.

Only if the external server responds with `200 OK` status, the KMS then proceeds to sign the transaction. This enables you to implement additional logic to decide whether you wish to sign the transaction or not.

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