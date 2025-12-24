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
    'https://localhost',
    'capacitor://localhost',
    'http://localhost',
    'https://localhost:3000'
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

