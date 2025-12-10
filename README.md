# Privacy Cash SDK Test App

A Next.js application to test all Privacy Cash SDK functions with Phantom wallet integration.

## Features

- Connect Phantom wallet
- Deposit SOL and USDC
- Withdraw SOL and USDC
- View private balances
- Clear UTXO cache
- Transaction status tracking

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy circuit files (if not already done):
```bash
cp ../privacy-cash-sdk/circuit2/* public/circuit2/
```

3. Create `.env.local` file:
```bash
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_RELAYER_API_URL=https://api3.privacycash.org
```

4. Run the development server:
```bash
npm run dev
```

## Important Notes

### Wallet Adapter Limitation

The SDK requires a keypair for encryption key derivation. Since wallet adapters (like Phantom) don't expose private keys, this app uses a temporary keypair for SDK initialization. This means:

- Transactions will be signed by your wallet (correct)
- UTXOs may not be properly encrypted/decrypted with your actual wallet keypair
- For full functionality, the SDK would need to support wallet adapter's `signMessage` for encryption key derivation

This is a known limitation and the SDK would need modifications for full wallet adapter support.

## Testing

1. Connect your Phantom wallet
2. Test deposit/withdraw functions
3. Check private balances
4. Clear cache if needed

## Project Structure

- `app/` - Next.js app router pages
- `components/` - React components
- `lib/` - Utility functions and SDK wrapper
- `public/circuit2/` - Circuit files for ZK proofs
