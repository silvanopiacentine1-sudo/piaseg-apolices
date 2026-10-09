"""Leitura do relatório "RptApolicesNaoRenovadas" exportado do Quiver (.xls ou .xlsx)."""

import io
import re
import unicodedata
from datetime import date, datetime

import openpyxl
import xlrd

COLUNAS = {
    "UNIDADE DE NEGOCIO": "unidade",
    "CLIENTE": "cliente",
    "CPF/CNPJ": "documento",
    "CORRETORA": "corretora",
    "SEGURADORA": "seguradora",
    "TERMINO DE VIGENCIA": "termino",
    "APOLICE": "numero",
    "PRODUTO": "produto",
    "PREMIO LIQUIDO": "premio",
}

# Unidades da própria Piaseg, fora do escopo dos franqueados (pedido do Silvano em 2026-10-08)
UNIDADES_EXCLUIDAS = {
    "CAMPO GRANDE - PIASEG",
    "DOURADOS - PIASEG",
    "PIASEG CONSULTORIA",
    "STUDIO AGRONEGOCIOS",
}


def normalizar(texto) -> str:
    texto = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", texto).strip().upper()


def nome_curto(unidade: str) -> str:
    """'TERRA - PIASEG CONSULTORIA' -> 'TERRA' (o sufixo às vezes vem truncado, ex: 'PIASEG CONSULT')."""
    return re.sub(r"\s*-\s*PIASEG\b.*$", "", unidade.strip()) or unidade.strip()


def unidade_excluida(unidade: str) -> bool:
    n = normalizar(unidade)
    return n in UNIDADES_EXCLUIDAS or normalizar(nome_curto(unidade)) in UNIDADES_EXCLUIDAS


def _data(valor, datemode=0):
    if isinstance(valor, datetime):
        return valor.date()
    if isinstance(valor, date):
        return valor
    if isinstance(valor, (int, float)) and valor:
        return xlrd.xldate_as_datetime(valor, datemode).date()
    texto = str(valor or "").strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d/%m/%y"):
        try:
            return datetime.strptime(texto[:10], fmt).date()
        except ValueError:
            pass
    return None


def _numero(valor) -> float:
    if isinstance(valor, (int, float)):
        return float(valor)
    texto = str(valor or "").strip().replace("R$", "").replace(" ", "")
    if "," in texto:
        texto = texto.replace(".", "").replace(",", ".")
    try:
        return float(texto)
    except ValueError:
        return 0.0


def _texto(valor) -> str:
    if isinstance(valor, float) and valor.is_integer():
        valor = int(valor)
    return str(valor if valor is not None else "").strip()


def _linhas_planilha(conteudo: bytes):
    """Devolve (linhas, datemode). Aceita .xls (BIFF) e .xlsx."""
    if conteudo[:4] == b"PK\x03\x04":
        wb = openpyxl.load_workbook(io.BytesIO(conteudo), read_only=True, data_only=True)
        ws = wb.worksheets[0]
        return [list(r) for r in ws.iter_rows(values_only=True)], 0
    book = xlrd.open_workbook(file_contents=conteudo)
    sheet = book.sheet_by_index(0)
    return [sheet.row_values(i) for i in range(sheet.nrows)], book.datemode


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

    registros, ignoradas = [], 0
    for linha in linhas[cabecalho_idx + 1:]:
        bruto = {campo: linha[idx] if idx < len(linha) else None for idx, campo in mapa.items()}
        unidade = _texto(bruto["unidade"])
        if not unidade or not _texto(bruto["cliente"]):
            continue
        termino = _data(bruto["termino"], datemode)
        if unidade_excluida(unidade) or termino is None:
            ignoradas += 1
            continue
        reg = {
            "unidade": unidade,
            "franqueado": normalizar(nome_curto(unidade)),
            "cliente": _texto(bruto["cliente"]),
            "documento": _texto(bruto["documento"]),
            "corretora": _texto(bruto["corretora"]),
            "seguradora": _texto(bruto["seguradora"]),
            "termino": termino,
            "numero": _texto(bruto["numero"]),
            "produto": _texto(bruto["produto"]),
            "premio": round(_numero(bruto["premio"]), 2),
        }
        reg["chave"] = "|".join([normalizar(reg["seguradora"]), reg["numero"], termino.isoformat(), normalizar(reg["documento"])])
        registros.append(reg)
    return registros, ignoradas
