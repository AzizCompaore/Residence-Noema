import React from 'react';
import { ArrowLeft, Home, ShieldAlert } from 'lucide-react';

export const ErrorPage: React.FC<{ status: 403 | 404 | 500 }> = ({ status }) => {
  const copy = {
    403: ['Accès refusé', 'Vous n’avez pas l’autorisation d’accéder à cette page.'],
    404: ['Page introuvable', 'Cette adresse ne correspond à aucune page de la Résidence NOEMA.'],
    500: ['Service momentanément indisponible', 'Une erreur technique est survenue. Veuillez réessayer dans quelques instants.'],
  }[status];
  return <main className="grid min-h-screen place-items-center bg-[#fbf8f2] px-6 text-center text-[#5b3a2e]"><div className="max-w-md"><ShieldAlert className="mx-auto h-12 w-12 text-[#d15a3a]" /><p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#d15a3a]">Erreur {status}</p><h1 className="mt-3 font-serif text-4xl font-bold">{copy[0]}</h1><p className="mt-4 text-sm leading-6 text-neutral-600">{copy[1]}</p><div className="mt-8 flex justify-center gap-3"><button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-2 rounded-lg border border-[#d15a3a] px-4 py-3 text-xs font-bold text-[#d15a3a]"><ArrowLeft className="h-4 w-4" /> Retour</button><a href="/" className="inline-flex items-center gap-2 rounded-lg bg-[#d15a3a] px-4 py-3 text-xs font-bold text-white"><Home className="h-4 w-4" /> Accueil</a></div></div></main>;
};