import * as tf from '@tensorflow/tfjs';

export type TrainedTimeSeriesModel = {
  status: 'trained' | 'insufficient_data';
  modelType: string;
  framework: string;
  windowSize: number;
  trainingSamples: number;
  validationSamples: number;
  averageObserved: number;
  confidence: number;
  mae: number;
  rmse: number;
  predictedValues: number[];
};

export async function trainDenseTimeSeriesRegressor(
  values: number[],
  options: {
    horizon: number;
    requestedWindowSize?: number;
    minimumWindowSize?: number;
    epochs?: number;
  },
): Promise<TrainedTimeSeriesModel> {
  const minimumWindowSize = options.minimumWindowSize ?? 3;
  const requestedWindowSize = options.requestedWindowSize ?? 4;
  const horizon = options.horizon;
  const epochs = options.epochs ?? 50;
  const effectiveWindowSize = Math.min(
    requestedWindowSize,
    Math.max(minimumWindowSize, values.length - 1),
  );

  if (values.length < effectiveWindowSize + 2) {
    return buildInsufficientModel(values, effectiveWindowSize);
  }

  const samples = buildSlidingWindows(values, effectiveWindowSize);
  if (samples.inputs.length < 3) {
    return buildInsufficientModel(values, effectiveWindowSize);
  }

  const scale = Math.max(1, ...values.map((value) => Math.abs(value)));
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
  const validationActuals =
    validationSize > 0 ? normalizedTargets.slice(trainSize).map((row) => row[0] * scale) : [];

  const model = tf.sequential();
  model.add(tf.layers.dense({ units: 16, activation: 'relu', inputShape: [effectiveWindowSize] }));
  model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
  model.compile({
    optimizer: tf.train.adam(0.03),
    loss: 'meanSquaredError',
  });

  let predictedValues: number[] = [];
  let mae = 0;
  let rmse = 0;

  try {
    await model.fit(xsTrain, ysTrain, {
      epochs,
      batchSize: Math.min(8, trainSize),
      shuffle: false,
      verbose: 0,
    });

    if (xsValidation) {
      const validationPredictions = model.predict(xsValidation) as tf.Tensor;
      const rawPredictions = Array.from(await validationPredictions.data()).map((value) => value * scale);
      validationPredictions.dispose();
      mae = meanAbsoluteError(rawPredictions, validationActuals);
      rmse = rootMeanSquaredError(rawPredictions, validationActuals);
    }

    predictedValues = await forecastNextValues(
      model,
      normalizedInputs[normalizedInputs.length - 1],
      scale,
      horizon,
    );
  } finally {
    xsTrain.dispose();
    ysTrain.dispose();
    xsValidation?.dispose();
    model.dispose();
    tf.disposeVariables();
  }

  return {
    status: 'trained',
    modelType: 'TensorFlow.js sequential dense regressor',
    framework: '@tensorflow/tfjs',
    windowSize: effectiveWindowSize,
    trainingSamples: trainSize,
    validationSamples: validationSize,
    averageObserved: Number(average(values).toFixed(2)),
    confidence: computeConfidence(values, mae, rmse, validationSize),
    mae: Number(mae.toFixed(2)),
    rmse: Number(rmse.toFixed(2)),
    predictedValues,
  };
}

function buildInsufficientModel(values: number[], windowSize: number): TrainedTimeSeriesModel {
  return {
    status: 'insufficient_data',
    modelType: 'TensorFlow.js sequential dense regressor',
    framework: '@tensorflow/tfjs',
    windowSize,
    trainingSamples: 0,
    validationSamples: 0,
    averageObserved: Number(average(values).toFixed(2)),
    confidence: 0,
    mae: 0,
    rmse: 0,
    predictedValues: [],
  };
}

function buildSlidingWindows(
  values: number[],
  windowSize: number,
): { inputs: number[][]; targets: number[] } {
  const inputs: number[][] = [];
  const targets: number[] = [];

  for (let index = 0; index + windowSize < values.length; index += 1) {
    inputs.push(values.slice(index, index + windowSize));
    targets.push(values[index + windowSize]);
  }

  return { inputs, targets };
}

async function forecastNextValues(
  model: tf.Sequential,
  seedWindow: number[],
  scale: number,
  horizon: number,
): Promise<number[]> {
  const values: number[] = [];
  let rollingWindow = [...seedWindow];

  for (let offset = 0; offset < horizon; offset += 1) {
    const predictionTensor = model.predict(
      tf.tensor2d([rollingWindow], [1, rollingWindow.length]),
    ) as tf.Tensor;
    const [nextNormalizedValue] = await predictionTensor.data();
    predictionTensor.dispose();
    const nextValue = Number((nextNormalizedValue * scale).toFixed(2));
    values.push(nextValue);
    rollingWindow = [...rollingWindow.slice(1), nextValue / scale];
  }

  return values;
}

function computeConfidence(values: number[], mae: number, rmse: number, validationSamples: number): number {
  const averageSpend = Math.max(1, average(values));
  const normalizedError = (mae + rmse) / (2 * averageSpend);
  const validationBoost = validationSamples > 0 ? Math.min(0.2, validationSamples * 0.02) : 0;
  return Number(
    Math.max(0.2, Math.min(0.95, 0.85 - normalizedError * 0.6 + validationBoost)).toFixed(2),
  );
}

function meanAbsoluteError(predictions: number[], actuals: number[]): number {
  if (!predictions.length || !actuals.length) return 0;
  const total = predictions.reduce(
    (sum, prediction, index) => sum + Math.abs(prediction - actuals[index]),
    0,
  );
  return total / predictions.length;
}

function rootMeanSquaredError(predictions: number[], actuals: number[]): number {
  if (!predictions.length || !actuals.length) return 0;
  const mse =
    predictions.reduce((sum, prediction, index) => sum + (prediction - actuals[index]) ** 2, 0) /
    predictions.length;
  return Math.sqrt(mse);
}

function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
