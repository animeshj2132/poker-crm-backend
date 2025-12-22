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
exports.StaffService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const staff_entity_1 = require("../entities/staff.entity");
const club_entity_1 = require("../club.entity");
let StaffService = class StaffService {
    constructor(staffRepo, clubsRepo) {
        this.staffRepo = staffRepo;
        this.clubsRepo = clubsRepo;
    }
    async create(clubId, name, role, employeeId) {
        if (!name || !name.trim()) {
            throw new common_1.BadRequestException('Staff name is required');
        }
        if (name.trim().length < 2) {
            throw new common_1.BadRequestException('Staff name must be at least 2 characters long');
        }
        if (name.trim().length > 100) {
            throw new common_1.BadRequestException('Staff name cannot exceed 100 characters');
        }
        if (!Object.values(staff_entity_1.StaffRole).includes(role)) {
            throw new common_1.BadRequestException('Invalid staff role');
        }
        if (employeeId && employeeId.trim().length > 50) {
            throw new common_1.BadRequestException('Employee ID cannot exceed 50 characters');
        }
        const club = await this.clubsRepo.findOne({ where: { id: clubId } });
        if (!club)
            throw new common_1.NotFoundException('Club not found');
        if (employeeId && employeeId.trim()) {
            const existingStaff = await this.staffRepo.findOne({
                where: { club: { id: clubId }, employeeId: employeeId.trim() }
            });
            if (existingStaff) {
                throw new common_1.ConflictException(`Staff with employee ID "${employeeId.trim()}" already exists in this club`);
            }
        }
        const staff = this.staffRepo.create({
            name: name.trim(),
            role,
            employeeId: (employeeId === null || employeeId === void 0 ? void 0 : employeeId.trim()) || null,
            status: staff_entity_1.StaffStatus.ACTIVE,
            club
        });
        return this.staffRepo.save(staff);
    }
    async findAll(clubId) {
        return this.staffRepo.find({
            where: { club: { id: clubId } },
            order: { createdAt: 'DESC' }
        });
    }
    async findOne(id, clubId) {
        const staff = await this.staffRepo.findOne({
            where: { id, club: { id: clubId } }
        });
        if (!staff)
            throw new common_1.NotFoundException('Staff not found');
        return staff;
    }
    async update(id, clubId, data) {
        const staff = await this.findOne(id, clubId);
        if (data.name !== undefined) {
            if (!data.name || !data.name.trim()) {
                throw new common_1.BadRequestException('Staff name cannot be empty');
            }
            if (data.name.trim().length < 2) {
                throw new common_1.BadRequestException('Staff name must be at least 2 characters long');
            }
            if (data.name.trim().length > 100) {
                throw new common_1.BadRequestException('Staff name cannot exceed 100 characters');
            }
            data.name = data.name.trim();
        }
        if (data.role !== undefined && !Object.values(staff_entity_1.StaffRole).includes(data.role)) {
            throw new common_1.BadRequestException('Invalid staff role');
        }
        if (data.status !== undefined && !Object.values(staff_entity_1.StaffStatus).includes(data.status)) {
            throw new common_1.BadRequestException('Invalid staff status');
        }
        if (data.employeeId !== undefined) {
            if (data.employeeId && data.employeeId.trim().length > 50) {
                throw new common_1.BadRequestException('Employee ID cannot exceed 50 characters');
            }
            if (data.employeeId && data.employeeId.trim()) {
                const existingStaff = await this.staffRepo.findOne({
                    where: { club: { id: clubId }, employeeId: data.employeeId.trim() }
                });
                if (existingStaff && existingStaff.id !== id) {
                    throw new common_1.ConflictException(`Staff with employee ID "${data.employeeId.trim()}" already exists in this club`);
                }
                data.employeeId = data.employeeId.trim();
            }
            else {
                data.employeeId = undefined;
            }
        }
        Object.assign(staff, data);
        return this.staffRepo.save(staff);
    }
    async remove(id, clubId) {
        const staff = await this.findOne(id, clubId);
        await this.staffRepo.remove(staff);
    }
};
exports.StaffService = StaffService;
exports.StaffService = StaffService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(staff_entity_1.Staff)),
    __param(1, (0, typeorm_1.InjectRepository)(club_entity_1.Club)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], StaffService);
//# sourceMappingURL=staff.service.js.map