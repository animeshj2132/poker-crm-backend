import { SetMetadata } from '@nestjs/common';
import { AnyRole } from './roles';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AnyRole[]) => SetMetadata(ROLES_KEY, roles);



