import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { json, urlencoded, Request, Response, NextFunction } from 'express';
import * as helmet from 'helmet';
import * as compression from 'compression';
import * as express from 'express';
import { join } from 'path';
import * as Joi from 'joi';
import { AppModule } from './app.module';

const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required().min(16),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  RESEND_API_KEY: Joi.string().optional(),
  SMTP_FROM: Joi.string().optional(),
  NEXT_PUBLIC_APP_URL: Joi.string().optional(),
  STRIPE_SECRET_KEY: Joi.string().optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
}).unknown(true);

const { error: envError, value: envValues } = envValidationSchema.validate(process.env, {
  abortEarly: false,
  allowUnknown: true,
});

if (envError) {
  console.error('❌ Environment validation failed:');
  envError.details.forEach((detail) => {
    console.error(`  - ${detail.message}`);
  });
  process.exit(1);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  app.setGlobalPrefix('api');

  const allowedOrigins = [
    'https://zentra-web-one.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://zentra-api-production.up.railway.app',
    'https://zentra-api-production-dee5.up.railway.app',
  ];

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(helmet.default({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));

  app.use(compression());

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const rawBodySaver = (req: Request, _res: Response, buf: Buffer, encoding: BufferEncoding) => {
    if (buf && buf.length) {
      (req as any).rawBody = buf.toString(encoding || 'utf8');
    }
  };

  app.use(json({ verify: rawBodySaver, limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  app.getHttpAdapter().getInstance().get('/api/health', (_req: any, res: any) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const config = new DocumentBuilder()
    .setTitle('Zentra API')
    .setDescription('Personal Finance Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  if (process.env.NODE_ENV !== 'production') {
    SwaggerModule.setup('api/docs', app, document);
  }

  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);

  if (process.env.NODE_ENV === 'production') {
    const selfUrl = `http://localhost:${port}`;
    setInterval(async () => {
      try {
        await fetch(`${selfUrl}/api/health`);
      } catch {}
    }, 13 * 60 * 1000);
  }
}
bootstrap();
