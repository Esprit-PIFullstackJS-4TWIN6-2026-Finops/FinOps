from functools import lru_cache
from threading import Lock

import torch
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

MODEL_NAME = "facebook/nllb-200-distilled-600M"


class NLLBTranslator:
    def __init__(self, model_name: str = MODEL_NAME) -> None:
        self.model_name = model_name
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=False)
        self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
        self.model.eval()
        self.supported_langs = set(self.tokenizer.lang_code_to_id.keys())
        self._lock = Lock()

    def list_supported_langs(self) -> list[str]:
        return sorted(self.supported_langs)

    def _validate_lang(self, lang_code: str) -> None:
        if lang_code not in self.supported_langs:
            raise ValueError(
                f"Unsupported language code '{lang_code}'. "
                "Use NLLB format like 'fra_Latn', 'eng_Latn', 'arb_Arab'."
            )

    def translate(self, text: str, source_lang: str, target_lang: str) -> str:
        self._validate_lang(source_lang)
        self._validate_lang(target_lang)
        if source_lang == target_lang:
            return text

        with self._lock:
            self.tokenizer.src_lang = source_lang
            encoded = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=512,
            ).to(self.device)
            with torch.no_grad():
                generated = self.model.generate(
                    **encoded,
                    forced_bos_token_id=self.tokenizer.lang_code_to_id[target_lang],
                    max_new_tokens=256,
                )
            return self.tokenizer.batch_decode(generated, skip_special_tokens=True)[0]

    def translate_many(self, texts: list[str], source_lang: str, target_lang: str) -> list[str]:
        self._validate_lang(source_lang)
        self._validate_lang(target_lang)
        if source_lang == target_lang:
            return texts

        with self._lock:
            self.tokenizer.src_lang = source_lang
            encoded = self.tokenizer(
                texts,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True,
            ).to(self.device)
            with torch.no_grad():
                generated = self.model.generate(
                    **encoded,
                    forced_bos_token_id=self.tokenizer.lang_code_to_id[target_lang],
                    max_new_tokens=256,
                )
            return self.tokenizer.batch_decode(generated, skip_special_tokens=True)


@lru_cache(maxsize=1)
def get_translator() -> NLLBTranslator:
    # Singleton instance: model is loaded once and reused for all requests.
    return NLLBTranslator()

