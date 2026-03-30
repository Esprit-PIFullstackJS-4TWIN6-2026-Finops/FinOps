# NLLB Translation Service (FastAPI)

Service de traduction multilingue basé sur `facebook/nllb-200-distilled-600M`.

## Arborescence

```text
translation_service/
├─ app/
│  ├─ __init__.py
│  ├─ main.py
│  ├─ schemas.py
│  └─ translator.py
├─ requirements.txt
└─ README.md
```

## 1) Installation

Depuis la racine du projet:

```bash
cd translation_service
python -m venv .venv
```

### Windows (PowerShell)

```powershell
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Linux/macOS

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## 2) Lancer le serveur

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Le modèle est chargé une seule fois au démarrage (startup FastAPI + singleton cache).

## 3) Endpoint principal

`POST /translate`

Body JSON:

```json
{
  "text": "Bonjour tout le monde",
  "source_lang": "fra_Latn",
  "target_lang": "eng_Latn"
}
```

Réponse:

```json
{
  "translated_text": "Hello everyone",
  "source_lang": "fra_Latn",
  "target_lang": "eng_Latn",
  "model_name": "facebook/nllb-200-distilled-600M"
}
```

## 4) Vérification rapide

### Health

```bash
curl http://localhost:8000/health
```

### Liste des langues supportées

```bash
curl http://localhost:8000/languages
```

### Test traduction

```bash
curl -X POST http://localhost:8000/translate \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Bonjour tout le monde\",\"source_lang\":\"fra_Latn\",\"target_lang\":\"eng_Latn\"}"
```

## Notes

- Formats langues NLLB gérés: `eng_Latn`, `fra_Latn`, `arb_Arab`, etc.
- Validation d'entrée incluse (texte vide, format code langue, code non supporté).
- En cas d'erreur de validation: HTTP 400.
- En cas d'erreur inattendue: HTTP 500.

