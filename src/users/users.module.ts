import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';
import { UserTenantRole } from './user-tenant-role.entity';
import { UserClubRole } from './user-club-role.entity';
import { Club } from '../clubs/club.entity';
import { Staff } from '../clubs/entities/staff.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserTenantRole, UserClubRole, Club, Staff])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService]
})
export class UsersModule {}



