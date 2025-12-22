import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { Tenant } from './tenant.entity';
import { ClubsModule } from '../clubs/clubs.module';
import { UsersModule } from '../users/users.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant]),
    ClubsModule,
    UsersModule,
    StorageModule
  ],
  providers: [TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService]
})
export class TenantsModule {}



