import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NinjaClientPayload,
  NinjaEnvelope,
  NinjaInvoicePayload,
  NinjaListEnvelope,
} from './invoice-ninja.types';

const DEFAULT_RETRIES = 3;
const RETRY_BASE_MS = 400;

/** Invoice Ninja v5 status_id values (vendor: draft=1, sent=2, partial=3, paid=4, cancelled=5). */
export const NINJA_STATUS_DRAFT = 1;
export const NINJA_STATUS_SENT = 2;
export const NINJA_STATUS_PAID = 4;

type RequestOptions = {
  body?: unknown;
  json?: boolean;
  /** When true, never send X-Company-Id (e.g. list all Ninja companies). */
  skipCompanyHeader?: boolean;
  /**
   * Explicit X-Company-Id. If omitted and skipCompanyHeader is false, falls back to INVOICE_NINJA_COMPANY_ID.
   */
  ninjaCompanyHeader?: string;
};

@Injectable()
export class InvoiceNinjaService {
  private readonly logger = new Logger(InvoiceNinjaService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly maxRetries: number;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (this.config.get<string>('INVOICE_NINJA_BASE_URL') || '').replace(/\/$/, '');
    this.token = (this.config.get<string>('INVOICE_NINJA_API_TOKEN') || '').trim();
    this.maxRetries = Math.max(
      1,
      parseInt(this.config.get<string>('INVOICE_NINJA_MAX_RETRIES') || String(DEFAULT_RETRIES), 10) ||
        DEFAULT_RETRIES,
    );
  }

  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  private buildUrl(path: string): string {
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}/api/v1${p}`;
  }

  private resolveCompanyHeader(options: RequestOptions): string | undefined {
    if (options.skipCompanyHeader) return undefined;
    const explicit = options.ninjaCompanyHeader?.trim();
    if (explicit) return explicit;
    return this.config.get<string>('INVOICE_NINJA_COMPANY_ID')?.trim() || undefined;
  }

  private headers(json: boolean, companyHeader?: string): Record<string, string> {
    const h: Record<string, string> = {
      'X-Api-Token': this.token,
      'X-Requested-With': 'XMLHttpRequest',
    };
    if (json) h['Content-Type'] = 'application/json';
    if (companyHeader) h['X-Company-Id'] = companyHeader;
    return h;
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((r) => setTimeout(r, ms));
  }

  private shouldRetry(status: number): boolean {
    return status === 429 || (status >= 500 && status <= 599);
  }

  private async requestRaw(method: string, path: string, options: RequestOptions = {}): Promise<Response> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('Invoice Ninja is not configured');
    }
    const url = this.buildUrl(path);
    const json = options.json !== false;
    const companyHeader = this.resolveCompanyHeader(options);
    let lastErr: unknown;
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          method,
          headers: this.headers(json, companyHeader),
          body:
            options.body !== undefined && json
              ? JSON.stringify(options.body)
              : (options.body as BodyInit | undefined),
        });
        if (this.shouldRetry(res.status) && attempt < this.maxRetries) {
          await this.sleep(RETRY_BASE_MS * attempt);
          continue;
        }
        return res;
      } catch (e) {
        lastErr = e;
        this.logger.warn(
          `Invoice Ninja request failed (${method} ${path}) attempt ${attempt}/${this.maxRetries}: ${e}`,
        );
        if (attempt < this.maxRetries) await this.sleep(RETRY_BASE_MS * attempt);
      }
    }
    throw new BadGatewayException(
      lastErr instanceof Error ? lastErr.message : 'Invoice Ninja unreachable',
    );
  }

  private async parseJson<T>(res: Response): Promise<T> {
    const text = await res.text();
    if (!res.ok) {
      let detail = text;
      try {
        const j = JSON.parse(text) as { message?: string };
        if (j?.message) detail = j.message;
      } catch {
        /* keep text */
      }
      this.logger.error(`Invoice Ninja API error ${res.status}: ${detail}`);
      throw new BadGatewayException(`Invoice Ninja error (${res.status}): ${detail}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadGatewayException('Invoice Ninja returned invalid JSON');
    }
  }

  private static ninjaCompanyDisplayName(row: Record<string, unknown>): string {
    const settings = row.settings as Record<string, unknown> | undefined;
    if (settings && typeof settings.name === 'string' && settings.name.trim()) return settings.name.trim();
    if (typeof row.name === 'string' && row.name.trim()) return row.name.trim();
    return 'Entreprise';
  }

  /**
   * Liste les entreprises (legal entities) du compte Invoice Ninja, pour sélection dans FinOps.
   * Sans X-Company-Id pour voir toutes les sociétés liées au token.
   */
  async listNinjaCompanies(
    page = 1,
    perPage = 100,
  ): Promise<{ id: string; name: string; subdomain?: string }[]> {
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    const res = await this.requestRaw('GET', `/companies?${qs.toString()}`, {
      json: false,
      skipCompanyHeader: true,
    });
    const body = await this.parseJson<NinjaListEnvelope<Record<string, unknown>>>(res);
    const rows = body.data ?? [];
    return rows.map((c) => ({
      id: String(c.id),
      name: InvoiceNinjaService.ninjaCompanyDisplayName(c),
      subdomain: typeof c.subdomain === 'string' ? c.subdomain : undefined,
    }));
  }

  async createClient(
    payload: NinjaClientPayload,
    ninjaCompanyHeader?: string,
  ): Promise<{ id: string }> {
    const res = await this.requestRaw('POST', '/clients', {
      body: payload,
      ninjaCompanyHeader,
    });
    const body = await this.parseJson<NinjaEnvelope<{ id: string }>>(res);
    const id = body.data?.id;
    if (!id) throw new BadGatewayException('Invoice Ninja client create: missing id');
    return { id };
  }

  async createInvoice(
    payload: NinjaInvoicePayload,
    ninjaCompanyHeader?: string,
  ): Promise<{ id: string }> {
    const res = await this.requestRaw('POST', '/invoices', {
      body: payload,
      ninjaCompanyHeader,
    });
    const body = await this.parseJson<NinjaEnvelope<{ id: string }>>(res);
    const id = body.data?.id;
    if (!id) throw new BadGatewayException('Invoice Ninja invoice create: missing id');
    return { id };
  }

  async listInvoices(page = 1, perPage = 100, ninjaCompanyHeader?: string): Promise<unknown[]> {
    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    const res = await this.requestRaw('GET', `/invoices?${qs.toString()}`, {
      json: false,
      ninjaCompanyHeader,
    });
    const body = await this.parseJson<NinjaListEnvelope<Record<string, unknown>>>(res);
    return body.data ?? [];
  }

  async getInvoice(ninjaInvoiceId: string, ninjaCompanyHeader?: string): Promise<unknown> {
    const res = await this.requestRaw('GET', `/invoices/${encodeURIComponent(ninjaInvoiceId)}`, {
      json: false,
      ninjaCompanyHeader,
    });
    const body = await this.parseJson<NinjaEnvelope<Record<string, unknown>>>(res);
    return body.data ?? null;
  }

  async updateInvoiceStatus(
    ninjaInvoiceId: string,
    statusId: number,
    ninjaCompanyHeader?: string,
  ): Promise<void> {
    const res = await this.requestRaw('PUT', `/invoices/${encodeURIComponent(ninjaInvoiceId)}`, {
      body: { status_id: statusId },
      ninjaCompanyHeader,
    });
    await this.parseJson<unknown>(res);
  }

  async downloadInvoicePdf(ninjaInvoiceId: string, ninjaCompanyHeader?: string): Promise<Buffer> {
    const res = await this.requestRaw(
      'GET',
      `/invoices/${encodeURIComponent(ninjaInvoiceId)}/download`,
      { json: false, ninjaCompanyHeader },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      this.logger.error(`Invoice Ninja PDF error ${res.status}: ${text}`);
      throw new BadGatewayException(`Invoice Ninja PDF failed (${res.status})`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
