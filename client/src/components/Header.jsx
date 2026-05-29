import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Header() {
  const [image, setImage] = useState('');

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setImage(s.header_image || ''))
      .catch(() => {});
  }, []);

  return (
    <header
      className={`site-header ${image ? '' : 'site-header--placeholder'}`}
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      <div className="site-header-overlay">
        {/* Латинские B C T визуально идентичны кириллическим В С Т —
            это позволяет использовать стенсил-шрифт Black Ops One (без кириллицы). */}
        <h1 className="site-header-title">BCT13</h1>
      </div>
    </header>
  );
}
