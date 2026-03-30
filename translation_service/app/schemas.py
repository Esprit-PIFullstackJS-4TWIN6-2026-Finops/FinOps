from pydantic import BaseModel, Field, field_validator


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    source_lang: str = Field(..., min_length=8, max_length=8)
    target_lang: str = Field(..., min_length=8, max_length=8)

    @field_validator("text")
    @classmethod
    def validate_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("text must not be empty.")
        return stripped

    @field_validator("source_lang", "target_lang")
    @classmethod
    def validate_lang_code_format(cls, value: str) -> str:
        normalized = value.strip()
        parts = normalized.split("_")
        if len(parts) != 2 or len(parts[0]) != 3 or len(parts[1]) != 4:
            raise ValueError("Language code must use NLLB format like 'fra_Latn' or 'eng_Latn'.")
        return normalized


class TranslateResponse(BaseModel):
    translated_text: str
    source_lang: str
    target_lang: str
    model_name: str


class BatchTranslateRequest(BaseModel):
    texts: list[str] = Field(..., min_length=1, max_length=400)
    source_lang: str = Field(..., min_length=8, max_length=8)
    target_lang: str = Field(..., min_length=8, max_length=8)

    @field_validator("texts")
    @classmethod
    def validate_texts(cls, values: list[str]) -> list[str]:
        normalized: list[str] = []
        for value in values:
            stripped = value.strip()
            if not stripped:
                raise ValueError("texts must not contain empty items.")
            normalized.append(stripped)
        return normalized

    @field_validator("source_lang", "target_lang")
    @classmethod
    def validate_lang_code_format_batch(cls, value: str) -> str:
        normalized = value.strip()
        parts = normalized.split("_")
        if len(parts) != 2 or len(parts[0]) != 3 or len(parts[1]) != 4:
            raise ValueError("Language code must use NLLB format like 'fra_Latn' or 'eng_Latn'.")
        return normalized


class BatchTranslateResponse(BaseModel):
    translations: list[str]
    source_lang: str
    target_lang: str
    model_name: str

