"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const storage_service_1 = require("./storage/storage.service");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix('api');
    const allowedOrigins = [
        process.env.PLAYER_APP_URL || 'http://localhost:5173',
        process.env.WEBSITE_URL || 'http://localhost:3000',
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
    if (process.env.ALLOWED_ORIGINS) {
        const customOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
        allowedOrigins.push(...customOrigins);
    }
    console.log('🔐 CORS enabled for origins:', allowedOrigins.slice(0, 2));
    app.enableCors({
        origin: allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-tenant-id', 'x-club-id', 'x-player-id']
    });
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    const port = process.env.PORT || 3333;
    try {
        await app.get(storage_service_1.StorageService).ensureBucket();
    }
    catch (_) { }
    await app.listen(port);
    console.log(`🚀 Backend running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map