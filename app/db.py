"""Inicialização da base de dados."""
from __future__ import annotations

from sqlmodel import Session, SQLModel, create_engine

from .config import settings

# check_same_thread=False para o loop de polling e o webhook partilharem o engine.
engine = create_engine(
    settings.db_url,
    echo=False,
    connect_args={"check_same_thread": False} if settings.db_url.startswith("sqlite") else {},
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    return Session(engine)
