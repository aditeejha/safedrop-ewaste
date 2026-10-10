import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function Qr({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: '#15171c', light: '#ffffff' } }).then(setSrc)
  }, [value, size])
  return src ? <img src={src} width={size} height={size} alt={label} /> : <div style={{ width: size, height: size }} className="bg-paper" />
}
