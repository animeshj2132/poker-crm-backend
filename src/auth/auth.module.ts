import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { UsersModule } from '../users/users.module';
import { ClubsModule } from '../clubs/clubs.module';
import { UserTenantRole } from '../users/user-tenant-role.entity';
import { UserClubRole } from '../users/user-club-role.entity';
import { Player } from '../clubs/entities/player.entity';
import { FinancialTransaction } from '../clubs/entities/financial-transaction.entity';
import { WaitlistEntry } from '../clubs/entities/waitlist-entry.entity';
import { Table } from '../clubs/entities/table.entity';
import { ApiKeyAuthGuard } from './api-key.guard';

@Module({
  imports: [
    UsersModule,
    ClubsModule,
    TypeOrmModule.forFeature([
      UserTenantRole,
      UserClubRole,
      Player,
      FinancialTransaction,
      WaitlistEntry,
      Table,
    ]),
  ],
  providers: [AuthService, ApiKeyAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, ApiKeyAuthGuard]
})
export class AuthModule {}



