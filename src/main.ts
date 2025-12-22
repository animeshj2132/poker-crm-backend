import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StorageService } from './storage/storage.service';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
  // Build allowed origins from environment variables
  const allowedOrigins = [
    // Player App (Mobile/PWA)
    process.env.PLAYER_APP_URL || 'http://localhost:5173',
    
    // Website (Main site)
    process.env.WEBSITE_URL || 'http://localhost:3000',
    
    // Development ports (for local testing)
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:8083',
    'http://localhost:8084',
    'http://localhost:8085',
    'http://localhost:8086',
    'http://localhost:8087',
    'http://localhost:8088',
    'http://localhost:8089',
    'http://localhost:8090',
    'http://localhost:8091',
    'http://localhost:8092',
    'http://localhost:8093',
    'http://localhost:8094',
    'http://localhost:8095',
    'http://localhost:8096',
    'http://localhost:8097',
    'http://localhost:8098',
    'http://localhost:8099'
  ];

  // Add custom origins from environment (comma-separated)
  if (process.env.ALLOWED_ORIGINS) {
    const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
    allowedOrigins.push(...customOrigins);
  }

  console.log('🔐 CORS enabled for origins:', allowedOrigins.slice(0, 2)); // Log first 2 (app + website)
  
  // Enable CORS for frontend
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-tenant-id', 'x-club-id', 'x-player-id']
  });
  
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })
  );

  const port = process.env.PORT || 3333;
  // Ensure storage bucket exists (non-blocking)
  try {
    await app.get(StorageService).ensureBucket();
  } catch (_) {}
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);
}

bootstrap();

