"""Quem pode ver o quê — compartilhado pelos painéis de não renovadas e canceladas."""

from typing import List

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session

import models
from auth import UsuarioAtual
from database import get_db


def eh_admin(db: Session, usuario: str) -> bool:
    return db.get(models.Admin, usuario) is not None


def franqueados_do_usuario(db: Session, usuario: str) -> List[str]:
    return sorted({v.franqueado for v in db.query(models.Vinculo).filter(models.Vinculo.usuario == usuario)})


def exigir_admin(user: dict = UsuarioAtual, db: Session = Depends(get_db)):
    if not eh_admin(db, user["usuario"]):
        raise HTTPException(403, "Acesso restrito ao gestor.")
    return user
