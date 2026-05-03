import { ForbiddenException } from '@nestjs/common';
import { requireActiveCompanyId } from './active-company.util';

describe('requireActiveCompanyId', () => {
  it('returns activeCompanyId when available', () => {
    expect(
      requireActiveCompanyId({ activeCompanyId: 'active-company', companyId: 'fallback' } as any),
    ).toBe('active-company');
  });

  it('falls back to companyId when no active company exists', () => {
    expect(requireActiveCompanyId({ companyId: 'fallback-company' } as any)).toBe(
      'fallback-company',
    );
  });

  it('throws when no company context is available', () => {
    expect(() => requireActiveCompanyId({} as any)).toThrow(ForbiddenException);
  });
});
