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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const tenant_entity_1 = require("./tenant.entity");
let TenantsService = class TenantsService {
    constructor(tenantsRepo) {
        this.tenantsRepo = tenantsRepo;
    }
    async create(name) {
        if (!name || !name.trim()) {
            throw new common_1.BadRequestException('Tenant name is required');
        }
        if (name.trim().length < 2) {
            throw new common_1.BadRequestException('Tenant name must be at least 2 characters long');
        }
        if (name.trim().length > 200) {
            throw new common_1.BadRequestException('Tenant name cannot exceed 200 characters');
        }
        const existing = await this.tenantsRepo.findOne({ where: { name: name.trim() } });
        if (existing)
            throw new common_1.ConflictException('Tenant name already exists');
        const tenant = this.tenantsRepo.create({ name: name.trim() });
        return this.tenantsRepo.save(tenant);
    }
    async findAll() {
        try {
            return await this.tenantsRepo.find();
        }
        catch (err) {
            console.error('Error in TenantsService.findAll():', err);
            throw err;
        }
    }
    async findById(id) {
        return await this.tenantsRepo.findOne({ where: { id } });
    }
    async updateBranding(tenantId, data) {
        if (!tenantId) {
            throw new common_1.BadRequestException('Tenant ID is required');
        }
        const tenant = await this.tenantsRepo.findOne({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Tenant not found');
        if (data.customDomain !== undefined) {
            if (data.customDomain && data.customDomain.trim()) {
                const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                if (!domainRegex.test(data.customDomain.trim())) {
                    throw new common_1.BadRequestException('Invalid custom domain format');
                }
                const domainHolder = await this.tenantsRepo.findOne({ where: { customDomain: data.customDomain.trim() } });
                if (domainHolder && domainHolder.id !== tenantId) {
                    throw new common_1.ConflictException('Custom domain already in use');
                }
                data.customDomain = data.customDomain.trim();
            }
            else {
                data.customDomain = undefined;
            }
        }
        if (data.primaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.primaryColor)) {
            throw new common_1.BadRequestException('Primary color must be a valid hex color (e.g., #FF5733)');
        }
        if (data.secondaryColor && !/^#[0-9A-Fa-f]{6}$/.test(data.secondaryColor)) {
            throw new common_1.BadRequestException('Secondary color must be a valid hex color (e.g., #FF5733)');
        }
        Object.assign(tenant, data);
        return this.tenantsRepo.save(tenant);
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(tenant_entity_1.Tenant)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map