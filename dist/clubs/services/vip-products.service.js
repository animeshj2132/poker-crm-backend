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
exports.VipProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const vip_product_entity_1 = require("../entities/vip-product.entity");
const club_entity_1 = require("../club.entity");
let VipProductsService = class VipProductsService {
    constructor(productsRepo, clubsRepo) {
        this.productsRepo = productsRepo;
        this.clubsRepo = clubsRepo;
    }
    async create(clubId, data) {
        var _a, _b;
        if (!data.title || !data.title.trim()) {
            throw new common_1.BadRequestException('Product title is required');
        }
        if (data.title.trim().length < 2) {
            throw new common_1.BadRequestException('Product title must be at least 2 characters long');
        }
        if (data.title.trim().length > 200) {
            throw new common_1.BadRequestException('Product title cannot exceed 200 characters');
        }
        if (data.points === null || data.points === undefined) {
            throw new common_1.BadRequestException('Points is required');
        }
        if (typeof data.points !== 'number' || isNaN(data.points)) {
            throw new common_1.BadRequestException('Points must be a valid number');
        }
        if (data.points < 1) {
            throw new common_1.BadRequestException('Points must be at least 1');
        }
        if (data.points > 1000000) {
            throw new common_1.BadRequestException('Points cannot exceed 1,000,000');
        }
        if (!Number.isInteger(data.points)) {
            throw new common_1.BadRequestException('Points must be an integer');
        }
        if (data.description && data.description.trim().length > 1000) {
            throw new common_1.BadRequestException('Description cannot exceed 1000 characters');
        }
        if (data.imageUrl && data.imageUrl.trim().length > 500) {
            throw new common_1.BadRequestException('Image URL cannot exceed 500 characters');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        const existingProduct = await this.productsRepo.findOne({
            where: { club: { id: clubId }, title: data.title.trim() }
        });
        if (existingProduct) {
            throw new common_1.ConflictException(`A product with title "${data.title}" already exists in this club`);
        }
        const product = this.productsRepo.create({
            title: data.title.trim(),
            points: data.points,
            description: ((_a = data.description) === null || _a === void 0 ? void 0 : _a.trim()) || null,
            imageUrl: ((_b = data.imageUrl) === null || _b === void 0 ? void 0 : _b.trim()) || null,
            club
        });
        return this.productsRepo.save(product);
    }
    async findAll(clubId) {
        return this.productsRepo.find({
            where: { club: { id: clubId } },
            order: { points: 'ASC' }
        });
    }
    async findOne(id, clubId) {
        const product = await this.productsRepo.findOne({
            where: { id, club: { id: clubId } }
        });
        if (!product)
            throw new common_1.NotFoundException('VIP product not found');
        return product;
    }
    async update(id, clubId, data) {
        var _a, _b;
        const product = await this.findOne(id, clubId);
        if (data.title !== undefined) {
            if (!data.title || !data.title.trim()) {
                throw new common_1.BadRequestException('Product title cannot be empty');
            }
            if (data.title.trim().length < 2) {
                throw new common_1.BadRequestException('Product title must be at least 2 characters long');
            }
            if (data.title.trim().length > 200) {
                throw new common_1.BadRequestException('Product title cannot exceed 200 characters');
            }
            const existingProduct = await this.productsRepo.findOne({
                where: { club: { id: clubId }, title: data.title.trim() }
            });
            if (existingProduct && existingProduct.id !== id) {
                throw new common_1.ConflictException(`A product with title "${data.title.trim()}" already exists in this club`);
            }
            data.title = data.title.trim();
        }
        if (data.points !== undefined) {
            if (typeof data.points !== 'number' || isNaN(data.points)) {
                throw new common_1.BadRequestException('Points must be a valid number');
            }
            if (data.points < 1) {
                throw new common_1.BadRequestException('Points must be at least 1');
            }
            if (data.points > 1000000) {
                throw new common_1.BadRequestException('Points cannot exceed 1,000,000');
            }
            if (!Number.isInteger(data.points)) {
                throw new common_1.BadRequestException('Points must be an integer');
            }
        }
        if (data.description !== undefined) {
            if (data.description && data.description.trim().length > 1000) {
                throw new common_1.BadRequestException('Description cannot exceed 1000 characters');
            }
            data.description = (((_a = data.description) === null || _a === void 0 ? void 0 : _a.trim()) || undefined);
        }
        if (data.imageUrl !== undefined) {
            if (data.imageUrl && data.imageUrl.trim().length > 500) {
                throw new common_1.BadRequestException('Image URL cannot exceed 500 characters');
            }
            data.imageUrl = (((_b = data.imageUrl) === null || _b === void 0 ? void 0 : _b.trim()) || undefined);
        }
        Object.assign(product, data);
        return this.productsRepo.save(product);
    }
    async remove(id, clubId) {
        const product = await this.findOne(id, clubId);
        await this.productsRepo.remove(product);
    }
};
exports.VipProductsService = VipProductsService;
exports.VipProductsService = VipProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(vip_product_entity_1.VipProduct)),
    __param(1, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], VipProductsService);
//# sourceMappingURL=vip-products.service.js.map