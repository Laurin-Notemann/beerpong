import QRCode from 'qrcode';
import { useEffect, useState } from 'react';

/**
 * a QR code of `value` (empty until there is one), dark on white so phones read it from across
 * the room. A screen doesn't get scratched, so the lowest error correction: fewer, larger modules.
 */
export function Qr({ value, className }: { value: string | undefined; className?: string }) {
    const [svg, setSvg] = useState('');

    useEffect(() => {
        if (!value) return;
        QRCode.toString(value, { type: 'svg', margin: 1, errorCorrectionLevel: 'L' }).then(setSvg);
    }, [value]);

    return (
        <div
            className={`rounded-xl bg-white p-2 [&>svg]:size-full ${className ?? ''}`}
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
