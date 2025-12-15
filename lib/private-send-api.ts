import { VersionedTransaction } from '@solana/web3.js';

// Types for API communication
export interface PrivateSendRequest {
  action: 'submit-deposit-and-withdraw';
  tokenType: 'SOL' | 'USDC';
  amount: number; // lamports or base_units
  recipientAddress: string;
  publicKey: string;
  signedDepositTransaction: string; // base64 encoded
}

export interface PrivateSendResponse {
  success: true;
  depositSignature: string;
  withdrawSignature: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse = PrivateSendResponse | ErrorResponse;

// Submit signed deposit transaction and get auto-withdrawal
export async function submitDepositAndWithdraw(
  tokenType: 'SOL' | 'USDC',
  amount: number,
  recipientAddress: string,
  publicKey: string,
  signedDepositTransaction: string
): Promise<{ depositSignature: string; withdrawSignature: string }> {
  const response = await fetch('/api/private-send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'submit-deposit-and-withdraw',
      tokenType,
      amount,
      recipientAddress,
      publicKey,
      signedDepositTransaction
    } as PrivateSendRequest),
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || `API request failed with status ${response.status}`);
  }

  return {
    depositSignature: data.depositSignature,
    withdrawSignature: data.withdrawSignature
  };
}

// Helper function to serialize signed transaction to base64
export function serializeTransaction(tx: VersionedTransaction): string {
  return Buffer.from(tx.serialize()).toString('base64');
}
