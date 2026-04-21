import { Module } from '@nestjs/common';
import { InvoiceNinjaService } from './invoice-ninja.service';

@Module({
  providers: [InvoiceNinjaService],
  exports: [InvoiceNinjaService],
})
export class InvoiceNinjaModule {}
