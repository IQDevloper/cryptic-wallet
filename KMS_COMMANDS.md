# Tatum KMS Commands Reference

## Available Commands

```
Tatum KMS - Key Management System for Tatum-powered apps.

Usage
    $ tatum-kms <command>

Commands
    daemon                            		Run as a daemon, which periodically checks for a new transactions to sign.
    generatewallet <chain>            		Generate wallet for a specific blockchain and echo it to the output.
    generatemanagedwallet <chain>     		Generate wallet for a specific blockchain and add it to the managed wallets.
    storemanagedwallet <chain>        		Store mnemonic-based wallet for a specific blockchain and add it to the managed wallets.
    storemanagedprivatekey <chain>    		Store private key of a specific blockchain and add it to the managed wallets.
    generatemanagedprivatekeybatch <chain> <cnt> 	Generate and store "cnt" number of private keys for a specific blockchain. This operation is usefull, if you wanna pregenerate bigger amount of managed private keys for later use.
    getprivatekey <signatureId> <i>   		Obtain managed wallet from wallet store and generate private key for given derivation index.
    getaddress <signatureId> <i>      		Obtain managed wallet from wallet store and generate address for given derivation index.
    getmanagedwallet <signatureId>    		Obtain managed wallet / private key from wallet store.
    removewallet <signatureId>        		Remove managed wallet from wallet store.
    export                          			Export all managed wallets.

Debugging
    report                          	    Shows report of system and requested wallets (+ warnings if they were found)
    checkconfig                           Shows environment variables for Tatum KMS.

Options
    --apiKey                          Tatum API Key to communicate with Tatum API. Daemon mode only.
    --testnet                         Indicates testnet version of blockchain. Mainnet by default.
    --path                            Custom path to wallet store file.
    --period                          Period in seconds to check for new transactions to sign, defaults to 5 seconds. Daemon mode only.
    --chain                           Blockchains to check, separated by comma. Daemon mode only.
    --envFile                         Path to .env file to set vars.
    --aws                             Using AWS Secrets Manager (https://aws.amazon.com/secrets-manager/) as a secure storage of the password which unlocks the wallet file.
    --vgs                             Using VGS (https://verygoodsecurity.com) as a secure storage of the password which unlocks the wallet file.
    --azure                           Using Azure Vault (https://azure.microsoft.com/en-us/services/key-vault/) as a secure storage of the password which unlocks the wallet file.
    --externalUrl                     Pass in external url to check valid transaction. This parameter is mandatory for mainnet (if testnet is false).  Daemon mode only.
    --externalUrlMethod               Determine what http method to use when calling the url passed in the --externalUrl option. Accepts GET or POST. Defaults to GET method. Daemon mode only. 
    --runOnce                         Run the daemon command one time. Check for a new transactions to sign once, and then exit the process. Daemon mode only.
    --wallets                         If runOnce enabled, fetch and sign only for these wallet ids.
    --transactionIds                  If runOnce enabled, sign only transactions from defined comma-separated list.
```

## Docker Usage Examples

### Generate a managed wallet for Bitcoin
```bash
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest generatemanagedwallet BTC
```

### Generate wallets for multiple chains
```bash
# For Ethereum
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest generatemanagedwallet ETH

# For BSC
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest generatemanagedwallet BSC

# For Solana
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest generatemanagedwallet SOL
```

### Export all wallets (for debugging)
```bash
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest export
```

### Check KMS configuration
```bash
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest checkconfig
```

### Run daemon mode (what docker-compose does)
```bash
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest daemon --period=10 --path=/root/.tatumrc/wallet.dat --apiKey=${TATUM_API_KEY}
```

## Quick Start Steps

1. **First time setup** - Generate wallets before starting daemon:
```bash
# Generate BTC wallet
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest generatemanagedwallet BTC --testnet

# Generate ETH wallet  
docker run --rm -it --env-file .env.kms -v $(pwd)/kms-data:/root/.tatumrc tatumio/tatum-kms:latest generatemanagedwallet ETH --testnet
```

2. **Start daemon**:
```bash
docker-compose -f docker-compose.kms.yml up -d
```

3. **Check status**:
```bash
docker-compose -f docker-compose.kms.yml logs -f
```