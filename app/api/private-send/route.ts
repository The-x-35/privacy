import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { WasmFactory } from '@lightprotocol/hasher.rs';
import path from 'path';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Types for API requests/responses
interface PrivateSendRequest {
  action: 'submit-deposit-and-withdraw';
  tokenType: 'SOL' | 'USDC';
  amount: number; // lamports or base_units
  recipientAddress: string;
  publicKey: string;
  signedDepositTransaction: string; // base64 encoded signed deposit transaction
}

interface PrivateSendResponse {
  success: true;
  depositSignature: string;
  withdrawSignature: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const RELAYER_API_URL = 'https://lightscan.network/backend/api/v1';

// In-memory storage stub for SDK
class MemoryStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }

  key(index: number): string | null {
    const keys = Array.from(this.store.keys());
    return keys[index] || null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

// Helper function to initialize PrivacyCash SDK components
async function initializeSDK(publicKey: PublicKey) {
  const { EncryptionService } = await import('privacycash/utils');
  
  const tempKeypair = Keypair.generate();
  const encryptionService = new EncryptionService();
  encryptionService.deriveEncryptionKeyFromWallet(tempKeypair);
  
  return { encryptionService, tempKeypair };
}

// Function to relay deposit to indexer
async function relayDepositToIndexer(signedTransaction: string, publicKey: PublicKey): Promise<string> {
  console.log('[API] Relaying SOL deposit to indexer...');
  const response = await fetch(`${RELAYER_API_URL}/deposit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signedTransaction,
      senderAddress: publicKey.toString()
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deposit relay failed: ${errorText}`);
  }

  const result = await response.json() as { signature: string, success: boolean };
  console.log('[API] ✓ Deposit submitted:', result.signature);
  return result.signature;
}

// Function to relay SPL deposit to indexer
async function relayDepositSPLToIndexer(signedTransaction: string, publicKey: PublicKey, mintAddress: PublicKey): Promise<string> {
  console.log('[API] Relaying USDC deposit to indexer...');
  const response = await fetch(`${RELAYER_API_URL}/depositspl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mintAddress: mintAddress.toString(),
      publicKey: publicKey.toString(),
      signedTransaction
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Deposit SPL relay failed: ${errorText}`);
  }

  const result = await response.json() as { signature: string, success: boolean };
  console.log('[API] ✓ USDC Deposit submitted:', result.signature);
  return result.signature;
}

