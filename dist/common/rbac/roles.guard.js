"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const roles_decorator_1 = require("./roles.decorator");
const roles_1 = require("./roles");
let RolesGuard = class RolesGuard {
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(roles_decorator_1.ROLES_KEY, [
            context.getHandler(),
            context.getClass()
        ]);
        if (!requiredRoles || requiredRoles.length === 0)
            return true;
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user)
            throw new common_1.UnauthorizedException('Missing authenticated user');
        const hasRole = requiredRoles.some((role) => {
            var _a, _b, _c, _d, _e, _f, _g;
            if (Object.values(roles_1.GlobalRole).includes(role)) {
                return (_a = user.globalRoles) === null || _a === void 0 ? void 0 : _a.includes(role);
            }
            if (Object.values(roles_1.TenantRole).includes(role)) {
                const tenantId = request.headers['x-tenant-id'];
                if (!tenantId)
                    return false;
                const entry = (_b = user.tenantRoles) === null || _b === void 0 ? void 0 : _b.find((r) => r.tenantId === tenantId);
                return (_d = (_c = entry === null || entry === void 0 ? void 0 : entry.roles) === null || _c === void 0 ? void 0 : _c.includes(role)) !== null && _d !== void 0 ? _d : false;
            }
            if (Object.values(roles_1.ClubRole).includes(role)) {
                const clubId = request.headers['x-club-id'];
                if (!clubId)
                    return false;
                const entry = (_e = user.clubRoles) === null || _e === void 0 ? void 0 : _e.find((r) => r.clubId === clubId);
                return (_g = (_f = entry === null || entry === void 0 ? void 0 : entry.roles) === null || _f === void 0 ? void 0 : _f.includes(role)) !== null && _g !== void 0 ? _g : false;
            }
            return false;
        });
        if (!hasRole)
            throw new common_1.ForbiddenException('Insufficient role');
        return true;
    }
};
exports.RolesGuard = RolesGuard;
exports.RolesGuard = RolesGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], RolesGuard);
//# sourceMappingURL=roles.guard.js.map