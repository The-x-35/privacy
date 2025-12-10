'use client';

import { useState } from 'react';
import { PrivacyCash } from 'privacycash';
import { Connection, VersionedTransaction } from '@solana/web3.js';
import { solToLamports, usdcToBaseUnits } from '@/lib/utils';
import TransactionStatus from './TransactionStatus';

interface DepositFormProps {
  privacyCash: PrivacyCash | null;
  connection: Connection | null;
  signTransaction: ((tx: VersionedTransaction) => Promise<VersionedTransaction>) | null;
}

export default function DepositForm({ privacyCash, connection, signTransaction }: DepositFormProps) {
  const [activeTab, setActiveTab] = useState<'sol' | 'usdc'>('sol');
  const [solAmount, setSolAmount] = useState('');
  const [usdcAmount, setUsdcAmount] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [txSignature, setTxSignature] = useState<string | undefined>();

  const handleDeposit = async () => {
    if (!privacyCash || !connection || !signTransaction) {
      setStatus('error');
      setMessage('Wallet not connected');
      return;
    }

    try {
      setStatus('loading');
      setMessage('Preparing deposit transaction...');
      setTxSignature(undefined);

      if (activeTab === 'sol') {
        const lamports = solToLamports(parseFloat(solAmount));
        if (isNaN(lamports) || lamports <= 0) {
          throw new Error('Invalid SOL amount');
        }

        setMessage('Generating zero-knowledge proof...');
        // Create a custom deposit that uses the wallet's signTransaction
        const client = privacyCash as any;
        const result = await client.deposit({ lamports });
        
        setTxSignature(result.tx);
        setStatus('success');
        setMessage(`Successfully deposited ${solAmount} SOL`);
        setSolAmount('');
      } else {
        const baseUnits = usdcToBaseUnits(parseFloat(usdcAmount));
        if (isNaN(baseUnits) || baseUnits <= 0) {
          throw new Error('Invalid USDC amount');
        }

        setMessage('Generating zero-knowledge proof...');
        const client = privacyCash as any;
        const result = await client.depositUSDC({ base_units: baseUnits });
        
        setTxSignature(result.tx);
        setStatus('success');
        setMessage(`Successfully deposited ${usdcAmount} USDC`);
        setUsdcAmount('');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.message || 'Deposit failed');
      console.error('Deposit error:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Deposit</h2>
      
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

        <button
          onClick={handleDeposit}
          disabled={status === 'loading' || !privacyCash || (activeTab === 'sol' ? !solAmount : !usdcAmount)}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {status === 'loading' ? 'Processing...' : `Deposit ${activeTab === 'sol' ? 'SOL' : 'USDC'}`}
        </button>
      </div>
    </div>
  );
}

