export const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moedaCurta = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });

export const brl = (v: number) => moeda.format(v || 0);
export const brlCurto = (v: number) => moedaCurta.format(v || 0);

export function dataBR(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function dataHoraBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function titulo(nome: string) {
  // "ALENCAR VEICULOS" -> "Alencar Veiculos"; mantém siglas curtas como "& " e "/"
  return nome.toLowerCase().replace(/(^|[\s/&-])(\p{L})/gu, (_, sep, l) => sep + l.toUpperCase());
}
