"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./Header";
import { api, Apolice, baixar, getPerfil, getToken, MesResumo, Perfil, Resposta, Resumo } from "./api";
import { brl, brlCurto, dataBR, dataHoraBR, MESES, MESES_LONGOS, titulo } from "./format";

type Situacao = "" | "pendente" | "respondida";

export type Tipo = "nao-renovadas" | "canceladas";

type Config = {
  prefixo: string; // prefixo das rotas no backend
  nome: string;
  meusClientes: string;
  eventoMes: string; // "vencimento" | "cancelamento"
  data: (a: Apolice) => string; // data que define o mês
  pergunta: string;
  dicaComentario: string;
};

const CONFIG: Record<Tipo, Config> = {
  "nao-renovadas": {
    prefixo: "",
    nome: "não renovadas",
    meusClientes: "Meus clientes não renovados",
    eventoMes: "vencimento",
    data: (a) => a.termino || "",
    pergunta: "O que aconteceu com este cliente?",
    dicaComentario: "Comentário (opcional): detalhes do contato, próximo passo, valor da concorrência...",
  },
  canceladas: {
    prefixo: "/canceladas",
    nome: "canceladas",
    meusClientes: "Meus clientes com apólice cancelada",
    eventoMes: "cancelamento",
    data: (a) => a.cancelamento || "",
    pergunta: "Por que esta apólice foi cancelada?",
    dicaComentario: "Comentário (opcional): detalhes do contato, próximo passo, se dá para recuperar o cliente...",
  },
};

