# Deploy to Polygon Amoy (testnet)

The contracts compile and the deploy script is ready. Deploying needs a funded
testnet wallet — that part is yours (no real money involved on Amoy).

## 1. Create a throwaway testnet wallet
In MetaMask create a **new account** dedicated to testing. Copy its **private key**
(Account → Account details → Show private key). **Never reuse a mainnet key.**

## 2. Fund it with test MATIC (free)
Paste the wallet address into a faucet:
- https://faucet.polygon.technology  (select **Amoy**)
- https://www.alchemy.com/faucets/polygon-amoy

You only need a small amount (~0.5 POL) for gas.

## 3. Add the key to the project
Create/append to `.env` in the project root (this file is gitignored):

```
PRIVATE_KEY=0xYOUR_TESTNET_PRIVATE_KEY
AMOY_RPC_URL=https://rpc-amoy.polygon.technology
FEE_RECIPIENT_ADDRESS=0xYOUR_TREASURY_ADDRESS   # optional, defaults to deployer
```

## 4. Deploy
```
npm run deploy:amoy
```

Expected output:
```
BrierVault Impl:    0x....
BrierVaultFactory:  0x....
```

## 5. Wire the frontend
Put the factory address in `.env.local`:
```
NEXT_PUBLIC_VAULT_FACTORY_ADDRESS=0x....   # the BrierVaultFactory
NEXT_PUBLIC_DEPOSIT_RPC_URL=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_USDC_ADDRESS=0x....            # a test USDC on Amoy
```

## What this gives you
- The vault **implementation** + **factory** live on Amoy.
- The factory mints a cheap EIP-1167 clone vault per bot when it hits Tier-1.

## What still needs real (mainnet) infra later
- **Polymarket CLOB only runs on Polygon mainnet** — real trade execution and
  market resolution can't be exercised on Amoy. Amoy proves the vault deposit/
  withdraw/share mechanics; live trading is a mainnet step (with audited contracts).
