"use client";

import { Perfil, sair } from "./api";

export default function Header({ perfil, ativo }: { perfil: Perfil | null; ativo: "painel" | "gestao" }) {
  const link = (href: string, rotulo: string, chave: string) => (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm ${ativo === chave ? "bg-white/15 text-white" : "text-white/70 hover:text-white"}`}
    >
      {rotulo}
    </a>
  );
  return (
    <header className="bg-navy text-white">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <a href="/painel" className="flex items-baseline gap-3">
          <span className="font-display text-gold text-2xl">Piaseg</span>
          <span className="text-white/80 text-sm hidden sm:inline">Apólices não Renovadas</span>
        </a>
        {perfil?.admin && (
          <nav className="flex gap-1">
            {link("/painel", "Painel", "painel")}
            {link("/gestao", "Importar e acessos", "gestao")}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="text-white/80 truncate max-w-[180px]">{perfil?.nome}</span>
          <button onClick={() => sair()} className="rounded-lg border border-white/30 px-3 py-1 hover:bg-white/10">
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
