import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { MailService } from './mail.service';
import { SendTestEmailDto } from './dto/send-test-email.dto';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('test')
  @HttpCode(HttpStatus.OK)
  async sendTest(@Body() dto: SendTestEmailDto) {
    const to = dto.to || process.env.GMAIL_USER;
    if (!to) {
      return {
        sent: false,
        message:
          "Aucun destinataire fourni. Ajoutez 'to' dans le body ou configurez GMAIL_USER.",
      };
    }

    const subject = dto.subject || '[FinOps] Test Gmail SMTP';
    const text =
      dto.text ||
      'Ceci est un email de test envoye depuis FinOps via Gmail SMTP.';
    const html =
      dto.html ||
      `
      <div style="font-family: Arial, sans-serif;">
        <h2>FinOps - Test Gmail SMTP</h2>
        <p>Ceci est un email de test envoye depuis votre backend NestJS.</p>
        <p>Si vous voyez ce message dans Gmail, la configuration SMTP est correcte.</p>
      </div>
    `;

    const result = await this.mailService.sendEmail(to, subject, text, html);

    return {
      ...result,
      to,
      message: result.sent
        ? 'Email de test envoye avec succes.'
        : "Echec d'envoi. Verifiez GMAIL_USER, GMAIL_APP_PASSWORD et la configuration Google.",
    };
  }
}
