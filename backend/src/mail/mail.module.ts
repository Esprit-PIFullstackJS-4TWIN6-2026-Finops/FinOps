import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailValidatorService } from './email-validator.service';
import { MailController } from './mail.controller';

@Global()
@Module({
  providers: [MailService, EmailValidatorService],
  controllers: [MailController],
  exports: [MailService, EmailValidatorService],
})
export class MailModule {}
