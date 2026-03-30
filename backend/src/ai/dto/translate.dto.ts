import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class TranslateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  text!: string;

  @IsString()
  @Matches(/^[a-z]{3}_[A-Za-z]{4}$/, {
    message: 'source_lang must use NLLB code format like fra_Latn.',
  })
  source_lang!: string;

  @IsString()
  @Matches(/^[a-z]{3}_[A-Za-z]{4}$/, {
    message: 'target_lang must use NLLB code format like eng_Latn.',
  })
  target_lang!: string;
}

export interface TranslateResult {
  translated_text: string;
  source_lang: string;
  target_lang: string;
  model_name: string;
}

export class BatchTranslateDto {
  @ArrayNotEmpty()
  @ArrayMaxSize(400)
  @IsString({ each: true })
  @MaxLength(5000, { each: true })
  texts!: string[];

  @IsString()
  @Matches(/^[a-z]{3}_[A-Za-z]{4}$/, {
    message: 'source_lang must use NLLB code format like fra_Latn.',
  })
  source_lang!: string;

  @IsString()
  @Matches(/^[a-z]{3}_[A-Za-z]{4}$/, {
    message: 'target_lang must use NLLB code format like eng_Latn.',
  })
  target_lang!: string;
}

export interface BatchTranslateResult {
  translations: string[];
  source_lang: string;
  target_lang: string;
  model_name: string;
}

