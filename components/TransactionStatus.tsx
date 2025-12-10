'use client';

interface TransactionStatusProps {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  txSignature?: string;
}

export default function TransactionStatus({ status, message, txSignature }: TransactionStatusProps) {
  if (status === 'idle') return null;

  const baseClasses = "p-4 rounded-lg mb-4";
  const statusClasses = {
    loading: `${baseClasses} bg-blue-50 border border-blue-200`,
    success: `${baseClasses} bg-green-50 border border-green-200`,
    error: `${baseClasses} bg-red-50 border border-red-200`
  };

  return (
    <div className={statusClasses[status]}>
      <div className="flex items-center gap-2">
        {status === 'loading' && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        )}
        {status === 'success' && (
          <div className="h-4 w-4 rounded-full bg-green-600"></div>
        )}
        {status === 'error' && (
          <div className="h-4 w-4 rounded-full bg-red-600"></div>
        )}
        <span className={status === 'error' ? 'text-red-800' : status === 'success' ? 'text-green-800' : 'text-blue-800'}>
          {message}
        </span>
      </div>
      {txSignature && status === 'success' && (
        <div className="mt-2">
          <a
            href={`https://explorer.solana.com/tx/${txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View on Solana Explorer →
          </a>
        </div>
      )}
    </div>
  );
}

