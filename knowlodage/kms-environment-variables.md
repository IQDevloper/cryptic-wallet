# KMS Environment Variables

KMS - Environment Variables

KMS Environment variables must be stored inside the `.env` file.

```curl
# required
TATUM_API_KEY=XXXXX-YOUR-API-KEY
# one of the following setups is required: password, VGS, Azure, or AWS
# password setup
TATUM_KMS_PASSWORD=XXXXPASSWORD
# VGS setup
TATUM_KMS_VGS_USERNAME=XXXXUSERNAME
TATUM_KMS_VGS_PASSWORD=XXXXPASSWORDVGS
TATUM_KMS_VGS_ALIAS=XXXVSGALIAS
# Azure setup
TATUM_KMS_AZURE_SECRETVERSION=XXVERSION
TATUM_KMS_AZURE_SECRETNAME=XXSECRETNAME
TATUM_KMS_AZURE_VAULTURL=XXXXVAULTURL
# AWS setup
TATUM_KMS_AWS_REGION=us-east-1
TATUM_KMS_AWS_SECRET_NAME=YOUR_KMS_SECRET_NAME
TATUM_KMS_AWS_ACCESS_KEY_ID=XXXXXXXE
TATUM_KMS_AWS_SECRET_ACCESS_KEY=Xxxxx/Xxxxx
TATUM_KMS_AWS_SECRET_KEY=pwd
```

> 📘 You have to replace the placeholders with your own values. Additional information can be found over KMS Github page at [the following link](https://github.com/tatumio/tatum-kms#environment-variables).

## Good to know

You can encrypt your KMS wallets using one of the following ways:

1. Password-based encryption
2. [VGS](https://www.verygoodsecurity.com/) account that holds the encryption/decryption key
3. [MS Azure](https://azure.microsoft.com/en-us) account that holds the encryption/decryption key
4. [AWS](https://aws.amazon.com/) account that holds the encryption/decryption key

Depending on which way you choose, you pass the relevant information in the environment variables or `.env` file. The most straightforward option is to encrypt the wallets with a password, but you're free to choose any of the options.