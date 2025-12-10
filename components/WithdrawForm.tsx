'use client';

import { useState } from 'react';
import { PrivacyCash } from 'privacycash';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { solToLamports, usdcToBaseUnits } from '@/lib/utils';
import TransactionStatus from './TransactionStatus';

interface WithdrawFormProps {
  privacyCash: PrivacyCash | null;
  connection: Connection | null;
  signTransaction: ((tx: VersionedTransaction) => Promise<VersionedTransaction>) | null;
  walletAddress: string | null;
}

export default function WithdrawForm({ privacyCash, connection, signTransaction, walletAddress }: WithdrawFormProps) {
  const [activeTab, setActiveTab] = useState<'sol' | 'usdc'>('sol');
  const [solAmount, setSolAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [txSignature, setTxSignature] = useState<string | undefined>();

  const handleWithdraw = async () => {
    if (!privacyCash || !connection || !signTransaction) {
      setStatus('error');
      setMessage('Wallet not connected');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Preparing withdraw transaction...');
      setTxSignature(undefined);

      const recipient = recipientAddress || walletAddress || '';
      if (!recipient) {
        throw new Error('Recipient address is required');
      }

      if (activeTab === 'sol') {
        const lamports = solToLamports(parseFloat(solAmount));
        if (isNaN(lamports) || lamports <= 0) {
          throw new Error('Invalid SOL amount');
        }

        setMessage('Generating zero-knowledge proof...');
        const client = privacyCash as any;
        const result = await client.withdraw({ 
          lamports,
          recipientAddress: recipient 
        });
        
        setTxSignature(result.tx);
        setStatus('success');
        setMessage(`Successfully withdrew ${solAmount} SOL to ${recipient}`);
        setSolAmount('');
        setRecipientAddress('');
      } else {
        const baseUnits = usdcToBaseUnits(parseFloat(usdcAmount));
        if (isNaN(baseUnits) || baseUnits <= 0) {
          throw new Error('Invalid USDC amount');
        }

        setMessage('Generating zero-knowledge proof...');
        const client = privacyCash as any;
        const result = await client.withdrawUSDC({ 
          base_units: baseUnits,
          recipientAddress: recipient 
        });
        
        setTxSignature(result.tx);
        setStatus('success');
        setMessage(`Successfully withdrew ${usdcAmount} USDC to ${recipient}`);
        setUsdcAmount('');
        setRecipientAddress('');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Withdraw failed');
      console.error('Withdraw error:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Withdraw</h2>
      
      <div className="flex gap-2 mb-4 border-b">
        <button
          onClick={() => setActiveTab('sol')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'sol'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          SOL
        </button>
        <button
          onClick={() => setActiveTab('usdc')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'usdc'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          USDC
        </button>
      </div>

      <TransactionStatus status={status} message={message} txSignature={txSignature} />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount ({activeTab === 'sol' ? 'SOL' : 'USDC'})
          </label>
          <input
            type="number"
            step="any"
            value={activeTab === 'sol' ? solAmount : usdcAmount}
            onChange={(e) => activeTab === 'sol' ? setSolAmount(e.target.value) : setUsdcAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`Enter ${activeTab === 'sol' ? 'SOL' : 'USDC'} amount`}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address (optional, defaults to your wallet)
          </label>
          <input
            type="text"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={walletAddress || 'Enter recipient address'}
          />
        </div>

        <button
          onClick={handleWithdraw}
          disabled={status === 'loading' || !privacyCash || (activeTab === 'sol' ? !solAmount : !usdcAmount)}
          className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {status === 'loading' ? 'Processing...' : `Withdraw ${activeTab === 'sol' ? 'SOL' : 'USDC'}`}
        </button>
      </div>
    </div>
  );
}