export default function PainelApolices({ tipo }: { tipo: Tipo }) {
  const cfg = CONFIG[tipo];
  const P = cfg.prefixo;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [anos, setAnos] = useState<number[]>([]);
  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [mes, setMes] = useState<number | null>(null);
  const [franqueado, setFranqueado] = useState("");
  const [situacao, setSituacao] = useState<Situacao>("");
  const [busca, setBusca] = useState("");
  const [buscaAtiva, setBuscaAtiva] = useState("");
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [lista, setLista] = useState<Apolice[] | null>(null);
  const [statusOpcoes, setStatusOpcoes] = useState<string[]>([]);
  const [aberta, setAberta] = useState<Apolice | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!getToken()) {
      window.location.replace("/");
      return;
    }
    setPerfil(getPerfil());
    api<Perfil>("/me").then(setPerfil).catch(() => {});
    api<string[]>(`${P}/status-opcoes`).then(setStatusOpcoes).catch(() => {});
    api<number[]>(`${P}/anos`)
      .then((a) => {
        setAnos(a);
        if (!a.includes(new Date().getFullYear())) setAno(a[0]);
      })
      .catch((e) => setErro(e.message));
  }, [P]);

  useEffect(() => {
    const t = setTimeout(() => setBuscaAtiva(busca), 350);
    return () => clearTimeout(t);
  }, [busca]);

  const params = useCallback(
    (comMes = true) => {
      const p = new URLSearchParams({ ano: String(ano) });
      if (comMes && mes) p.set("mes", String(mes));
      if (franqueado) p.set("franqueado", franqueado);
      if (situacao) p.set("situacao", situacao);
      if (buscaAtiva) p.set("busca", buscaAtiva);
      return p.toString();
    },
    [ano, mes, franqueado, situacao, buscaAtiva]
  );

  const carregarResumo = useCallback(() => {
    const p = new URLSearchParams({ ano: String(ano) });
    if (franqueado) p.set("franqueado", franqueado);
    api<Resumo>(`${P}/resumo?${p}`).then(setResumo).catch((e) => setErro(e.message));
  }, [ano, franqueado, P]);

  useEffect(() => {
    if (!getToken()) return;
    carregarResumo();
  }, [carregarResumo]);

  useEffect(() => {
    if (!getToken()) return;
    setLista(null);
    api<Apolice[]>(`${P}/apolices?${params()}`).then(setLista).catch((e) => setErro(e.message));
  }, [params, P]);

  const franqueadosDisponiveis = useMemo(() => {
    if (!perfil) return [];
    if (perfil.admin) return (resumo?.franqueados || []).map((f) => f.franqueado).sort();
    return perfil.franqueados;
  }, [perfil, resumo]);

  const doMes: MesResumo | null = mes && resumo ? resumo.meses[mes - 1] : null;
  const kpi = doMes
    ? { total: doMes.qtd, premio: doMes.premio, respondidas: doMes.respondidas }
    : resumo
      ? { total: resumo.total, premio: resumo.premio, respondidas: resumo.respondidas }
      : null;
  const periodo = mes ? `${MESES_LONGOS[mes - 1]} de ${ano}` : `${ano}, todos os meses`;

  function aposResponder(a: Apolice) {
    setLista((l) => (l ? l.map((x) => (x.id === a.id ? a : x)) : l));
    setAberta(a);
    carregarResumo();
  }

  return (
    <>
      <Header perfil={perfil} ativo={tipo} />
      <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="mr-auto">
            <h1 className="text-2xl font-semibold text-navy">
              {franqueado ? titulo(franqueado) : perfil?.admin ? "Visão geral da rede" : cfg.meusClientes}
            </h1>
            <p className="text-sm text-gray-500">{periodo}</p>
          </div>
          <Campo rotulo="Ano">
            <select value={ano} onChange={(e) => { setAno(Number(e.target.value)); setMes(null); }} className={selectCls}>
              {(anos.length ? anos : [ano]).map((a) => <option key={a}>{a}</option>)}
            </select>
          </Campo>
          {(perfil?.admin || franqueadosDisponiveis.length > 1) && (
            <Campo rotulo="Franqueado">
              <select value={franqueado} onChange={(e) => setFranqueado(e.target.value)} className={selectCls + " max-w-[240px]"}>
                <option value="">{perfil?.admin ? "Todos os franqueados" : "Todas as minhas unidades"}</option>
                {franqueadosDisponiveis.map((f) => <option key={f} value={f}>{titulo(f)}</option>)}
              </select>
            </Campo>
          )}
        </div>

        {erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kpi rotulo={`Apólices ${cfg.nome}`} valor={kpi ? String(kpi.total) : "—"} />
          <Kpi rotulo={tipo === "canceladas" ? "Prêmio líquido cancelado" : "Prêmio líquido não renovado"} valor={kpi ? brl(kpi.premio) : "—"} />
          <Kpi
            rotulo="Respondidas"
            valor={kpi ? String(kpi.respondidas) : "—"}
            detalhe={kpi && kpi.total ? `${Math.round((kpi.respondidas / kpi.total) * 100)}% do total` : undefined}
          />
          <Kpi rotulo="Aguardando resposta" valor={kpi ? String(kpi.total - kpi.respondidas) : "—"} destaque={!!kpi && kpi.total - kpi.respondidas > 0} />
        </section>

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="font-semibold text-navy">Apólices {cfg.nome} por mês de {cfg.eventoMes}</h2>
            <div className="flex items-center gap-4 text-xs text-gray-600 ml-auto">
              <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-navy inline-block" />Respondidas</span>
              <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#9db4c3] inline-block" />Aguardando resposta</span>
            </div>
          </div>
          {resumo ? <GraficoMeses meses={resumo.meses} selecionado={mes} onSelecionar={(m) => setMes(m === mes ? null : m)} /> : <Carregando />}
          <div className="flex flex-wrap gap-1.5 mt-4">
            <Chip ativo={mes === null} onClick={() => setMes(null)}>Todos os meses</Chip>
            {resumo?.meses.filter((m) => m.qtd > 0).map((m) => (
              <Chip key={m.mes} ativo={mes === m.mes} onClick={() => setMes(m.mes)}>
                {MESES[m.mes - 1]} · {m.qtd}
              </Chip>
            ))}
          </div>
        </section>

        {perfil?.admin && !franqueado && resumo && (
          <MatrizFranqueados nome={cfg.nome} resumo={resumo} onSelecionar={(f) => { setFranqueado(f); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        )}

        {resumo && resumo.por_status.length > 0 && <MotivosResumo resumo={resumo} />}

        <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
          <div className="p-5 flex flex-wrap items-center gap-3 border-b border-gray-100">
            <h2 className="font-semibold text-navy mr-auto">
              Clientes {mes ? `com ${cfg.eventoMes} em ${MESES_LONGOS[mes - 1]}` : `de ${ano}`}
              {lista && <span className="text-gray-400 font-normal"> · {lista.length}</span>}
            </h2>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={tipo === "canceladas" ? "Buscar cliente, apólice, seguradora..." : "Buscar cliente, CPF/CNPJ, apólice..."}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm w-full sm:w-64"
            />
            <select value={situacao} onChange={(e) => setSituacao(e.target.value as Situacao)} className={selectCls}>
              <option value="">Todas as situações</option>
              <option value="pendente">Aguardando resposta</option>
              <option value="respondida">Respondidas</option>
            </select>
            <button
              onClick={() => baixar(`${P}/exportar?${params()}`, `apolices-${tipo}-${ano}${mes ? "-" + String(mes).padStart(2, "0") : ""}.xlsx`).catch((e) => setErro(e.message))}
              className="rounded-lg border border-navy text-navy text-sm px-3 py-1.5 hover:bg-navy hover:text-white"
            >
              Exportar Excel
            </button>
          </div>
          {lista === null ? <div className="p-5"><Carregando /></div> : lista.length === 0 ? (
            <p className="p-8 text-center text-gray-500">Nenhuma apólice encontrada com esses filtros.</p>
          ) : (
            <TabelaApolices cfg={cfg} lista={lista} mostrarFranqueado={!franqueado && (!!perfil?.admin || franqueadosDisponiveis.length > 1)} onAbrir={setAberta} />
          )}
        </section>
      </main>
      {aberta && <ModalApolice cfg={cfg} apolice={aberta} opcoes={statusOpcoes} onFechar={() => setAberta(null)} onRespondida={aposResponder} />}
    </>
  );
}

const selectCls = "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm";

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-gray-500">
      {rotulo}
      {children}
    </label>
  );
}

