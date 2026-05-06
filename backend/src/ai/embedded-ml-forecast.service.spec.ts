import { EmbeddedMlForecastService } from './embedded-ml-forecast.service';

describe('EmbeddedMlForecastService', () => {
  let service: EmbeddedMlForecastService;

  beforeEach(() => {
    const expenseRepo = {
      find: jest.fn().mockResolvedValue(
        Array.from({ length: 18 }, (_, index) => ({
          amount: 90 + index * 7 + (index % 3) * 4,
          expenseDate: `2026-03-${String(index + 1).padStart(2, '0')}`,
        })),
      ),
    };

    service = new EmbeddedMlForecastService(expenseRepo as any);
  });

  it('trains an embedded TensorFlow.js model and returns a forecast timeline', async () => {
    const result = await service.generate('company-1', {
      historyDays: 120,
      windowSize: 5,
      horizonDays: 4,
    });

    expect(result.modelType).toContain('TensorFlow.js');
    expect(result.framework).toBe('@tensorflow/tfjs');
    expect(result.modelStatus).toBe('trained');
    expect(result.trainingSamples).toBeGreaterThan(0);
    expect(result.timeline).toHaveLength(4);
    expect(result.predictedHorizonTotal).toBeGreaterThanOrEqual(0);
  });
});
