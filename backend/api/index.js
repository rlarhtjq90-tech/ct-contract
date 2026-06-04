// Vercel 서버리스 진입점
// NestJS 앱을 서버리스 함수로 래핑

let cachedApp;

async function bootstrap() {
  if (cachedApp) return cachedApp;

  const { NestFactory } = require('@nestjs/core');
  const { ValidationPipe } = require('@nestjs/common');
  const { AppModule } = require('../dist/app.module');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const allowedOrigins = [
    'http://localhost:3000',
    'https://ct-contract.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  await app.init();
  cachedApp = app;
  return app;
}

module.exports = async (req, res) => {
  try {
    const app = await bootstrap();
    const server = app.getHttpAdapter().getInstance();
    server(req, res);
  } catch (err) {
    console.error('Bootstrap error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
