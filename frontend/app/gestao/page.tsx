"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "../lib/Header";
import { api, getPerfil, getToken, Perfil } from "../lib/api";
import { dataBR, dataHoraBR, titulo } from "../lib/format";

type Importacao = { id: number; arquivo: string; autor: string; linhas: number; novas: number; atualizadas: number; ignoradas: number; criado_em: string };
type Acessos = {
  franqueados: { franqueado: string; apolices: number; canceladas: number; usuarios: string[] }[];
  usuarios_portal: { usuario: string; nome: string }[];
  admins: string[];
};

export default function Gestao() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  useEffect(() => {
    if (!getToken()) return window.location.replace("/");
    const p = getPerfil();
    setPerfil(p);
    api<Perfil>("/me").then((p) => {
      setPerfil(p);
      if (!p.admin) window.location.replace("/painel");
    });
  }, []);

  return (
    <>
      <Header perfil={perfil} ativo="gestao" />
      <main className="max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        {perfil?.admin && (
          <>
            <Importar
              prefixo=""
              titulo="Importar relatório de não renovadas"
              arquivo="RptApolicesNaoRenovadas.XLS"
              pasta="Drive › TI › Apólices não renovadas"
              evento="vencimentos"
            />
            <Importar
              prefixo="/canceladas"
              titulo="Importar relatório de canceladas"
              arquivo="RptDocsEmitidos.XLS"
              pasta="Drive › TI › Apólices Canceladas"
              evento="cancelamentos"
            />
            <AcessosSecao />
          </>
        )}
      </main>
    </>
  );
}

type ImportarProps = { prefixo: string; titulo: string; arquivo: string; pasta: string; evento: string };

