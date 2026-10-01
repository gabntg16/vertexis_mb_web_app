import React, { useEffect, useState } from 'react';
import { loadPaymentProof } from '../../services/transactionCommands';

export function PaymentProofImage({ src, ...props }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [resolved, setResolved] = useState<string>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setResolved(undefined);
    setError('');
    if (src?.startsWith('private:')) {
      void loadPaymentProof(src.slice(8).split(':')[0]).then(value => { if (active) setResolved(value); }).catch(() => { if (active) setError('Proof could not be loaded. Check your connection and reopen this view.'); });
    } else if (src && (/^data:image\/(png|jpeg|webp);base64,/.test(src) || /^https:\/\//.test(src))) setResolved(src);
    else setError('No supported payment proof is available.');
    return () => { active = false; };
  }, [src]);
  if (error) return <p role="alert" className="p-4 text-sm text-red-700 dark:text-red-300">{error}</p>;
  if (!resolved) return <p role="status" className="p-4 text-sm text-neutral-500">Loading payment proof…</p>;
  return <img {...props} src={resolved} referrerPolicy="no-referrer" />;
}
