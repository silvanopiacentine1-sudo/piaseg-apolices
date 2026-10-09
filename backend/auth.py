"""Login com as mesmas credenciais do Portal do Franqueado (piaseg-admin.vercel.app/franqueado).

O portal guarda os usuários em `piaseg_usuarios` (servido por get_data.php) como
{nome, u, h}, onde h = sha256(senha) em hex. Validamos aqui exatamente da mesma forma,
então trocar a senha no portal vale automaticamente para este painel.
"""

import hashlib
import os
import time
from datetime import datetime, timedelta, timezone

import httpx
import jwt
from fastapi import Depends, Header, HTTPException

PORTAL_DATA_URL = os.environ.get("PORTAL_DATA_URL", "https://www.piaseg.com.br/get_data.php")
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-trocar")
TOKEN_DIAS = 30

_cache = {"em": 0.0, "usuarios": []}


def usuarios_portal(forcar: bool = False):
    """Lista de usuários do portal, com cache de 60s (e fallback para o último valor bom)."""
    if not forcar and time.time() - _cache["em"] < 60 and _cache["usuarios"]:
        return _cache["usuarios"]
    try:
        r = httpx.get(PORTAL_DATA_URL, timeout=15)
        r.raise_for_status()
        usuarios = r.json().get("piaseg_usuarios") or []
        if isinstance(usuarios, list) and usuarios:
            _cache.update(em=time.time(), usuarios=usuarios)
    except Exception:
        if not _cache["usuarios"]:
            raise HTTPException(503, "Não foi possível consultar os usuários do Portal do Franqueado. Tente novamente.")
    return _cache["usuarios"]


def verificar_senha(usuario: str, senha: str):
    usuario = usuario.strip().lower()
    h = hashlib.sha256(senha.encode("utf-8")).hexdigest()
    for u in usuarios_portal(forcar=True):
        if str(u.get("u", "")).strip().lower() == usuario and u.get("h") == h:
            return {"usuario": usuario, "nome": u.get("nome") or usuario}
    return None


def criar_token(usuario: str, nome: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=TOKEN_DIAS)
    return jwt.encode({"sub": usuario, "nome": nome, "exp": exp}, SECRET_KEY, algorithm="HS256")


def usuario_atual(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Faça login para continuar.")
    try:
        dados = jwt.decode(authorization[7:], SECRET_KEY, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Sessão expirada. Faça login novamente.")
    return {"usuario": dados["sub"], "nome": dados.get("nome", dados["sub"])}


UsuarioAtual = Depends(usuario_atual)
