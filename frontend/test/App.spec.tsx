import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../api-backend', async () => {
  const actual = await vi.importActual<typeof import('../api-backend')>('../api-backend');

  return {
    ...actual,
    checkBackendHealth: vi.fn().mockResolvedValue(true),
    BackendAPI: {
      ...actual.BackendAPI,
      getMe: vi.fn().mockResolvedValue(null),
      getTranslationLanguages: vi.fn().mockResolvedValue({ languages: [] }),
      translateBatch: vi.fn().mockResolvedValue({ translations: [] }),
      updateMyPreferences: vi.fn().mockResolvedValue(undefined),
    },
  };
});

import App from '../App';

describe('App landing page', () => {
  it('renders the public landing page with the main entry actions', async () => {
    render(<App />);

    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getAllByText(/finops/i).length).toBeGreaterThan(0);
  });
});
