/** Minimal Invoice Ninja v5 API shapes we consume. */

export type NinjaClientContact = {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
};

export type NinjaClientPayload = {
  name: string;
  contacts?: NinjaClientContact[];
};

export type NinjaLineItem = {
  product_key: string;
  notes?: string;
  quantity: number;
  cost: number | string;
};

export type NinjaInvoicePayload = {
  client_id: string;
  line_items: NinjaLineItem[];
  due_date?: string;
  status_id?: string | number;
  public_notes?: string;
};

export type NinjaEnvelope<T> = {
  data?: T;
  message?: string;
};

export type NinjaListEnvelope<T> = {
  data?: T[];
  meta?: { pagination?: { total?: number; current_page?: number } };
};
