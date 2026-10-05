import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/** a QR code of `value`, dark on white so phones read it from across the room */
export function Qr({ value, className }: { value: string; className?: string }) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }).then(setSvg);
    }, [value]);

    return (
        <div
            className={`rounded-xl bg-white p-2 [&>svg]:size-full ${className ?? ''}`}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
