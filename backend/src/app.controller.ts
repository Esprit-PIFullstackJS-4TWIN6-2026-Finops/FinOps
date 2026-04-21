import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MailService } from './mail/mail.service';
import { SendTestEmailDto } from './mail/dto/send-test-email.dto';

@Controller()
export class AppController {
  constructor(private readonly mailService: MailService) {}

  @Get()
  root() {
    return {
      name: 'FinOps SaaS Platform API',
      status: 'running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: 'GET /health',
        testEmail: 'POST /test-email',
        login: 'POST /auth/login',
        register: 'POST /registration',
        me: 'GET /users/me',
      },
    };
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Send a test email via configured Gmail SMTP (or return a clear error if not ready).
   */
  @Post('test-email')
  @HttpCode(HttpStatus.OK)
  async testEmail(@Body() body: SendTestEmailDto) {
    const to = body.to?.trim() || process.env.GMAIL_USER?.trim();
    if (!to) {
      console.error('EMAIL ERROR: test-email — no recipient (pass { "to": "..." } or set GMAIL_USER)');
      return {
        success: false,
        sent: false,
        message:
          'No recipient: provide { "to": "email@example.com" } in the body or set GMAIL_USER in backend/.env',
      };
    }

    const subject = body.subject || '[FinOps] Test email (Gmail SMTP)';
    const text =
      body.text ||
      'This is a test email from FinOps. If you received it, Gmail SMTP is configured correctly.';
    const html =
      body.html ||
      `
      <div style="font-family: Arial, sans-serif;">
        <h2>FinOps — Test email</h2>
        <p>This message was sent via <code>POST /test-email</code>.</p>
        <p>If you see this in your inbox, Gmail SMTP is working.</p>
      </div>
    `;

    console.log(`[test-email] Sending test email to: ${to}`);

    const result = await this.mailService.sendEmail(to, subject, text, html);

    if (result.sent) {
      console.log(`[test-email] Success: sent to ${to} (provider=${result.provider})`);
    } else {
      console.error(
        `[test-email] Failed: sent=${result.sent} provider=${result.provider} — check startup logs and GMAIL_* env vars`,
      );
    }

    return {
      success: result.sent,
      sent: result.sent,
      to,
      provider: result.provider,
      previewUrl: result.previewUrl,
      message: result.sent
        ? 'Test email sent successfully.'
        : 'Test email was not sent. Ensure Gmail App Password is set and server logs show: EMAIL: Gmail SMTP configured',
    };
  }
}
