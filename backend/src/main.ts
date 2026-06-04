import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      // 오리진이 없으면(서버간 요청) 허용
      if (!origin) return callback(null, true);
      // allowedOrigins에 포함되거나 vercel.app 도메인이면 허용
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  });

  const port = process.env.BACKEND_PORT || 4000;
  await app.listen(port);
  console.log(`🚀 CT 계약관리시스템 API: http://localhost:${port}/api`);
}

bootstrap();
