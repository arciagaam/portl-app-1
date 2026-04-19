'use client';

import QRCode from 'react-qr-code';

interface TicketQRCodeProps {
  value: string;
  size?: number;
  status?: string;
}

export function TicketQRCode({ value, size = 192, status }: TicketQRCodeProps) {
  const isUsed = status === 'CHECKED_IN';
  const isInvalid = status === 'CANCELLED' || status === 'EXPIRED';

  return (
    <div className="relative bg-white p-3 rounded-lg inline-block">
      <div className={(isUsed || isInvalid) ? 'opacity-20' : undefined}>
        <QRCode value={value} size={size} level="M" />
      </div>
      {isUsed && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-blue-600 text-white font-bold text-lg px-4 py-2 rounded-lg rotate-[-15deg] shadow-lg">
            CHECKED IN
          </div>
        </div>
      )}
      {isInvalid && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-red-600 text-white font-bold text-lg px-4 py-2 rounded-lg rotate-[-15deg] shadow-lg">
            {status === 'CANCELLED' ? 'CANCELLED' : 'EXPIRED'}
          </div>
        </div>
      )}
    </div>
  );
}
