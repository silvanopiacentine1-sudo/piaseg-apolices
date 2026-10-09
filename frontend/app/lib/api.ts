export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8791";

const TOKEN_KEY = "piaseg_apolices_token";
const PERFIL_KEY = "piaseg_apolices_perfil";

export type Perfil = {
  usuario: string;
  nome: string;
  admin: boolean;
  franqueados: string[];
};

export type Apolice = {
  id: number;
  franqueado: string;
  unidade: string;
  cliente: string;
  documento?: string; // só nas não renovadas
  seguradora: string;
  termino?: string; // não renovadas: término da vigência
  cancelamento?: string; // canceladas: data do cancelamento
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  numero: string;
  produto: string;
  premio: number;
  status: string | null;
  respondido_em: string | null;
  no_ultimo_relatorio: boolean;
};

export type Resposta = {
  id: number;
  status: string;
  comentario: string;
  autor: string;
  criado_em: string;
};

export type MesResumo = { mes: number; qtd: number; premio: number; respondidas: number };

export type Resumo = {
  total: number;
  premio: number;
  respondidas: number;
  pendentes: number;
  meses: MesResumo[];
  por_status: { status: string; qtd: number }[];
  franqueados: { franqueado: string; qtd: number; premio: number; respondidas: number; meses: Record<string, number> }[];
};

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getPerfil(): Perfil | null {
  try {
    const p = localStorage.getItem(PERFIL_KEY);
    return p ? JSON.parse(p) : null;
  } catch {
    return null;
  }
}

export function salvarSessao(token: string, perfil: Perfil) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(PERFIL_KEY, JSON.stringify(perfil));
}

export function sair(expirada = false) {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(PERFIL_KEY);
  window.location.href = expirada ? "/?expirada=1" : "/";
}

async function fetchComRetry(url: string, init: RequestInit): Promise<Response> {
  // o Render pode demorar alguns segundos para responder após um deploy
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await fetch(url, init);
    } catch (e) {
      if (tentativa >= 3) throw new Error("Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.");
      await new Promise((r) => setTimeout(r, 2000 * (tentativa + 1)));
    }
  }
}

export async function api<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body && !(init.body instanceof FormData)) headers["Content-Type"] = "application/json";
  const r = await fetchComRetry(API_URL + caminho, { ...init, headers });
  if (r.status === 401 && token) {
    sair(true);
    throw new Error("Sessão expirada.");
  }
  if (!r.ok) {
    let msg = `Erro ${r.status}`;
    try {
      const j = await r.json();
      if (j.detail) msg = typeof j.detail === "string" ? j.detail : msg;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export async function baixar(caminho: string, nomeArquivo: string) {
  const r = await fetchComRetry(API_URL + caminho, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (r.status === 401) return sair(true);
  if (!r.ok) throw new Error("Não foi possível gerar o arquivo.");
  const url = URL.createObjectURL(await r.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeArquivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
