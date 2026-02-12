import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { SystemPermission } from '../permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<SystemPermission[]>(PERMISSIONS_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();

        if (!user) {
            throw new ForbiddenException('Пользователь не авторизован');
        }

        // Logic assumed: User object on request will have 'permissions' array populated by JwtStrategy or AuthService
        if (!user.permissions || !Array.isArray(user.permissions)) {
            throw new ForbiddenException('У пользователя нет прав');
        }

        const hasPermission = requiredPermissions.every(permission =>
            user.permissions.includes(permission)
        );

        if (!hasPermission) {
            throw new ForbiddenException('Недостаточно прав для выполнения действия');
        }

        return true;
    }
}
