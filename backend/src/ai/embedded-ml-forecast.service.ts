import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as tf from '@tensorflow/tfjs';
import { Repository } from 'typeorm';
import { Expense } from '../entities/expense.entity';
import {
  EmbeddedMlForecastDto,
  EmbeddedMlForecastPoint,
  EmbeddedMlForecastResult,
} from './dto/finops-ai.dto';

type ForecastSeries = {
  values: number[];
  labels: string[];
  granularity: EmbeddedMlForecastResult['seriesGranularity'];
};

@Injectable()
export class EmbeddedMlForecastService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenseRepo: Repository<Expense>,
  ) {}

  async generate(companyId: string, dto: EmbeddedMlForecastDto): Promise<EmbeddedMlForecastResult> {
    const historyDays = dto.historyDays ?? 120;
    const horizonDays = dto.horizonDays ?? 7;
    const requestedWindowSize = dto.windowSize ?? 7;

    const expenses = await this.expenseRepo.find({
      where: { companyId },
      order: { expenseDate: 'ASC' },
    });

    const series = this.buildForecastSeries(expenses, historyDays);
    const effectiveWindowSize = Math.min(requestedWindowSize, Math.max(3, series.values.length - 1));

    if (series.values.length < effectiveWindowSize + 2) {
      return this.buildInsufficientDataResult(series, historyDays, effectiveWindowSize, horizonDays);
    }

    const samples = this.buildSlidingWindows(series.values, effectiveWindowSize);
    if (samples.inputs.length < 3) {
      return this.buildInsufficientDataResult(series, historyDays, effectiveWindowSize, horizonDays);
    }

    const scale = Math.max(1, ...series.values);
    const normalizedInputs = samples.inputs.map((row) => row.map((value) => value / scale));
    const normalizedTargets = samples.targets.map((value) => [value / scale]);

    const trainSize = Math.max(1, Math.floor(normalizedInputs.length * 0.8));
    const validationSize = normalizedInputs.length - trainSize;

    const xsTrain = tf.tensor2d(normalizedInputs.slice(0, trainSize), [trainSize, effectiveWindowSize]);
    const ysTrain = tf.tensor2d(normalizedTargets.slice(0, trainSize), [trainSize, 1]);
    const xsValidation =
      validationSize > 0
        ? tf.tensor2d(normalizedInputs.slice(trainSize), [validationSize, effectiveWindowSize])
        : null;
    const ysValidation =
      validationSize > 0 ? normalizedTargets.slice(trainSize).map((row) => row[0] * scale) : [];

    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [effectiveWindowSize] }));
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
    model.compile({
      optimizer: tf.train.adam(0.03),
      loss: 'meanSquaredError',
    });

    let timeline: EmbeddedMlForecastPoint[] = [];
    let mae = 0;
    let rmse = 0;

    try {
      await model.fit(xsTrain, ysTrain, {
        epochs: 45,
        batchSize: Math.min(8, trainSize),
        shuffle: false,
        verbose: 0,
      });

      if (xsValidation) {
        const validationPredictions = model.predict(xsValidation) as tf.Tensor;
        const rawPredictions = Array.from(await validationPredictions.data()).map((value) =>
          Math.max(0, value * scale),
        );
        validationPredictions.dispose();
        mae = this.meanAbsoluteError(rawPredictions, ysValidation);
        rmse = this.rootMeanSquaredError(rawPredictions, ysValidation);
      }

      timeline = await this.buildFutureTimeline(
        model,
        normalizedInputs[normalizedInputs.length - 1],
        series.labels[series.labels.length - 1],
        horizonDays,
        scale,
      );
    } finally {
      xsTrain.dispose();
      ysTrain.dispose();
      xsValidation?.dispose();
      model.dispose();
      tf.disposeVariables();
    }

    const predictedHorizonTotal = Number(
      timeline.reduce((sum, point) => sum + point.predictedExpense, 0).toFixed(2),
    );
    const predictedNextStepExpense = Number((timeline[0]?.predictedExpense ?? 0).toFixed(2));
    const averageObservedSpend = this.average(series.values);
    const confidence = this.computeConfidence(series.values, mae, rmse, validationSize);

    return {
      modelStatus: 'trained',
      modelType: 'TensorFlow.js sequential dense regressor',
      framework: '@tensorflow/tfjs',
      seriesGranularity: series.granularity,
      historyDays,
      windowSize: effectiveWindowSize,
      horizonDays,
      trainingSamples: trainSize,
      validationSamples: validationSize,
      averageObservedSpend: Number(averageObservedSpend.toFixed(2)),
      predictedNextStepExpense,
      predictedHorizonTotal,
      confidence,
      mae: Number(mae.toFixed(2)),
      rmse: Number(rmse.toFixed(2)),
      explanation:
        `A TensorFlow.js regression model was trained inside the project on ${samples.inputs.length} sliding-window samples ` +
        `built from ${series.values.length} observed ${series.granularity === 'daily_aggregated' ? 'daily totals' : 'expense events'}. ` +
        `It predicts the next ${horizonDays} step(s) with a confidence score of ${(confidence * 100).toFixed(0)}%.`,
      timeline,
      generatedAt: new Date().toISOString(),
    };
  }

  private buildForecastSeries(expenses: Expense[], historyDays: number): ForecastSeries {
    const filteredExpenses = expenses.filter(
      (expense) =>
        new Date(expense.expenseDate).getTime() >=
        this.startDateFromHistoryDays(historyDays).getTime(),
    );

    const dailySeries = this.aggregateDailyTotals(filteredExpenses);
    if (dailySeries.values.length >= 10) {
      return dailySeries;
    }

    const fallbackEvents = filteredExpenses.length ? filteredExpenses : expenses;
    return {
      values: fallbackEvents.map((expense) => Number(expense.amount)),
      labels: fallbackEvents.map((expense) => expense.expenseDate),
      granularity: 'expense_sequence',
    };
  }

  private aggregateDailyTotals(expenses: Expense[]): ForecastSeries {
    if (!expenses.length) {
      return { values: [], labels: [], granularity: 'daily_aggregated' };
    }

    const sorted = [...expenses].sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));
    const totalsByDay = new Map<string, number>();
    for (const expense of sorted) {
      totalsByDay.set(
        expense.expenseDate,
        Number(((totalsByDay.get(expense.expenseDate) || 0) + Number(expense.amount)).toFixed(2)),
      );
    }

    const first = new Date(sorted[0].expenseDate);
    const last = new Date(sorted[sorted.length - 1].expenseDate);
    const values: number[] = [];
    const labels: string[] = [];

    for (let cursor = new Date(first); cursor <= last; cursor.setDate(cursor.getDate() + 1)) {
      const isoDate = cursor.toISOString().slice(0, 10);
      labels.push(isoDate);
      values.push(Number((totalsByDay.get(isoDate) || 0).toFixed(2)));
    }

    return {
      values,
      labels,
      granularity: 'daily_aggregated',
    };
  }

  private buildSlidingWindows(values: number[], windowSize: number): { inputs: number[][]; targets: number[] } {
    const inputs: number[][] = [];
    const targets: number[] = [];

    for (let index = 0; index + windowSize < values.length; index += 1) {
      inputs.push(values.slice(index, index + windowSize));
      targets.push(values[index + windowSize]);
    }

    return { inputs, targets };
  }

  private async buildFutureTimeline(
    model: tf.Sequential,
    seedWindow: number[],
    lastObservedLabel: string,
    horizonDays: number,
    scale: number,
  ): Promise<EmbeddedMlForecastPoint[]> {
    const timeline: EmbeddedMlForecastPoint[] = [];
    let rollingWindow = [...seedWindow];
    const lastObservedDate = new Date(lastObservedLabel);

    for (let offset = 1; offset <= horizonDays; offset += 1) {
      const predictionTensor = model.predict(
        tf.tensor2d([rollingWindow], [1, rollingWindow.length]),
      ) as tf.Tensor;
      const [nextNormalizedValue] = await predictionTensor.data();
      predictionTensor.dispose();
      const nextValue = Number(Math.max(0, nextNormalizedValue * scale).toFixed(2));
      const nextDate = new Date(lastObservedDate);
      nextDate.setDate(lastObservedDate.getDate() + offset);
      timeline.push({
        period: nextDate.toISOString().slice(0, 10),
        predictedExpense: nextValue,
      });
      rollingWindow = [...rollingWindow.slice(1), nextValue / scale];
    }

    return timeline;
  }

  private buildInsufficientDataResult(
    series: ForecastSeries,
    historyDays: number,
    windowSize: number,
    horizonDays: number,
  ): EmbeddedMlForecastResult {
    return {
      modelStatus: 'insufficient_data',
      modelType: 'TensorFlow.js sequential dense regressor',
      framework: '@tensorflow/tfjs',
      seriesGranularity: series.granularity,
      historyDays,
      windowSize,
      horizonDays,
      trainingSamples: 0,
      validationSamples: 0,
      averageObservedSpend: Number(this.average(series.values).toFixed(2)),
      predictedNextStepExpense: 0,
      predictedHorizonTotal: 0,
      confidence: 0,
      mae: 0,
      rmse: 0,
      explanation:
        'The embedded TensorFlow.js model is configured, but the company does not yet have enough historical expense observations to train it reliably. Add more expenses and retry.',
      timeline: [],
      generatedAt: new Date().toISOString(),
    };
  }

  private computeConfidence(
    values: number[],
    mae: number,
    rmse: number,
    validationSamples: number,
  ): number {
    const averageSpend = Math.max(1, this.average(values));
    const normalizedError = (mae + rmse) / (2 * averageSpend);
    const validationBoost = validationSamples > 0 ? Math.min(0.2, validationSamples * 0.02) : 0;
    return Number(
      Math.max(0.2, Math.min(0.95, 0.85 - normalizedError * 0.6 + validationBoost)).toFixed(2),
    );
  }

  private meanAbsoluteError(predictions: number[], actuals: number[]): number {
    if (!predictions.length || !actuals.length) return 0;
    const total = predictions.reduce((sum, prediction, index) => sum + Math.abs(prediction - actuals[index]), 0);
    return total / predictions.length;
  }

  private rootMeanSquaredError(predictions: number[], actuals: number[]): number {
    if (!predictions.length || !actuals.length) return 0;
    const mse =
      predictions.reduce((sum, prediction, index) => sum + (prediction - actuals[index]) ** 2, 0) /
      predictions.length;
    return Math.sqrt(mse);
  }

  private average(values: number[]): number {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  private startDateFromHistoryDays(historyDays: number): Date {
    const date = new Date();
    date.setDate(date.getDate() - historyDays);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
