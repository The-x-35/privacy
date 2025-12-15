# Privacy Cash Private Send API

The Private Send API enables developers to integrate private transactions on Solana using the Privacy Cash protocol. The API handles transaction submission and automatic withdrawals while the client generates ZK proofs.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API Endpoint](#api-endpoint)
- [Request/Response Format](#requestresponse-format)
- [Complete Flow](#complete-flow)
- [Error Handling](#error-handling)
- [Code Examples](#code-examples)

## Overview

The Private Send API uses a hybrid approach for optimal performance:
- **Client-Side**: ZK proof generation and transaction creation (30-60 seconds)
- **Server-Side**: Transaction submission and automatic withdrawal (~5 seconds)

This ensures fast API responses while keeping the heavy computation on the client.

### Flow Diagram

```
Client                                API                      Solana Network
  |                                    |                              |
  |--1. Generate ZK proof------------>|                              |
  |   (30-60s in browser)              |                              |
  |                                    |                              |
  |--2. Sign transaction------------->|                              |
  |   (wallet popup)                   |                              |
  |                                    |                              |
  |--3. POST signed deposit----------->|                              |
  |                                    |---submit deposit------------>|
  |                                    |<--deposit signature----------|
  |                                    |                              |
  |                                    |---wait 2s for settlement---->|
  |                                    |                              |
  |                                    |---generate withdraw--------->|
  |                                    |---submit withdraw----------->|
  |                                    |<--withdraw signature---------|
  |                                    |                              |
  |<--both signatures-----------------|                              |
  |   (deposit + withdraw)             |                              |
```

## Quick Start

### For Web Developers (Browser)

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { WasmFactory } from '@lightprotocol/hasher.rs';

// 1. Generate deposit transaction (ZK proof happens here - 30-60 seconds)
const { deposit, EncryptionService } = await import('privacycash/utils');
const lightWasm = await WasmFactory.getInstance();

// Initialize encryption service
const { Keypair } = await import('@solana/web3.js');
const tempKeypair = Keypair.generate();
const encryptionService = new EncryptionService();
encryptionService.deriveEncryptionKeyFromWallet(tempKeypair);

let depositTransaction = null;
await deposit({
  lightWasm,
  amount_in_lamports: 100000000, // 0.1 SOL
  connection: yourConnection,
  encryptionService,
  publicKey: yourPublicKey,
  transactionSigner: async (tx) => {
    depositTransaction = tx;
    return tx;
  },
  keyBasePath: '/circuit2/transaction2',
  storage: window.localStorage
}).catch(() => {}); // Expected to fail, we captured the tx

// 2. Sign with wallet
const signedTx = await wallet.signTransaction(depositTransaction);
const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64');

// 3. Send to API
const response = await fetch('/api/private-send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'submit-deposit-and-withdraw',
    tokenType: 'SOL',
    amount: 100000000,
    recipientAddress: 'RecipientPublicKey...',
    publicKey: yourPublicKey.toString(),
    signedDepositTransaction: signedTxBase64
  })
});

const result = await response.json();
console.log('Deposit:', result.depositSignature);
console.log('Withdraw:', result.withdrawSignature);
```

## API Endpoint

**URL**: `/api/private-send`

**Method**: `POST`

**Content-Type**: `application/json`

## Request/Response Format

### Request Schema

```typescript
interface PrivateSendRequest {
  action: 'submit-deposit-and-withdraw';
  tokenType: 'SOL' | 'USDC';
  amount: number; // lamports for SOL, base_units (micro-USDC) for USDC
  recipientAddress: string; // Destination wallet address
  publicKey: string; // Sender's wallet address
  signedDepositTransaction: string; // Base64 encoded signed transaction
}
```

### Success Response

```typescript
interface PrivateSendResponse {
  success: true;
  depositSignature: string; // Solana transaction signature
  withdrawSignature: string; // Solana transaction signature
}
```

**HTTP Status**: `200 OK`

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: string; // Human-readable error message
}
```

**HTTP Status**: `400 Bad Request` or `500 Internal Server Error`

## Complete Flow

### Step 1: Generate Deposit Transaction (Client-Side)

The client must generate the deposit transaction including ZK proof generation. This is the most time-consuming step (30-60 seconds) and happens entirely in the browser.

```typescript
import { deposit } from 'privacycash/utils';
import { WasmFactory } from '@lightprotocol/hasher.rs';
import { EncryptionService } from 'privacycash/utils';
import { Keypair, Connection, PublicKey } from '@solana/web3.js';

// Initialize
const connection = new Connection('https://api.mainnet-beta.solana.com');
const yourWallet = /* your wallet adapter */;
const lightWasm = await WasmFactory.getInstance();

// Setup encryption service
const tempKeypair = Keypair.generate();
const encryptionService = new EncryptionService();
encryptionService.deriveEncryptionKeyFromWallet(tempKeypair);

// Capture transaction
let depositTransaction = null;
const walletSigner = async (tx) => {
  depositTransaction = tx;
  return tx;
};

// Generate deposit (ZK proof happens here)
try {
  await deposit({
    lightWasm,
    amount_in_lamports: 100000000, // 0.1 SOL
    connection,
    encryptionService,
    publicKey: yourWallet.publicKey,
    transactionSigner: walletSigner,
    keyBasePath: '/circuit2/transaction2',
    storage: window.localStorage
  });
} catch (error) {
  // Expected to fail at submission, we already captured the transaction
}

if (!depositTransaction) {
  throw new Error('Failed to generate deposit transaction');
}
```

### Step 2: Sign Transaction

```typescript
// User signs with their wallet
const signedDepositTx = await yourWallet.signTransaction(depositTransaction);

// Serialize to base64
const signedTxBase64 = Buffer.from(signedDepositTx.serialize()).toString('base64');
```

### Step 3: Submit to API

```typescript
const response = await fetch('/api/private-send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    action: 'submit-deposit-and-withdraw',
    tokenType: 'SOL',
    amount: 100000000,
    recipientAddress: '9xKvwk3...',
    publicKey: yourWallet.publicKey.toString(),
    signedDepositTransaction: signedTxBase64
  })
});

const data = await response.json();

if (data.success) {
  console.log('Deposit:', data.depositSignature);
  console.log('Withdraw:', data.withdrawSignature);
  console.log('View on Solscan:');
  console.log(`https://solscan.io/tx/${data.depositSignature}`);
  console.log(`https://solscan.io/tx/${data.withdrawSignature}`);
} else {
  console.error('Error:', data.error);
}
```

## Error Handling

### Common Errors

| Error Message | Status Code | Cause | Solution |
|--------------|-------------|-------|----------|
| "Invalid action. Must be: submit-deposit-and-withdraw" | 400 | Wrong action value | Use correct action string |
| "Missing required fields" | 400 | Required parameter missing | Check all fields are provided |
| "Invalid public key" | 400 | Malformed public key | Verify public key format |
| "Invalid recipient address" | 400 | Malformed recipient address | Verify recipient address format |
| "Deposit relay failed" | 500 | Network or relayer error | Retry the request |
| "Withdraw submission failed" | 500 | Withdrawal error | Check logs, may need to retry |

### Error Response Example

```json
{
  "success": false,
  "error": "Invalid recipient address"
}
```

### Error Handling Best Practices

```typescript
try {
  const result = await submitToAPI(...);
  console.log('Success:', result);
} catch (error) {
  if (error.message.includes('Invalid')) {
    // User input error
    alert('Please check your inputs');
  } else if (error.message.includes('relay failed')) {
    // Network error - retry
    console.log('Retrying...');
  } else {
    // Unknown error
    console.error('Unexpected error:', error);
  }
}
```

## Code Examples

### Complete TypeScript/React Example

```typescript
import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';

function PrivateSendComponent() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [status, setStatus] = useState('idle');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');

  const handlePrivateSend = async () => {
    if (!publicKey || !signTransaction) {
      alert('Connect wallet first');
      return;
    }

    try {
      setStatus('Generating ZK proof...');
      
      // Import SDK modules
      const { deposit, EncryptionService } = await import('privacycash/utils');
      const { WasmFactory } = await import('@lightprotocol/hasher.rs');
      const { Keypair } = await import('@solana/web3.js');

      // Initialize
      const lightWasm = await WasmFactory.getInstance();
      const tempKeypair = Keypair.generate();
      const encryptionService = new EncryptionService();
      encryptionService.deriveEncryptionKeyFromWallet(tempKeypair);

      // Generate deposit transaction
      let depositTransaction = null;
      await deposit({
        lightWasm,
        amount_in_lamports: parseFloat(amount) * 1e9,
        connection,
        encryptionService,
        publicKey,
        transactionSigner: async (tx) => {
          depositTransaction = tx;
          return tx;
        },
        keyBasePath: '/circuit2/transaction2',
        storage: window.localStorage
      }).catch(() => {});

      if (!depositTransaction) {
        throw new Error('Failed to generate transaction');
      }

      setStatus('Please sign transaction...');
      const signedTx = await signTransaction(depositTransaction);
      const signedTxBase64 = Buffer.from(signedTx.serialize()).toString('base64');

      setStatus('Submitting to API...');
      const response = await fetch('/api/private-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-deposit-and-withdraw',
          tokenType: 'SOL',
          amount: parseFloat(amount) * 1e9,
          recipientAddress,
          publicKey: publicKey.toString(),
          signedDepositTransaction: signedTxBase64
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setStatus(`Success! Deposit: ${result.depositSignature}, Withdraw: ${result.withdrawSignature}`);
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <input
        placeholder="Recipient Address"
        value={recipientAddress}
        onChange={(e) => setRecipientAddress(e.target.value)}
      />
      <input
        type="number"
        placeholder="Amount (SOL)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />
      <button onClick={handlePrivateSend}>
        Send Privately
      </button>
      <div>Status: {status}</div>
    </div>
  );
}
```

### Python Example (External App)

```python
import requests
import json
from solana.rpc.api import Client
from solana.transaction import Transaction
import base64

# Note: Python apps need to implement the ZK proof generation
# This typically requires running the browser-based proof generation
# and capturing the signed transaction

def private_send_via_api(signed_tx_base64: str, recipient: str, amount_lamports: int, sender_pubkey: str):
    """
    Submit a pre-signed deposit transaction to the API
    
    Note: The signed transaction must be generated client-side with ZK proof
    This function only handles API submission
    """
    api_url = "https://yourdomain.com/api/private-send"
    
    payload = {
        "action": "submit-deposit-and-withdraw",
        "tokenType": "SOL",
        "amount": amount_lamports,
        "recipientAddress": recipient,
        "publicKey": sender_pubkey,
        "signedDepositTransaction": signed_tx_base64
    }
    
    response = requests.post(api_url, json=payload)
    data = response.json()
    
    if data.get('success'):
        print(f"Deposit: {data['depositSignature']}")
        print(f"Withdraw: {data['withdrawSignature']}")
        print(f"View on Solscan:")
        print(f"https://solscan.io/tx/{data['depositSignature']}")
        print(f"https://solscan.io/tx/{data['withdrawSignature']}")
        return data
    else:
        raise Exception(f"API Error: {data.get('error')}")

# Usage (after generating signed transaction):
# result = private_send_via_api(signed_tx_base64, recipient_address, 100000000, sender_pubkey)
```

### cURL Example

```bash
# Note: You need to generate the signed deposit transaction first
# This example shows the API call structure

curl -X POST https://yourdomain.com/api/private-send \
  -H "Content-Type: application/json" \
  -d '{
    "action": "submit-deposit-and-withdraw",
    "tokenType": "SOL",
    "amount": 100000000,
    "recipientAddress": "9xKvwk3nHb5CHfXd9w9mKLHGsL9NqNKhPpPpNKhPpPpN",
    "publicKey": "8xKvwk3nHb5CHfXd9w9mKLHGsL9NqNKhPpPpNKhPpPpN",
    "signedDepositTransaction": "AQA...BASE64_ENCODED_SIGNED_TRANSACTION..."
  }'

# Response:
# {
#   "success": true,
#   "depositSignature": "3xJ4Kg8...",
#   "withdrawSignature": "4yK5Lh9..."
# }
```

## Technical Details

### Why Client-Side ZK Proof Generation?

ZK proof generation is computationally intensive (30-60 seconds) and resource-heavy. Running it on the server would:
- Block the server for extended periods
- Be expensive at scale
- Timeout on many hosting platforms

By generating proofs client-side:
- ✅ Server stays fast and responsive
- ✅ API calls complete in ~5 seconds
- ✅ Works on any hosting platform
- ✅ Scales to many concurrent users

### Token Support

- **SOL**: Native Solana token
- **USDC**: USDC mainnet mint (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)

### Transaction Lifecycle

1. **Deposit Transaction**: Transfers tokens into Privacy Cash pool
2. **Settlement Period**: 2 seconds wait for on-chain confirmation
3. **Withdraw Transaction**: Transfers tokens from pool to recipient
4. **Privacy**: Link between sender and recipient is broken via ZK proofs

### Security Considerations

1. **Private Keys**: Never leave the client - all signing is client-side
2. **HTTPS Required**: Always use HTTPS in production
3. **Input Validation**: API validates all inputs before processing
4. **Transaction Verification**: Always verify signatures on Solscan before considering final

## Deployment Notes

- **Timeout**: API requires up to 60 seconds for withdrawal generation
- **Environment Variable**: Set `NEXT_PUBLIC_SOLANA_RPC_URL` for custom RPC
- **Circuit Files**: Ensure `public/circuit2/` contains `transaction2.wasm` and `transaction2.zkey`

## Support

For issues or questions:
- GitHub Issues: [Your Repo URL]
- Documentation: [Your Docs URL]

## License

[Your License]
