'use client';

import { useState } from 'react';
import { formatSOL, formatUSDC } from '@/lib/utils';

interface BalanceCardProps {
  solBalance: number | null;
  usdcBalance: number | null;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
}

export default function BalanceCard({ solBalance, usdcBalance, onRefresh, isLoading }: BalanceCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Private Balances</h2>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">SOL Balance</div>
          <div className="text-3xl font-bold text-gray-800">
            {solBalance !== null ? formatSOL(solBalance) : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {solBalance !== null ? `${solBalance.toLocaleString()} lamports` : ''}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">USDC Balance</div>
          <div className="text-3xl font-bold text-gray-800">
            {usdcBalance !== null ? formatUSDC(usdcBalance) : '--'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {usdcBalance !== null ? `${usdcBalance.toLocaleString()} base units` : ''}
          </div>
        </div>
      </div>
    </div>
  );
}

