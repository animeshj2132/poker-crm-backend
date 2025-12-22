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
exports.UserClubRole = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("./user.entity");
const club_entity_1 = require("../clubs/club.entity");
const roles_1 = require("../common/rbac/roles");
let UserClubRole = class UserClubRole {
};
exports.UserClubRole = UserClubRole;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], UserClubRole.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User, (user) => user.clubRoles, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'user_id' }),
    __metadata("design:type", user_entity_1.User)
], UserClubRole.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => club_entity_1.Club, (club) => club.userRoles, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: 'club_id' }),
    __metadata("design:type", club_entity_1.Club)
], UserClubRole.prototype, "club", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar' }),
    __metadata("design:type", String)
], UserClubRole.prototype, "role", void 0);
exports.UserClubRole = UserClubRole = __decorate([
    (0, typeorm_1.Entity)({ name: 'user_club_roles' }),
    (0, typeorm_1.Unique)(['user', 'club', 'role'])
], UserClubRole);
//# sourceMappingURL=user-club-role.entity.js.map