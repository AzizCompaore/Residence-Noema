import React, { useEffect, useState } from 'react';

export const COOKIE_PREFERENCE_EVENT = 'noema-cookie-preferences';
export const COOKIE_PREFERENCE_KEY = 'noema_cookie_preference_v2';
export function hasOptionalCookieConsent(): boolean { return window.localStorage.getItem(COOKIE_PREFERENCE_KEY) === 'accepted'; }

export const CookieConsent: React.FC = () => {
  const [isOpen, setIsOpen] = useState(() => !window.localStorage.getItem(COOKIE_PREFERENCE_KEY));
  useEffect(() => { const open = () => setIsOpen(true); window.addEventListener('noema-open-cookie-preferences', open); return () => window.removeEventListener('noema-open-cookie-preferences', open); }, []);
  const choose = (preference: 'accepted' | 'refused') => { window.localStorage.setItem(COOKIE_PREFERENCE_KEY, preference); window.dispatchEvent(new Event(COOKIE_PREFERENCE_EVENT)); setIsOpen(false); };
  if (!isOpen) return null;
  return <aside role="dialog" aria-label="Préférences de cookies" className="fixed inset-x-3 bottom-3 z-[70] rounded-2xl border border-[#e5c9b1] bg-[#fffdf9] p-5 text-[#5b3a2e] shadow-[0_18px_60px_rgba(91,58,46,0.22)] sm:inset-x-auto sm:left-6 sm:max-w-xl"><p className="text-sm font-bold">Votre confidentialité compte</p><p className="mt-2 text-xs leading-5 text-neutral-600">Le site utilise uniquement les cookies nécessaires à son fonctionnement. La carte Google Maps est affichée comme contenu tiers, sans outil de suivi publicitaire ajouté par NOEMA.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => choose('accepted')} className="rounded-lg bg-[#d15a3a] px-4 py-2.5 text-xs font-bold text-white">Accepter</button><button type="button" onClick={() => choose('refused')} className="rounded-lg border border-[#d15a3a] px-4 py-2.5 text-xs font-bold text-[#d15a3a]">Refuser</button><a href="/politique-des-cookies/" className="rounded-lg px-3 py-2.5 text-xs font-bold text-neutral-600 underline">Personnaliser</a></div></aside>;
};