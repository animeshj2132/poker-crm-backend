import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './tenant.entity';
import { Club } from '../clubs/club.entity';
import { UserTenantRole } from '../users/user-tenant-role.entity';
import { ClubsModule } from '../clubs/clubs.module';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, Club, UserTenantRole]),
    ClubsModule,
    UsersModule,
    StorageModule
  ],
  providers: [TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService]
})
export class TenantsModule {}