function Importar({ prefixo, titulo: tituloSecao, arquivo: nomeArquivo, pasta, evento }: ImportarProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [erro, setErro] = useState("");
  const [historico, setHistorico] = useState<Importacao[]>([]);

  const carregar = useCallback(() => {
    api<Importacao[]>(`${prefixo}/admin/importacoes`).then(setHistorico).catch(() => {});
  }, [prefixo]);
  useEffect(carregar, [carregar]);

  async function enviar() {
    if (!arquivo) return;
    setErro("");
    setResultado("");
    setEnviando(true);
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    try {
      const r = await api<{ linhas: number; novas: number; atualizadas: number; ignoradas: number; periodo: [string, string] }>(`${prefixo}/admin/importar`, { method: "POST", body: fd });
      setResultado(
        `${r.linhas} apólices lidas (${evento} de ${dataBR(r.periodo[0])} a ${dataBR(r.periodo[1])}): ${r.novas} novas, ${r.atualizadas} já existentes atualizadas, ${r.ignoradas} das unidades próprias da Piaseg ignoradas.`
      );
      setArquivo(null);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-navy text-lg">{tituloSecao}</h2>
        <p className="text-sm text-gray-600 mt-1">
          Envie o arquivo <strong>{nomeArquivo}</strong> do Quiver ({pasta}). Apólices já existentes são
          atualizadas e as respostas dos franqueados são sempre mantidas. Unidades Campo Grande - Piaseg, Dourados - Piaseg, Piaseg
          Consultoria e Studio Agronegócios são ignoradas automaticamente.
        </p>
      </div>
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gold/60 bg-amber-50/40 rounded-xl p-6 cursor-pointer hover:bg-amber-50">
        <span className="text-3xl">📄</span>
        <span className="text-sm font-medium text-navy">{arquivo ? arquivo.name : "Clique para escolher a planilha (.xls ou .xlsx)"}</span>
        <input type="file" accept=".xls,.xlsx" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
      </label>
      <div className="flex items-center gap-3">
        <button onClick={enviar} disabled={!arquivo || enviando} className="rounded-lg bg-navy text-white px-4 py-2 text-sm font-medium disabled:opacity-50">
          {enviando ? "Importando..." : "Importar planilha"}
        </button>
        {resultado && <p className="text-sm text-emerald-700">{resultado}</p>}
        {erro && <p className="text-sm text-red-700">{erro}</p>}
      </div>
      {historico.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Últimas importações</h3>
          <ul className="text-sm divide-y divide-gray-100">
            {historico.map((i) => (
              <li key={i.id} className="py-2 flex flex-wrap gap-x-4 text-gray-600">
                <span className="text-gray-900">{dataHoraBR(i.criado_em)}</span>
                <span>{i.arquivo}</span>
                <span>{i.linhas} lidas · {i.novas} novas · {i.atualizadas} atualizadas</span>
                <span className="text-gray-400">por {i.autor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function AcessosSecao() {
  const [dados, setDados] = useState<Acessos | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const carregar = useCallback(() => {
    api<Acessos>("/admin/acessos").then(setDados).catch((e) => setErro(e.message));
  }, []);
  useEffect(carregar, [carregar]);

  const nomePorUsuario = useMemo(() => Object.fromEntries((dados?.usuarios_portal || []).map((u) => [u.usuario, u.nome])), [dados]);
  const semAcesso = dados?.franqueados.filter((f) => f.usuarios.length === 0 && f.apolices + f.canceladas > 0) || [];

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
      <div>
        <h2 className="font-semibold text-navy text-lg">Acessos dos franqueados</h2>
        <p className="text-sm text-gray-600 mt-1">
          O franqueado entra com o mesmo usuário e senha do Portal do Franqueado. Aqui você define quais logins enxergam cada unidade de
          negócio. Cada login só vê as unidades vinculadas a ele.
        </p>
      </div>
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      {semAcesso.length > 0 && (
        <p className="text-sm bg-amber-50 border border-amber-200 text-amber-900 rounded-lg px-3 py-2">
          ⚠ Sem login vinculado: {semAcesso.map((f) => titulo(f.franqueado)).join(", ")}.
        </p>
      )}
      {!dados ? <p className="text-sm text-gray-400">Carregando...</p> : (
        <ul className="divide-y divide-gray-100">
          {dados.franqueados.map((f) => (
            <li key={f.franqueado} className="py-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-[220px]">
                  <div className="font-medium text-navy">{titulo(f.franqueado)}</div>
                  <div className="text-xs text-gray-500">{f.apolices} não renovadas · {f.canceladas} canceladas</div>
                </div>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {f.usuarios.length === 0 && <span className="text-sm text-gray-400">Nenhum login vinculado</span>}
                  {f.usuarios.map((u) => (
                    <span key={u} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700" title={u}>
                      {nomePorUsuario[u] || u} <span className="text-gray-400">· {u}</span>
                    </span>
                  ))}
                </div>
                <button onClick={() => setEditando(editando === f.franqueado ? null : f.franqueado)} className="text-sm text-navy underline">
                  {editando === f.franqueado ? "Fechar" : "Alterar"}
                </button>
              </div>
              {editando === f.franqueado && (
                <EditorVinculo
                  franqueado={f.franqueado}
                  atuais={f.usuarios}
                  usuarios={dados.usuarios_portal}
                  onSalvo={() => { setEditando(null); carregar(); }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
      {dados && <EditorAdmins admins={dados.admins} usuarios={dados.usuarios_portal} onSalvo={carregar} />}
    </section>
  );
}

function SeletorUsuarios({ selecionados, setSelecionados, usuarios }: { selecionados: string[]; setSelecionados: (s: string[]) => void; usuarios: { usuario: string; nome: string }[] }) {
  const [filtro, setFiltro] = useState("");
  const visiveis = usuarios.filter((u) => (u.nome + " " + u.usuario).toLowerCase().includes(filtro.toLowerCase()));
  return (
    <div className="space-y-2">
      <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar logins do portal..." className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm" />
      <div className="max-h-56 overflow-y-auto grid sm:grid-cols-2 gap-1">
        {visiveis.map((u) => (
          <label key={u.usuario} className="flex items-center gap-2 text-sm px-2 py-1 rounded hover:bg-gray-50 cursor-pointer">
            <input
              type="checkbox"
              checked={selecionados.includes(u.usuario)}
              onChange={(e) => setSelecionados(e.target.checked ? [...selecionados, u.usuario] : selecionados.filter((x) => x !== u.usuario))}
              className="accent-[#072a3c]"
            />
            <span className="truncate">{u.nome} <span className="text-gray-400 text-xs">{u.usuario}</span></span>
          </label>
        ))}
      </div>
    </div>
  );
}

function EditorVinculo({ franqueado, atuais, usuarios, onSalvo }: { franqueado: string; atuais: string[]; usuarios: { usuario: string; nome: string }[]; onSalvo: () => void }) {
  const [sel, setSel] = useState<string[]>(atuais);
  const [erro, setErro] = useState("");
  async function salvar() {
    try {
      await api("/admin/vinculos", { method: "PUT", body: JSON.stringify({ franqueado, usuarios: sel }) });
      onSalvo();
    } catch (e) {
      setErro((e as Error).message);
    }
  }
  return (
    <div className="mt-3 rounded-xl border border-gray-200 p-3 space-y-3 bg-gray-50/50">
      <SeletorUsuarios selecionados={sel} setSelecionados={setSel} usuarios={usuarios} />
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      <button onClick={salvar} className="rounded-lg bg-navy text-white px-4 py-1.5 text-sm">Salvar acessos de {titulo(franqueado)}</button>
    </div>
  );
}

function EditorAdmins({ admins, usuarios, onSalvo }: { admins: string[]; usuarios: { usuario: string; nome: string }[]; onSalvo: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<string[]>(admins);
  const [erro, setErro] = useState("");
  async function salvar() {
    setErro("");
    try {
      await api("/admin/admins", { method: "PUT", body: JSON.stringify({ usuarios: sel }) });
      setAberto(false);
      onSalvo();
    } catch (e) {
      setErro((e as Error).message);
    }
  }
  return (
    <div className="border-t border-gray-100 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <h3 className="font-semibold text-navy">Gestores (visão geral)</h3>
        <span className="text-sm text-gray-600">{admins.join(", ")}</span>
        <button onClick={() => { setSel(admins); setAberto(!aberto); }} className="text-sm text-navy underline ml-auto">{aberto ? "Fechar" : "Alterar"}</button>
      </div>
      {aberto && (
        <div className="mt-3 rounded-xl border border-gray-200 p-3 space-y-3 bg-gray-50/50">
          <SeletorUsuarios selecionados={sel} setSelecionados={setSel} usuarios={usuarios} />
          {erro && <p className="text-sm text-red-700">{erro}</p>}
          <button onClick={salvar} className="rounded-lg bg-navy text-white px-4 py-1.5 text-sm">Salvar gestores</button>
        </div>
      )}
    </div>
  );
}
