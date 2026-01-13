import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { StorageService } from './storage/storage.service';
import { ValidationPipe } from '@nestjs/common';
import * as http from 'http';
import * as https from 'https';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
  // Build allowed origins from environment variables
  const allowedOrigins = [
    // Player App (Mobile/PWA)
    process.env.PLAYER_APP_URL || 'http://localhost:5173',
    
    // Website (Main site)
    process.env.WEBSITE_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://localhost:3001',
    
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

  // Add health check endpoint to prevent Render from sleeping
  // Use the Express adapter directly with the full path including prefix
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/api/health', (req: any, res: any) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  const port = process.env.PORT || 3333;
  // Ensure storage bucket exists (non-blocking)
  try {
    await app.get(StorageService).ensureBucket();
  } catch (_) {}
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}`);

  // Self-ping mechanism to prevent Render from sleeping
  let pingCount = 0;
  const startSelfPing = () => {
    // Get the server URL - use RENDER_EXTERNAL_URL if available (Render), otherwise localhost
    const serverUrl = process.env.RENDER_EXTERNAL_URL 
      ? `${process.env.RENDER_EXTERNAL_URL}/api/health`
      : `http://localhost:${port}/api/health`;
    
    console.log(`🔄 Self-ping enabled: ${serverUrl} (pinging every 30s to prevent Render sleep)`);
    
    // Ping immediately on startup
    pingServer(serverUrl, true);
    
    // Then ping every 30 seconds
    setInterval(() => {
      pingCount++;
      // Only log every 2 minutes (4 pings) to reduce log clutter
      const shouldLog = pingCount % 4 === 0;
      pingServer(serverUrl, shouldLog);
    }, 30000); // 30 seconds
  };

  const pingServer = (url: string, logResult: boolean = false) => {
    // Use https module for HTTPS URLs, http module for HTTP URLs
    const isHttps = url.startsWith('https://');
    const httpModule = isHttps ? https : http;
    
    httpModule.get(url, (res) => {
      const statusCode = res.statusCode || 0;
      if (statusCode >= 200 && statusCode < 300) {
        if (logResult) {
          console.log(`✅ Self-ping successful (${pingCount} pings): ${new Date().toISOString()}`);
        }
      } else {
        console.warn(`⚠️ Self-ping returned status ${statusCode}`);
      }
    }).on('error', (err) => {
      // Only log errors if it's not a connection refused (server not ready yet)
      if (!err.message.includes('ECONNREFUSED')) {
        console.warn(`⚠️ Self-ping error: ${err.message}`);
      }
    });
  };

  // Start self-ping after a short delay to ensure server is fully ready
  setTimeout(() => {
    startSelfPing();
  }, 2000);
}

bootstrap();