// Function to submit withdraw to indexer
async function submitWithdrawToIndexer(params: any): Promise<string> {
  console.log('[API] Submitting SOL withdraw to indexer...');
  const response = await fetch(`${RELAYER_API_URL}/withdraw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorData = await response.json() as { error?: string };
    throw new Error(errorData.error || 'Withdraw submission failed');
  }

  const result = await response.json() as { signature: string, success: boolean };
  console.log('[API] ✓ Withdraw submitted:', result.signature);
  return result.signature;
}

// Function to submit SPL withdraw to indexer
async function submitWithdrawSPLToIndexer(params: any): Promise<string> {
  console.log('[API] Submitting USDC withdraw to indexer...');
  const response = await fetch(`${RELAYER_API_URL}/withdrawspl`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const errorData = await response.json() as { error?: string };
    throw new Error(errorData.error || 'Withdraw SPL submission failed');
  }

  const result = await response.json() as { signature: string, success: boolean };
  console.log('[API] ✓ USDC Withdraw submitted:', result.signature);
  return result.signature;
}

// Prepare withdraw parameters (SOL)
async function prepareWithdraw(
  publicKey: PublicKey,
  connection: Connection,
  amount: number,
  recipientAddress: string,
  encryptionService: any,
  lightWasm: any
): Promise<any> {
  console.log('[API] Preparing SOL withdraw...');
  const { withdraw } = await import('privacycash/utils');
  const storage = new MemoryStorage();
  const recipient = new PublicKey(recipientAddress);

  const originalFetch = global.fetch;
  let capturedParams: any = null;

  try {
    global.fetch = async (url: any, options: any) => {
      if (typeof url === 'string' && url.includes('/withdraw')) {
        const body = JSON.parse(options.body);
        capturedParams = body;
        return new Response(JSON.stringify({ signature: 'mock', success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    };

    await withdraw({
      recipient,
      lightWasm,
      storage,
      publicKey,
      connection,
      amount_in_lamports: amount,
      encryptionService,
      keyBasePath: path.join(process.cwd(), 'public', 'circuit2', 'transaction2')
    });

    if (capturedParams) {
      console.log('[API] ✓ SOL withdraw params prepared');
      return capturedParams;
    }
  } finally {
    global.fetch = originalFetch;
  }

  throw new Error('Failed to prepare withdraw parameters');
}

// Prepare withdraw parameters (USDC/SPL)
async function prepareWithdrawSPL(
  publicKey: PublicKey,
  connection: Connection,
  amount: number,
  recipientAddress: string,
  encryptionService: any,
  lightWasm: any,
  mintAddress: PublicKey
): Promise<any> {
  console.log('[API] Preparing USDC withdraw...');
  const { withdrawSPL } = await import('privacycash/utils');
  const storage = new MemoryStorage();
  const recipient = new PublicKey(recipientAddress);

  const originalFetch = global.fetch;
  let capturedParams: any = null;

  try {
    global.fetch = async (url: any, options: any) => {
      if (typeof url === 'string' && url.includes('/withdrawspl')) {
        const body = JSON.parse(options.body);
        capturedParams = body;
        return new Response(JSON.stringify({ signature: 'mock', success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(url, options);
    };

    await withdrawSPL({
      recipient,
      mintAddress,
      lightWasm,
      storage,
      publicKey,
      connection,
      base_units: amount,
      encryptionService,
      keyBasePath: path.join(process.cwd(), 'public', 'circuit2', 'transaction2')
    });

    if (capturedParams) {
      console.log('[API] ✓ USDC withdraw params prepared');
      return capturedParams;
    }
  } finally {
    global.fetch = originalFetch;
  }

  throw new Error('Failed to prepare withdraw SPL parameters');
}

export async function POST(request: NextRequest) {
  try {
    const body: PrivateSendRequest = await request.json();
    const { action, tokenType, amount, recipientAddress, publicKey: publicKeyStr, signedDepositTransaction } = body;

    console.log('[API] =====================================');
    console.log('[API] Private Send Request Received');
    console.log('[API] Token:', tokenType, '| Amount:', amount);
    console.log('[API] =====================================');

    // Validate required fields
    if (action !== 'submit-deposit-and-withdraw') {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: 'Invalid action. Must be: submit-deposit-and-withdraw' },
        { status: 400 }
      );
    }

    if (!tokenType || !publicKeyStr || !signedDepositTransaction || !recipientAddress || !amount) {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate public key
    let publicKey: PublicKey;
    try {
      publicKey = new PublicKey(publicKeyStr);
    } catch {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: 'Invalid public key' },
        { status: 400 }
      );
    }

    // Validate recipient address
    try {
      new PublicKey(recipientAddress);
    } catch {
      return NextResponse.json<ErrorResponse>(
        { success: false, error: 'Invalid recipient address' },
        { status: 400 }
      );
    }

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // STEP 1: Submit deposit
    console.log('[API] [1/4] Submitting deposit transaction...');
    let depositSignature: string;
    if (tokenType === 'SOL') {
      depositSignature = await relayDepositToIndexer(signedDepositTransaction, publicKey);
    } else {
      depositSignature = await relayDepositSPLToIndexer(signedDepositTransaction, publicKey, USDC_MINT);
    }

    // STEP 2: Wait for settlement
    console.log('[API] [2/4] Waiting 2 seconds for deposit settlement...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // STEP 3: Prepare withdrawal
    console.log('[API] [3/4] Preparing automatic withdrawal...');
    const { encryptionService } = await initializeSDK(publicKey);
    const lightWasm = await WasmFactory.getInstance();

    let withdrawParams: any;
    if (tokenType === 'SOL') {
      withdrawParams = await prepareWithdraw(publicKey, connection, amount, recipientAddress, encryptionService, lightWasm);
    } else {
      withdrawParams = await prepareWithdrawSPL(publicKey, connection, amount, recipientAddress, encryptionService, lightWasm, USDC_MINT);
    }

    // STEP 4: Submit withdrawal
    console.log('[API] [4/4] Submitting withdrawal...');
    let withdrawSignature: string;
    if (tokenType === 'SOL') {
      withdrawSignature = await submitWithdrawToIndexer(withdrawParams);
    } else {
      withdrawSignature = await submitWithdrawSPLToIndexer(withdrawParams);
    }

    console.log('[API] =====================================');
    console.log('[API] ✓ Private Send Complete!');
    console.log('[API] Deposit:', depositSignature);
    console.log('[API] Withdraw:', withdrawSignature);
    console.log('[API] =====================================');

    return NextResponse.json<PrivateSendResponse>({
      success: true,
      depositSignature,
      withdrawSignature
    });

  } catch (error: any) {
    console.error('[API] ✗ Error:', error.message);
    return NextResponse.json<ErrorResponse>(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
