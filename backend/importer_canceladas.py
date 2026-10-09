"""Leitura do relatório "RptDocsEmitidos" de apólices canceladas exportado do Quiver (.xls ou .xlsx)."""

import re

from importer import _data, _linhas_planilha, _numero, _texto, normalizar, unidade_excluida

COLUNAS = {
    "UNIDADE DE NEGOCIO": "unidade",
    "CLIENTE": "cliente",
    "APOLICE": "numero",
    "SEGURADORA": "seguradora",
    "DATA CANCELAMENTO": "cancelamento",
    "VIGENCIA DO SEGURO": "vigencia",
    "PREMIO LIQUIDO": "premio",
    "CELULA": "produto",
}


def nome_curto(unidade: str) -> str:
    """'TERRA - PIASEG CONSULTORIA' -> 'TERRA'; 'SONIMAR MACHADO - FRANQUEADO - PIASEG CONSULTORI' -> 'SONIMAR MACHADO'."""
    curto = re.sub(r"\s*-\s*PIASEG\b.*$", "", unidade.strip())
    curto = re.sub(r"\s*-\s*FRANQUEADO\s*$", "", curto, flags=re.I)
    return curto or unidade.strip()


def _vigencia(valor):
    """'22/01/2026 a 22/01/2027' -> (date, date)."""
    datas = re.findall(r"\d{2}/\d{2}/\d{4}", str(valor or ""))
    inicio = _data(datas[0]) if datas else None
    fim = _data(datas[1]) if len(datas) > 1 else None
    return inicio, fim


def ler_relatorio(conteudo: bytes):
    """Retorna (registros, ignoradas). Cada registro é um dict com os campos do modelo Apolice."""
    linhas, datemode = _linhas_planilha(conteudo)
    cabecalho_idx, mapa = None, {}
    for i, linha in enumerate(linhas[:30]):
        nomes = [normalizar(c) for c in linha]
        if "UNIDADE DE NEGOCIO" in nomes and "CLIENTE" in nomes:
            cabecalho_idx = i
            mapa = {idx: COLUNAS[n] for idx, n in enumerate(nomes) if n in COLUNAS}
            break
    if cabecalho_idx is None:
        raise ValueError("Cabeçalho não encontrado: a planilha precisa ter as colunas 'UNIDADE DE NEGÓCIO' e 'CLIENTE'.")
    faltando = set(COLUNAS.values()) - set(mapa.values())
    if faltando:
        raise ValueError("Colunas ausentes na planilha: " + ", ".join(sorted(faltando)))

    registros, ignoradas, vistas = [], 0, set()
    for linha in linhas[cabecalho_idx + 1:]:
        bruto = {campo: linha[idx] if idx < len(linha) else None for idx, campo in mapa.items()}
        unidade = _texto(bruto["unidade"])
        if not unidade or not _texto(bruto["cliente"]):
            continue
        cancelamento = _data(bruto["cancelamento"], datemode)
        if unidade_excluida(unidade) or cancelamento is None:
            ignoradas += 1
            continue
        inicio, fim = _vigencia(bruto["vigencia"])
        reg = {
            "unidade": unidade,
            "franqueado": normalizar(nome_curto(unidade)),
            "cliente": _texto(bruto["cliente"]),
            "seguradora": _texto(bruto["seguradora"]),
            "numero": _texto(bruto["numero"]),
            "produto": _texto(bruto["produto"]),
            "cancelamento": cancelamento,
            "vigencia_inicio": inicio,
            "vigencia_fim": fim,
            "premio": round(_numero(bruto["premio"]), 2),
        }
        # a mesma apólice aparece mais de uma vez quando há endosso (vigência de início diferente)
        chave = "|".join([normalizar(reg["seguradora"]), reg["numero"], cancelamento.isoformat(),
                          inicio.isoformat() if inicio else "", fim.isoformat() if fim else ""])
        n = 2
        base = chave
        while chave in vistas:
            chave = f"{base}#{n}"
            n += 1
        vistas.add(chave)
        reg["chave"] = chave
        registros.append(reg)
    return registros, ignoradas
