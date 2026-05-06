import { MailController } from './mail.controller';

describe('MailController', () => {
  const originalGmailUser = process.env.GMAIL_USER;
  const mailService = {
    sendEmail: jest.fn(),
  };

  let controller: MailController;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GMAIL_USER;
    controller = new MailController(mailService as any);
  });

  afterEach(() => {
    if (originalGmailUser === undefined) {
      delete process.env.GMAIL_USER;
    } else {
      process.env.GMAIL_USER = originalGmailUser;
    }
  });

  it('returns a clear validation message when no recipient is provided', async () => {
    await expect(controller.sendTest({})).resolves.toEqual({
      sent: false,
      message:
        "Aucun destinataire fourni. Ajoutez 'to' dans le body ou configurez GMAIL_USER.",
    });
    expect(mailService.sendEmail).not.toHaveBeenCalled();
  });

  it('sends a test email with default content', async () => {
    mailService.sendEmail.mockResolvedValue({
      sent: true,
      provider: 'gmail',
    });

    const result = await controller.sendTest({ to: 'nourane@example.com' });

    expect(mailService.sendEmail).toHaveBeenCalledWith(
      'nourane@example.com',
      '[FinOps] Test Gmail SMTP',
      'Ceci est un email de test envoye depuis FinOps via Gmail SMTP.',
      expect.stringContaining('FinOps - Test Gmail SMTP'),
    );
    expect(result).toEqual({
      sent: true,
      provider: 'gmail',
      to: 'nourane@example.com',
      message: 'Email de test envoye avec succes.',
    });
  });
});
