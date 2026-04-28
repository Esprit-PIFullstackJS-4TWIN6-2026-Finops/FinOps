import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  findAll(@CurrentUser() user: User) {
    return this.service.findAllForUser(user);
  }

  @Get('ninja/remote')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
  )
  listNinjaRemote(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('per_page') perPage?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const pp = perPage ? parseInt(perPage, 10) : 100;
    return this.service.listNinjaRemote(user, Number.isFinite(p) ? p : 1, Number.isFinite(pp) ? pp : 100);
  }

  @Get('ninja/remote/:ninjaId')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
  )
  getNinjaRemoteOne(@CurrentUser() user: User, @Param('ninjaId') ninjaId: string) {
    return this.service.getNinjaRemoteById(user, ninjaId);
  }

  @Get(':id/pdf')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  async downloadPdf(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    const { buffer, filename } = await this.service.getInvoicePdf(user, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }

  @Get(':id/export-pdf')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  async exportPdf(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Res({ passthrough: false }) res: Response,
  ) {
    try {
      console.log('[exportPdf] Called with ID:', id);
      const { buffer, filename } = await this.service.getInvoicePdf(user, id);
      console.log('[exportPdf] PDF generated, size:', buffer.length, 'filename:', filename);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
      console.log('[exportPdf] Response sent successfully');
    } catch (error) {
      console.error('[exportPdf] Error:', error);
      throw error;
    }
  }

  @Get(':id/payment-suggestion')
  @Post(':id/payment-suggestion')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  async paymentSuggestion(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ) {
    try {
      console.log('[paymentSuggestion] Called with ID:', id);
      const result = await this.service.suggestPaymentChunks(user, id);
      console.log('[paymentSuggestion] Result:', result);
      return result;
    } catch (error) {
      console.error('[paymentSuggestion] Error:', error);
      throw error;
    }
  }

  @Get(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.findOneForUser(user, id);
  }

  @Post()
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
  )
  create(@CurrentUser() user: User, @Body() dto: CreateInvoiceDto) {
    return this.service.create(user, dto);
  }

  @Post(':id/sync-ninja')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
  )
  syncNinja(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.syncInvoiceToNinja(user, id);
  }

  @Patch(':id/pay')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.ACCOUNTANT,
    UserRole.CLIENT,
  )
  pay(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.markPaid(user, id);
  }

  @Patch(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
  )
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  @Roles(
    UserRole.PLATFORM_ADMIN,
    UserRole.OWNER,
    UserRole.MANAGER,
    UserRole.EMPLOYEE,
    UserRole.ACCOUNTANT,
  )
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
