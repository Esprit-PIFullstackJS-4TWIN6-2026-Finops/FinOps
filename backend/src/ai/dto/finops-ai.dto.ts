import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExpenseSnapshotDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  vendor?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AnalyzeExpensesDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSnapshotDto)
  expenses?: ExpenseSnapshotDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  lookbackMonths?: number = 6;
}

export class ForecastDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExpenseSnapshotDto)
  expenses?: ExpenseSnapshotDto[];

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(36)
  historyMonths?: number = 12;
}

export class CashFlowCopilotDto {
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(36)
  historyMonths?: number = 12;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  horizonMonths?: number = 3;
}

export class EmbeddedMlForecastDto {
  @IsOptional()
  @IsInt()
  @Min(21)
  @Max(365)
  historyDays?: number = 120;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(30)
  windowSize?: number = 7;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  horizonDays?: number = 7;
}

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  message!: string;
}

export class ReportDto {
  @IsOptional()
  @IsString()
  month?: string;
}

export interface AiAnomaly {
  title: string;
  severity: 'low' | 'medium' | 'high';
  detail: string;
}

export interface AnalyzeExpensesResult {
  summary: string;
  anomalies: AiAnomaly[];
  alerts: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface ForecastPoint {
  period: string;
  predictedExpense: number;
}

export interface ForecastResult {
  nextMonthExpense: number;
  next3MonthsTotal: number;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
  confidence: number;
  timeline: ForecastPoint[];
  generatedAt: string;
}

export interface CashFlowCopilotPoint {
  period: string;
  projectedInflows: number;
  projectedOutflows: number;
  netCashFlow: number;
  endingCash: number;
}

export interface CashFlowCopilotDriver {
  label: string;
  impact: number;
  direction: 'positive' | 'negative';
}

export interface CashFlowCopilotAction {
  title: string;
  detail: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CashFlowCopilotResult {
  openingCashEstimate: number;
  projectedEndingCash: number;
  netTrend: 'improving' | 'stable' | 'deteriorating';
  confidence: number;
  summary: string;
  drivers: CashFlowCopilotDriver[];
  actions: CashFlowCopilotAction[];
  timeline: CashFlowCopilotPoint[];
  generatedAt: string;
}

export interface EmbeddedMlForecastPoint {
  period: string;
  predictedExpense: number;
}

export interface EmbeddedMlForecastResult {
  modelStatus: 'trained' | 'insufficient_data';
  modelType: string;
  framework: string;
  seriesGranularity: 'daily_aggregated' | 'expense_sequence';
  historyDays: number;
  windowSize: number;
  horizonDays: number;
  trainingSamples: number;
  validationSamples: number;
  averageObservedSpend: number;
  predictedNextStepExpense: number;
  predictedHorizonTotal: number;
  confidence: number;
  mae: number;
  rmse: number;
  explanation: string;
  timeline: EmbeddedMlForecastPoint[];
  generatedAt: string;
}

export interface CostOptimizationResult {
  summary: string;
  estimatedMonthlySavings: number;
  recommendations: Array<{
    title: string;
    description: string;
    estimatedSavings: number;
    priority: 'low' | 'medium' | 'high';
  }>;
  generatedAt: string;
}

export interface ChatResult {
  answer: string;
  followUps: string[];
  generatedAt: string;
}

export interface MonthlyReportResult {
  month: string;
  totalExpenses: number;
  biggestCostSources: Array<{ label: string; amount: number }>;
  costIncreaseAnalysis: string;
  optimizationSuggestions: string[];
  executiveSummary: string;
  generatedAt: string;
}

export interface CategorizeExpenseInput {
  vendor?: string;
  notes?: string;
  amount: number;
}
