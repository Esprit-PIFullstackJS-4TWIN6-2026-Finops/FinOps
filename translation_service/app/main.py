from fastapi import FastAPI, HTTPException

from .schemas import (
    BatchTranslateRequest,
    BatchTranslateResponse,
    TranslateRequest,
    TranslateResponse,
)
from .translator import MODEL_NAME, get_translator

app = FastAPI(
    title="NLLB Translation API",
    version="1.0.0",
    description="REST API for multilingual translation using facebook/nllb-200-distilled-600M",
)


@app.on_event("startup")
def warmup_model() -> None:
    # Loads model at startup so first request is fast and no per-request reload happens.
    get_translator()


@app.get("/health")
def health() -> dict:
    translator = get_translator()
    return {
        "status": "ok",
        "model": translator.model_name,
        "device": str(translator.device),
    }


@app.get("/languages")
def list_languages() -> dict:
    translator = get_translator()
    return {"languages": translator.list_supported_langs()}


@app.post("/translate", response_model=TranslateResponse)
def translate(payload: TranslateRequest) -> TranslateResponse:
    translator = get_translator()
    try:
        translated = translator.translate(
            text=payload.text,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
        )
        return TranslateResponse(
            translated_text=translated,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
            model_name=MODEL_NAME,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unexpected translation error. Check server logs.",
        ) from exc


@app.post("/translate/batch", response_model=BatchTranslateResponse)
def translate_batch(payload: BatchTranslateRequest) -> BatchTranslateResponse:
    translator = get_translator()
    try:
        translated = translator.translate_many(
            texts=payload.texts,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
        )
        return BatchTranslateResponse(
            translations=translated,
            source_lang=payload.source_lang,
            target_lang=payload.target_lang,
            model_name=MODEL_NAME,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Unexpected translation error. Check server logs.",
        ) from exc

