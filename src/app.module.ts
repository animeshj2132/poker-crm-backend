import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { ClubsModule } from './clubs/clubs.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/user.entity';
import { Tenant } from './tenants/tenant.entity';
import { Club } from './clubs/club.entity';
import { UserTenantRole } from './users/user-tenant-role.entity';
import { UserClubRole } from './users/user-club-role.entity';
import { Staff } from './clubs/entities/staff.entity';
import { CreditRequest } from './clubs/entities/credit-request.entity';
import { FinancialTransaction } from './clubs/entities/financial-transaction.entity';
import { VipProduct } from './clubs/entities/vip-product.entity';
import { ClubSettings } from './clubs/entities/club-settings.entity';
import { AuditLog } from './clubs/entities/audit-log.entity';
import { ApiKeyAuthGuard } from './auth/api-key.guard';
import { RolesGuard } from './common/rbac/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { StorageModule } from './storage/storage.module';
import { EventsModule } from './events/events.module';
import { PlayerDocumentsModule } from './player-documents/player-documents.module';
import { PlayerChatModule } from './player-chat/player-chat.module';
import { PlayerOffersModule } from './player-offers/player-offers.module';
import { PlayerVipModule } from './player-vip/player-vip.module';
import { PlayerFeedbackModule } from './player-feedback/player-feedback.module';
import { PlayerTournamentsModule } from './player-tournaments/player-tournaments.module';
import { PlayerPlaytimeModule } from './player-playtime/player-playtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        autoLoadEntities: true,
        synchronize: false
      })
    }),
    TypeOrmModule.forFeature([
      User,
      Tenant,
      Club,
      UserTenantRole,
      UserClubRole,
      Staff,
      CreditRequest,
      FinancialTransaction,
      VipProduct,
      ClubSettings,
      AuditLog
    ]),
    AuthModule,
    UsersModule,
    TenantsModule,
    ClubsModule,
    StorageModule,
    EventsModule,
    PlayerDocumentsModule,
    PlayerChatModule,
    PlayerOffersModule,
    PlayerVipModule,
    PlayerFeedbackModule,
    PlayerTournamentsModule,
    PlayerPlaytimeModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter }
  ]
})
export class AppModule {}