function Carregando() {
  return <div className="h-24 grid place-items-center text-sm text-gray-400">Carregando...</div>;
}

function Kpi({ rotulo, valor, detalhe, destaque }: { rotulo: string; valor: string; detalhe?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${destaque ? "bg-amber-50 border-gold/50" : "bg-white border-gray-200"} shadow-sm`}>
      <div className="text-xs text-gray-500">{rotulo}</div>
      <div className="text-lg sm:text-2xl font-semibold text-navy mt-1 tabular-nums break-words">{valor}</div>
      {detalhe && <div className="text-xs text-gray-500 mt-0.5">{detalhe}</div>}
    </div>
  );
}

function Chip({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs border ${ativo ? "bg-navy text-white border-navy" : "bg-white text-gray-700 border-gray-300 hover:border-navy"}`}
    >
      {children}
    </button>
  );
}

function GraficoMeses({ meses, selecionado, onSelecionar }: { meses: MesResumo[]; selecionado: number | null; onSelecionar: (m: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...meses.map((m) => m.qtd));
  const altura = 180;
  return (
    <div className="relative">
      <div className="flex items-end gap-1 sm:gap-2 border-b border-gray-200" style={{ height: altura + 24 }}>
        {meses.map((m) => {
          const h = (m.qtd / max) * altura;
          const hResp = m.qtd ? (m.respondidas / m.qtd) * h : 0;
          const ativo = selecionado === m.mes;
          const apagado = selecionado !== null && !ativo;
          return (
            <button
              key={m.mes}
              onClick={() => m.qtd && onSelecionar(m.mes)}
              onMouseEnter={() => setHover(m.mes)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(m.mes)}
              onBlur={() => setHover(null)}
              aria-label={`${MESES_LONGOS[m.mes - 1]}: ${m.qtd} apólices, ${m.respondidas} respondidas`}
              className="relative flex-1 h-full flex flex-col justify-end items-center group"
            >
              {(ativo || hover === m.mes) && m.qtd > 0 && (
                <span className="text-xs font-semibold text-navy mb-1 tabular-nums">{m.qtd}</span>
              )}
              <div
                className={`w-full max-w-[44px] flex flex-col justify-end gap-[2px] transition-opacity ${apagado ? "opacity-35" : ""}`}
                style={{ height: h }}
              >
                {m.qtd - m.respondidas > 0 && (
                  <div className="w-full bg-[#9db4c3] rounded-t" style={{ flexGrow: m.qtd - m.respondidas }} />
                )}
                {m.respondidas > 0 && (
                  <div className={`w-full bg-navy ${m.respondidas === m.qtd ? "rounded-t" : ""}`} style={{ flexGrow: m.respondidas, minHeight: hResp ? 2 : 0 }} />
                )}
              </div>
              {ativo && <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 w-8 h-[3px] bg-gold rounded" />}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1 sm:gap-2 mt-1.5">
        {meses.map((m) => (
          <div key={m.mes} className={`flex-1 text-center text-[11px] ${selecionado === m.mes ? "text-navy font-semibold" : "text-gray-500"}`}>
            {MESES[m.mes - 1]}
          </div>
        ))}
      </div>
      {hover !== null && meses[hover - 1].qtd > 0 && (
        <div
          className="absolute top-0 z-10 pointer-events-none bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 text-xs w-48"
          style={{ left: `clamp(0px, calc(${((hover - 0.5) / 12) * 100}% - 96px), calc(100% - 192px))` }}
        >
          <div className="font-semibold text-navy mb-1">{MESES_LONGOS[hover - 1]}</div>
          <Linha k="Apólices" v={String(meses[hover - 1].qtd)} />
          <Linha k="Prêmio líquido" v={brl(meses[hover - 1].premio)} />
          <Linha k="Respondidas" v={String(meses[hover - 1].respondidas)} />
          <Linha k="Aguardando" v={String(meses[hover - 1].qtd - meses[hover - 1].respondidas)} />
        </div>
      )}
    </div>
  );
}

function Linha({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2 text-gray-600">
      <span>{k}</span>
      <span className="text-gray-900 tabular-nums">{v}</span>
    </div>
  );
}

function MatrizFranqueados({ nome, resumo, onSelecionar }: { nome: string; resumo: Resumo; onSelecionar: (f: string) => void }) {
  const mesesComDados = resumo.meses.filter((m) => m.qtd > 0).map((m) => m.mes);
  const max = Math.max(1, ...resumo.franqueados.flatMap((f) => Object.values(f.meses)));
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="p-5 pb-3">
        <h2 className="font-semibold text-navy">Franqueados × mês</h2>
        <p className="text-xs text-gray-500">Quantidade de apólices {nome}. Clique em um franqueado para ver os clientes dele.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 border-y border-gray-100">
              <th className="text-left font-medium px-5 py-2 sticky left-0 bg-white">Franqueado</th>
              {mesesComDados.map((m) => <th key={m} className="font-medium px-1 py-2 text-center w-12">{MESES[m - 1]}</th>)}
              <th className="font-medium px-3 py-2 text-right">Total</th>
              <th className="font-medium px-3 py-2 text-right">Prêmio</th>
              <th className="font-medium px-5 py-2 text-left w-40">Respondidas</th>
            </tr>
          </thead>
          <tbody>
            {resumo.franqueados.map((f) => {
              const pct = f.qtd ? Math.round((f.respondidas / f.qtd) * 100) : 0;
              return (
                <tr key={f.franqueado} onClick={() => onSelecionar(f.franqueado)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-1.5 sticky left-0 bg-white text-navy font-medium whitespace-nowrap">{titulo(f.franqueado)}</td>
                  {mesesComDados.map((m) => {
                    const v = f.meses[String(m)] || 0;
                    const t = v / max;
                    return (
                      <td key={m} className="px-0.5 py-0.5">
                        <div
                          className="h-7 rounded grid place-items-center text-xs tabular-nums"
                          style={{ background: v ? `rgba(7,42,60,${0.08 + t * 0.85})` : "transparent", color: t > 0.45 ? "#fff" : "#1f2937" }}
                          title={`${titulo(f.franqueado)} · ${MESES_LONGOS[m - 1]}: ${v}`}
                        >
                          {v || ""}
                        </div>
                      </td>
                    );
                  })}
                  <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{f.qtd}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-gray-600 whitespace-nowrap">{brlCurto(f.premio)}</td>
                  <td className="px-5 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-navy rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs tabular-nums w-9 text-right text-gray-600">{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MotivosResumo({ resumo }: { resumo: Resumo }) {
  const max = Math.max(1, ...resumo.por_status.map((s) => s.qtd));
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-semibold text-navy mb-3">Motivos informados ({resumo.respondidas} respostas)</h2>
      <div className="space-y-2">
        {resumo.por_status.sort((a, b) => b.qtd - a.qtd).map((s) => (
          <div key={s.status} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-3 text-sm">
            <span className="text-gray-700 truncate" title={s.status}>{s.status}</span>
            <div className="h-2.5 bg-gray-100 rounded">
              <div className="h-full bg-navy rounded-r" style={{ width: `${(s.qtd / max) * 100}%` }} />
            </div>
            <span className="tabular-nums text-gray-900 w-8 text-right">{s.qtd}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function BadgeStatus({ a }: { a: Apolice }) {
  if (!a.status) return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 text-xs whitespace-nowrap">● Aguardando resposta</span>;
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-xs">✓ {a.status}</span>;
}

function TabelaApolices({ cfg, lista, mostrarFranqueado, onAbrir }: { cfg: Config; lista: Apolice[]; mostrarFranqueado: boolean; onAbrir: (a: Apolice) => void }) {
  return (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-gray-500 text-left border-b border-gray-100">
              {mostrarFranqueado && <th className="font-medium px-5 py-2">Franqueado</th>}
              <th className="font-medium px-5 py-2">Cliente</th>
              <th className="font-medium px-3 py-2">Produto / Seguradora</th>
              <th className="font-medium px-3 py-2">Apólice</th>
              <th className="font-medium px-3 py-2">{cfg.eventoMes === "vencimento" ? "Término" : "Cancelamento"}</th>
              <th className="font-medium px-3 py-2 text-right">Prêmio líquido</th>
              <th className="font-medium px-3 py-2">Situação</th>
              <th className="px-5 py-2" />
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                {mostrarFranqueado && <td className="px-5 py-2.5 text-gray-600 whitespace-nowrap">{titulo(a.franqueado)}</td>}
                <td className="px-5 py-2.5">
                  <div className="font-medium text-gray-900">{a.cliente}</div>
                  {a.documento && <div className="text-xs text-gray-500">{a.documento}</div>}
                </td>
                <td className="px-3 py-2.5">
                  <div>{a.produto}</div>
                  <div className="text-xs text-gray-500">{a.seguradora}</div>
                </td>
                <td className="px-3 py-2.5 tabular-nums">{a.numero}</td>
                <td className="px-3 py-2.5 tabular-nums whitespace-nowrap">
                  {dataBR(cfg.data(a))}
                  {a.vigencia_inicio && a.vigencia_fim && <div className="text-xs text-gray-500">vig. {dataBR(a.vigencia_inicio)} a {dataBR(a.vigencia_fim)}</div>}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap">{brl(a.premio)}</td>
                <td className="px-3 py-2.5 max-w-[260px]">
                  <BadgeStatus a={a} />
                  {!a.no_ultimo_relatorio && <div className="text-[11px] text-gray-500 mt-1">Não consta mais no último relatório</div>}
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button onClick={() => onAbrir(a)} className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap ${a.status ? "border border-gray-300 text-gray-700 hover:border-navy" : "bg-gold text-navy hover:bg-gold-2 hover:text-white"}`}>
                    {a.status ? "Ver / atualizar" : "Responder"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="md:hidden divide-y divide-gray-100">
        {lista.map((a) => (
          <li key={a.id} className="p-4 space-y-1.5">
            {mostrarFranqueado && <div className="text-xs text-gray-500">{titulo(a.franqueado)}</div>}
            <div className="font-medium">{a.cliente}</div>
            <div className="text-xs text-gray-500">{a.produto} · {a.seguradora} · {cfg.eventoMes === "vencimento" ? "venc." : "cancelada em"} {dataBR(cfg.data(a))}</div>
            <div className="flex items-center justify-between gap-2">
              <span className="tabular-nums text-sm">{brl(a.premio)}</span>
              <button onClick={() => onAbrir(a)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${a.status ? "border border-gray-300" : "bg-gold text-navy"}`}>
                {a.status ? "Ver / atualizar" : "Responder"}
              </button>
            </div>
            <BadgeStatus a={a} />
          </li>
        ))}
      </ul>
    </>
  );
}

function ModalApolice({ cfg, apolice, opcoes, onFechar, onRespondida }: { cfg: Config; apolice: Apolice; opcoes: string[]; onFechar: () => void; onRespondida: (a: Apolice) => void }) {
  const [historico, setHistorico] = useState<Resposta[] | null>(null);
  const [status, setStatus] = useState("");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);

  const carregar = useCallback(() => {
    api<Resposta[]>(`${cfg.prefixo}/apolices/${apolice.id}/respostas`).then(setHistorico).catch((e) => setErro(e.message));
  }, [apolice.id, cfg.prefixo]);
  useEffect(carregar, [carregar]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!status) return setErro("Escolha a situação do cliente.");
    setErro("");
    setEnviando(true);
    try {
      const a = await api<Apolice>(`${cfg.prefixo}/apolices/${apolice.id}/respostas`, { method: "POST", body: JSON.stringify({ status, comentario }) });
      setStatus("");
      setComentario("");
      setOk(true);
      onRespondida(a);
      carregar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4" onClick={onFechar}>
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start gap-3">
          <div className="mr-auto">
            <div className="text-xs text-gray-500">{titulo(apolice.franqueado)}</div>
            <h3 className="text-lg font-semibold text-navy">{apolice.cliente}</h3>
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-700 text-2xl leading-none" aria-label="Fechar">×</button>
        </div>
        <div className="p-5 space-y-5">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
            {apolice.documento !== undefined && <Info k="CPF/CNPJ" v={apolice.documento} />}
            <Info k={apolice.cancelamento ? "Ramo" : "Produto"} v={apolice.produto} />
            <Info k="Seguradora" v={apolice.seguradora} />
            <Info k="Apólice" v={apolice.numero} />
            {apolice.termino && <Info k="Término da vigência" v={dataBR(apolice.termino)} />}
            {apolice.cancelamento && <Info k="Data do cancelamento" v={dataBR(apolice.cancelamento)} />}
            {apolice.cancelamento && (
              <Info k="Vigência" v={apolice.vigencia_inicio && apolice.vigencia_fim ? `${dataBR(apolice.vigencia_inicio)} a ${dataBR(apolice.vigencia_fim)}` : ""} />
            )}
            <Info k="Prêmio líquido" v={brl(apolice.premio)} />
          </dl>

          <form onSubmit={enviar} className="rounded-xl border border-gray-200 p-4 space-y-3">
            <h4 className="font-semibold text-navy">{apolice.status ? "Atualizar situação" : cfg.pergunta}</h4>
            <div className="grid sm:grid-cols-2 gap-2">
              {opcoes.map((o) => (
                <label key={o} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${status === o ? "border-navy bg-navy/5" : "border-gray-200 hover:border-gray-400"}`}>
                  <input type="radio" name="status" checked={status === o} onChange={() => setStatus(o)} className="mt-1 accent-[#072a3c]" />
                  {o}
                </label>
              ))}
            </div>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              rows={3}
              placeholder={status === "Outro motivo" ? "Descreva o motivo (obrigatório)" : cfg.dicaComentario}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            {erro && <p className="text-sm text-red-700">{erro}</p>}
            {ok && <p className="text-sm text-emerald-700">Resposta registrada. O gestor já pode ver no painel.</p>}
            <div className="flex justify-end">
              <button disabled={enviando} className="rounded-lg bg-navy text-white px-4 py-2 text-sm font-medium hover:bg-navy-2 disabled:opacity-60">
                {enviando ? "Salvando..." : "Salvar resposta"}
              </button>
            </div>
          </form>

          <div>
            <h4 className="font-semibold text-navy mb-2">Histórico</h4>
            {historico === null ? <p className="text-sm text-gray-400">Carregando...</p> : historico.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhuma resposta ainda.</p>
            ) : (
              <ol className="space-y-3">
                {historico.map((r) => (
                  <li key={r.id} className="border-l-2 border-gold pl-3">
                    <div className="text-sm font-medium text-gray-900">{r.status}</div>
                    {r.comentario && <p className="text-sm text-gray-700 whitespace-pre-wrap">{r.comentario}</p>}
                    <div className="text-xs text-gray-500 mt-0.5">{r.autor} · {dataHoraBR(r.criado_em)}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{k}</dt>
      <dd className="text-gray-900">{v || "—"}</dd>
    </div>
  );
}
