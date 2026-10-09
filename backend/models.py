from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Float, ForeignKey, Integer, String, Text

from database import Base


class Apolice(Base):
    __tablename__ = "apolices"

    id = Column(Integer, primary_key=True)
    # chave natural: seguradora + apólice + término (a mesma apólice pode aparecer em anos diferentes)
    chave = Column(String(255), unique=True, nullable=False, index=True)
    unidade = Column(String(255), nullable=False)  # texto original da coluna UNIDADE DE NEGÓCIO
    franqueado = Column(String(255), nullable=False, index=True)  # unidade sem o sufixo " - PIASEG CONSULTORIA"
    cliente = Column(String(255), nullable=False)
    documento = Column(String(40), default="")
    corretora = Column(String(255), default="")
    seguradora = Column(String(120), default="")
    termino = Column(Date, nullable=False, index=True)
    numero = Column(String(80), default="")
    produto = Column(String(160), default="")
    premio = Column(Float, default=0.0)
    # False quando a apólice não veio na última planilha importada (pode ter sido renovada/baixada)
    no_ultimo_relatorio = Column(Boolean, default=True)
    importado_em = Column(DateTime, default=datetime.utcnow)
    status = Column(String(80), nullable=True)  # status da resposta mais recente
    respondido_em = Column(DateTime, nullable=True)


class Resposta(Base):
    __tablename__ = "respostas"

    id = Column(Integer, primary_key=True)
    apolice_id = Column(Integer, ForeignKey("apolices.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(String(80), nullable=False)
    comentario = Column(Text, default="")
    autor_usuario = Column(String(255), nullable=False)
    autor_nome = Column(String(255), default="")
    criado_em = Column(DateTime, default=datetime.utcnow)


class Vinculo(Base):
    """Liga um login do Portal do Franqueado (piaseg_usuarios) a uma unidade de negócio."""

    __tablename__ = "vinculos"

    id = Column(Integer, primary_key=True)
    usuario = Column(String(255), nullable=False, index=True)
    franqueado = Column(String(255), nullable=False)  # mesmo valor de Apolice.franqueado


class Admin(Base):
    __tablename__ = "admins"

    usuario = Column(String(255), primary_key=True)


class Importacao(Base):
    __tablename__ = "importacoes"

    id = Column(Integer, primary_key=True)
    arquivo = Column(String(255), default="")
    criado_em = Column(DateTime, default=datetime.utcnow)
    autor = Column(String(255), default="")
    linhas = Column(Integer, default=0)
    novas = Column(Integer, default=0)
    atualizadas = Column(Integer, default=0)
    ignoradas = Column(Integer, default=0)


# ---------------------------------------------------------------- apólices canceladas
# Mesma ideia das tabelas acima, alimentadas pelo relatório de cancelamentos (RptDocsEmitidos) do Quiver.
# Vínculos e gestores são compartilhados entre os dois painéis.


class CancApolice(Base):
    __tablename__ = "canc_apolices"

    id = Column(Integer, primary_key=True)
    # chave natural: seguradora + apólice + data de cancelamento + vigência (endossos geram linhas repetidas)
    chave = Column(String(255), unique=True, nullable=False, index=True)
    unidade = Column(String(255), nullable=False)
    franqueado = Column(String(255), nullable=False, index=True)
    cliente = Column(String(255), nullable=False)
    seguradora = Column(String(120), default="")
    cancelamento = Column(Date, nullable=False, index=True)
    vigencia_inicio = Column(Date, nullable=True)
    vigencia_fim = Column(Date, nullable=True)
    numero = Column(String(80), default="")
    produto = Column(String(160), default="")  # coluna CÉLULA do Quiver (Automóvel, Patrimonial...)
    premio = Column(Float, default=0.0)
    # False quando a apólice não veio na última planilha importada (cancelamento pode ter sido estornado)
    no_ultimo_relatorio = Column(Boolean, default=True)
    importado_em = Column(DateTime, default=datetime.utcnow)
    status = Column(String(80), nullable=True)
    respondido_em = Column(DateTime, nullable=True)


class CancResposta(Base):
    __tablename__ = "canc_respostas"

    id = Column(Integer, primary_key=True)
    apolice_id = Column(Integer, ForeignKey("canc_apolices.id", ondelete="CASCADE"), index=True, nullable=False)
    status = Column(String(80), nullable=False)
    comentario = Column(Text, default="")
    autor_usuario = Column(String(255), nullable=False)
    autor_nome = Column(String(255), default="")
    criado_em = Column(DateTime, default=datetime.utcnow)


class CancImportacao(Base):
    __tablename__ = "canc_importacoes"

    id = Column(Integer, primary_key=True)
    arquivo = Column(String(255), default="")
    criado_em = Column(DateTime, default=datetime.utcnow)
    autor = Column(String(255), default="")
    linhas = Column(Integer, default=0)
    novas = Column(Integer, default=0)
    atualizadas = Column(Integer, default=0)
    ignoradas = Column(Integer, default=0)
