"use client";

import { useEffect, useState } from "react";
import { api, getToken, Perfil, salvarSessao } from "./lib/api";

export default function Login() {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (getToken()) window.location.replace("/painel");
    if (new URLSearchParams(window.location.search).get("expirada")) setAviso("Sua sessão expirou. Faça login novamente.");
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const r = await api<Perfil & { token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ usuario: usuario.trim().toLowerCase(), senha }),
      });
      const { token, ...perfil } = r;
      salvarSessao(token, perfil);
      window.location.href = "/painel";
    } catch (e) {
      setErro((e as Error).message);
      setCarregando(false);
    }
  }

  return (
    <main className="flex-1 grid place-items-center bg-navy px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-gold text-4xl tracking-wide">Piaseg</div>
          <div className="text-white/80 mt-2 text-lg">Apólices não Renovadas e Canceladas</div>
        </div>
        <form onSubmit={entrar} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          {aviso && <p className="text-sm bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-3 py-2">{aviso}</p>}
          <p className="text-sm text-gray-600">
            Use o <strong>mesmo usuário e senha</strong> do Portal do Franqueado.
          </p>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Usuário (e-mail)</span>
            <input
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Senha</span>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
              required
            />
          </label>
          {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}
          <button
            disabled={carregando}
            className="w-full rounded-lg bg-navy text-white font-medium py-2.5 hover:bg-navy-2 disabled:opacity-60"
          >
            {carregando ? "Verificando..." : "Entrar"}
          </button>
        </form>
      </div>
    </main>
  );
}
