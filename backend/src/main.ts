import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { DatabaseBootstrapService } from './bootstrap/database-bootstrap.service';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ActivityLogInterceptor } from './common/interceptors/activity-log.interceptor';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initializeDatabaseInBackground(
  app: NestExpressApplication,
  port: number,
) {
  const dataSource = app.get(DataSource, { strict: false });
  const bootstrapService = app.get(DatabaseBootstrapService, { strict: false });
  const maxAttempts = Number(process.env.DB_INIT_MAX_ATTEMPTS || 20);
  const retryDelay = Number(process.env.DB_INIT_RETRY_DELAY || 5000);

  if (!dataSource) {
    console.warn(
      '[Database] No DataSource provider found. API is running without database initialization.',
    );
    return;
  }

  if (dataSource.isInitialized) {
    console.log('[Database] Connection already initialized before HTTP startup.');
    await bootstrapService?.runSeedsSafely();
    return;
  }

  void (async () => {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await dataSource.initialize();
        console.log(`[Database] Connection established on attempt ${attempt}.`);
        await bootstrapService?.runSeedsSafely();
        return;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(
          `[Database] Connection attempt ${attempt}/${maxAttempts} failed: ${reason}`,
        );
        if (attempt < maxAttempts) {
          console.log(
            `[Database] API remains available on port ${port}; retrying in ${retryDelay}ms.`,
          );
          await sleep(retryDelay);
        }
      }
    }

    console.error(
      '[Database] Exhausted background connection retries. API is still running, but database-backed routes will fail until the database becomes reachable.',
    );
  })();
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.use((_, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(app.get(ActivityLogInterceptor));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('FinOps SaaS API')
    .setDescription('Enterprise multitenant financial management backend')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT || 3000);
  const host = '0.0.0.0';

  await app.listen(port, host);
  console.log(`FinOps API listening on http://${host}:${port}`);
  console.log(`Swagger docs available at http://${host}:${port}/docs`);

  await initializeDatabaseInBackground(app, port);
}
bootstrap();
