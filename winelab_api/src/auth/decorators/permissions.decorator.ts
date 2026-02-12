import { SetMetadata } from '@nestjs/common';
import { SystemPermission } from '../permissions';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: SystemPermission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
