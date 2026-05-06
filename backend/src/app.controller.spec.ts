import { AppController } from './app.controller';

describe('AppController', () => {
  const originalGmailUser = process.env.GMAIL_USER;
  const mailService = {
    sendEmail: jest.fn(),
  };

  let controller: AppController;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GMAIL_USER;
    controller = new AppController(mailService as any);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalGmailUser === undefined) {
      delete process.env.GMAIL_USER;
    } else {
      process.env.GMAIL_USER = originalGmailUser;
    }
  });

  it('returns API metadata from root', () => {
    const result = controller.root();

    expect(result).toEqual(
      expect.objectContaining({
        name: 'FinOps SaaS Platform API',
        status: 'running',
        version: '1.0.0',
        endpoints: expect.objectContaining({
          health: 'GET /health',
          testEmail: 'POST /test-email',
        }),
      }),
    );
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('returns a health payload', () => {
    const result = controller.health();

    expect(result.status).toBe('ok');
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('returns a clear message when no recipient is available', async () => {
    const result = await controller.testEmail({});

    expect(result).toEqual({
      success: false,
      sent: false,
      message:
        'No recipient: provide { "to": "email@example.com" } in the body or set GMAIL_USER in backend/.env',
    });
    expect(mailService.sendEmail).not.toHaveBeenCalled();
  });

  it('sends a test email with defaults when a recipient is provided', async () => {
    mailService.sendEmail.mockResolvedValue({
      sent: true,
      provider: 'gmail',
      previewUrl: 'https://preview.local',
    });

    const result = await controller.testEmail({
      to: 'team@example.com',
    });

    expect(mailService.sendEmail).toHaveBeenCalledWith(
      'team@example.com',
      '[FinOps] Test email (Gmail SMTP)',
      'This is a test email from FinOps. If you received it, Gmail SMTP is configured correctly.',
      expect.stringContaining('POST /test-email'),
    );
    expect(result).toEqual({
      success: true,
      sent: true,
      to: 'team@example.com',
      provider: 'gmail',
      previewUrl: 'https://preview.local',
      message: 'Test email sent successfully.',
    });
  });
});
