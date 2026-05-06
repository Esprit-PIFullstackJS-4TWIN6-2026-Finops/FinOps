import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AiService } from './ai.service';
import {
  BatchTranslateDto,
  BatchTranslateResult,
  TranslateDto,
  TranslateResult,
} from './dto/translate.dto';
import {
  AnalyzeExpensesDto,
  AnalyzeExpensesResult,
  ChatDto,
  ChatResult,
  CostOptimizationResult,
  CashFlowCopilotDto,
  CashFlowCopilotResult,
  EmbeddedMlForecastDto,
  EmbeddedMlForecastResult,
  ForecastDto,
  ForecastResult,
  MonthlyReportResult,
  ReportDto,
} from './dto/finops-ai.dto';
import { User, UserRole } from '../entities/user.entity';
import { SmartDocumentIntakeDto, SmartDocumentIntakeResult } from './dto/invoice-extraction.dto';
import { InvoiceAiExtractionService } from './invoice-ai/invoice-ai-extraction.service';
import { CashFlowCopilotService } from './cash-flow-copilot.service';
import { EmbeddedMlForecastService } from './embedded-ml-forecast.service';

@ApiTags('AI Analytics')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly invoiceAiExtractionService: InvoiceAiExtractionService,
    private readonly cashFlowCopilotService: CashFlowCopilotService,
    private readonly embeddedMlForecastService: EmbeddedMlForecastService,
  ) {}

  @Get('insights')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  getInsights(@CurrentUser() user: User) {
    return this.aiService.analyzeExpenses(user.activeCompanyId || user.companyId!, {
      lookbackMonths: 6,
    });
  }

  @Post('translate')
  @ApiOperation({ summary: 'Translate text via Python NLLB service' })
  translate(@Body() payload: TranslateDto): Promise<TranslateResult> {
    return this.aiService.translate(payload);
  }

  @Post('translate/batch')
  @ApiOperation({ summary: 'Batch translate texts via Python NLLB service' })
  translateBatch(@Body() payload: BatchTranslateDto): Promise<BatchTranslateResult> {
    return this.aiService.translateBatch(payload);
  }

  @Get('languages')
  @ApiOperation({ summary: 'List available NLLB language codes' })
  languages(): Promise<{ languages: string[] }> {
    return this.aiService.listLanguages();
  }

  @Post('analyze-expenses')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Analyze company expenses and detect anomalies' })
  analyzeExpenses(
    @CurrentUser() user: User,
    @Body() payload: AnalyzeExpensesDto,
  ): Promise<AnalyzeExpensesResult> {
    return this.aiService.analyzeExpenses(user.activeCompanyId || user.companyId!, payload);
  }

  @Post('forecast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Forecast future expenses from historical data' })
  forecast(@CurrentUser() user: User, @Body() payload: ForecastDto): Promise<ForecastResult> {
    return this.aiService.forecast(user.activeCompanyId || user.companyId!, payload);
  }

  @Post('smart-intake')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Extract an invoice or receipt draft from pasted document text' })
  smartIntake(@Body() payload: SmartDocumentIntakeDto): Promise<SmartDocumentIntakeResult> {
    return this.invoiceAiExtractionService.intakeDocument(payload);
  }

  @Post('cash-flow-copilot')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate a short-term cash-flow copilot forecast' })
  cashFlowCopilot(
    @CurrentUser() user: User,
    @Body() payload: CashFlowCopilotDto,
  ): Promise<CashFlowCopilotResult> {
    return this.cashFlowCopilotService.generate(user.activeCompanyId || user.companyId!, payload);
  }

  @Post('embedded-ml-forecast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Train and run an embedded TensorFlow.js expense forecast model' })
  embeddedMlForecast(
    @CurrentUser() user: User,
    @Body() payload: EmbeddedMlForecastDto,
  ): Promise<EmbeddedMlForecastResult> {
    return this.embeddedMlForecastService.generate(
      user.activeCompanyId || user.companyId!,
      payload,
    );
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT, UserRole.EMPLOYEE, UserRole.CLIENT)
  @ApiOperation({ summary: 'FinOps assistant chat with company-aware context' })
  chat(@CurrentUser() user: User, @Body() payload: ChatDto): Promise<ChatResult> {
    const companyId = user.activeCompanyId || user.companyId;
    if (!companyId) {
      throw new BadRequestException('No active company context found for AI chat.');
    }
    return this.aiService.chat(companyId, payload);
  }

  @Post('optimize-costs')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate cost optimization recommendations' })
  optimizeCosts(@CurrentUser() user: User): Promise<CostOptimizationResult> {
    return this.aiService.optimizeCosts(user.activeCompanyId || user.companyId!);
  }

  @Post('report/monthly')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER, UserRole.ACCOUNTANT)
  @ApiOperation({ summary: 'Generate AI monthly FinOps report' })
  monthlyReport(
    @CurrentUser() user: User,
    @Body() payload: ReportDto,
  ): Promise<MonthlyReportResult> {
    return this.aiService.generateMonthlyReport(user.activeCompanyId || user.companyId!, payload);
  }
}
