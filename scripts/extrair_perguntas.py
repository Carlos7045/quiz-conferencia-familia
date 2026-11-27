"""Extrai as perguntas do PDF da gincana para src/data/perguntas.json.

Uso:  python scripts/extrair_perguntas.py "LISTA DE PERGUNTAS GINCANA PENIEL.pdf"
Requer: pip install pymupdf
"""
import json
import re
import sys
from pathlib import Path

import pymupdf

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "src" / "data" / "perguntas.json"

RE_PERGUNTA = re.compile(r"^(\d+)\.\s+(.*)")
RE_OPCAO = re.compile(r"^[●•\-\u200b\s]*([A-D])\)\s*(.*)")
RE_RESPOSTA = re.compile(r"^Resposta Correta:\s*([A-D])\b", re.I)
RE_REFERENCIA = re.compile(r"^Refer[êe]ncia b[íi]blica:\s*(.*)", re.I)


def limpar(texto: str) -> str:
    texto = texto.replace("\u200b", " ").replace("\xa0", " ")
    return re.sub(r"\s+", " ", texto).strip()


def extrair(caminho_pdf: str) -> list[dict]:
    doc = pymupdf.open(caminho_pdf)
    linhas = [limpar(l) for p in doc for l in p.get_text().splitlines()]
    linhas = [l for l in linhas if l]

    perguntas: list[dict] = []
    atual: dict | None = None
    campo = None  # onde a linha de continuação deve ser anexada

    for linha in linhas:
        if m := RE_PERGUNTA.match(linha):
            atual = {"id": int(m[1]), "pergunta": m[2], "opcoes": [], "correta": None, "referencia": ""}
            perguntas.append(atual)
            campo = "pergunta"
        elif atual is None:
            continue  # cabeçalho do documento
        elif m := RE_OPCAO.match(linha):
            atual["opcoes"].append(m[2])
            campo = "opcao"
        elif m := RE_RESPOSTA.match(linha):
            atual["correta"] = "ABCD".index(m[1].upper())
            campo = "resposta"  # o texto entre parênteses é ignorado
        elif m := RE_REFERENCIA.match(linha):
            atual["referencia"] = m[1]
            campo = "referencia"
        elif campo == "pergunta":
            atual["pergunta"] += " " + linha
        elif campo == "opcao":
            atual["opcoes"][-1] += " " + linha
        elif campo == "referencia":
            atual["referencia"] += " " + linha

    # Corrige opções grudadas na mesma linha (ex.: "... imperiais *D) O toque ...")
    for p in perguntas:
        separadas = []
        for opcao in p["opcoes"]:
            separadas.extend(s.strip() for s in re.split(r"\s+\*?[B-D]\)\s+", opcao))
        p["opcoes"] = separadas

    return perguntas


def validar(perguntas: list[dict]) -> list[str]:
    problemas = []
    for i, p in enumerate(perguntas, 1):
        if p["id"] != i:
            problemas.append(f"Numeração fora de ordem: esperado {i}, veio {p['id']}")
        if len(p["opcoes"]) != 4:
            problemas.append(f"Pergunta {p['id']}: {len(p['opcoes'])} opções")
        if p["correta"] is None:
            problemas.append(f"Pergunta {p['id']}: sem resposta correta")
        if not p["referencia"]:
            problemas.append(f"Pergunta {p['id']}: sem referência")
    return problemas


if __name__ == "__main__":
    pdf = sys.argv[1] if len(sys.argv) > 1 else str(RAIZ / "LISTA DE PERGUNTAS GINCANA PENIEL.pdf")
    perguntas = extrair(pdf)
    problemas = validar(perguntas)
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(perguntas, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(perguntas)} perguntas salvas em {SAIDA}")
    for prob in problemas:
        print("ATENÇÃO:", prob)
    sys.exit(1 if problemas else 0)
