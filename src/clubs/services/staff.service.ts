import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff, StaffRole, StaffStatus } from '../entities/staff.entity';
import { Club } from '../club.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff) private readonly staffRepo: Repository<Staff>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>
  ) {}

  async create(clubId: string, name: string, role: StaffRole, employeeId?: string) {
    // Validate inputs
    if (!name || !name.trim()) {
      throw new BadRequestException('Staff name is required');
    }
    if (name.trim().length < 2) {
      throw new BadRequestException('Staff name must be at least 2 characters long');
    }
    if (name.trim().length > 100) {
      throw new BadRequestException('Staff name cannot exceed 100 characters');
    }
    if (!Object.values(StaffRole).includes(role)) {
      throw new BadRequestException('Invalid staff role');
    }
    if (employeeId && employeeId.trim().length > 50) {
      throw new BadRequestException('Employee ID cannot exceed 50 characters');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    // Check for duplicate employee ID if provided
    if (employeeId && employeeId.trim()) {
      const existingStaff = await this.staffRepo.findOne({
        where: { club: { id: clubId }, employeeId: employeeId.trim() }
      });
      if (existingStaff) {
        throw new ConflictException(`Staff with employee ID "${employeeId.trim()}" already exists in this club`);
      }
    }

    const staff = this.staffRepo.create({
      name: name.trim(),
      role,
      employeeId: employeeId?.trim() || null,
      status: StaffStatus.ACTIVE,
      club
    });

    return this.staffRepo.save(staff);
  }

  async findAll(clubId: string) {
    return this.staffRepo.find({
      where: { club: { id: clubId } },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string, clubId: string) {
    const staff = await this.staffRepo.findOne({
      where: { id, club: { id: clubId } }
    });
    if (!staff) throw new NotFoundException('Staff not found');
    return staff;
  }

  async update(id: string, clubId: string, data: Partial<{ name: string; role: StaffRole; status: StaffStatus; employeeId: string }>) {
    const staff = await this.findOne(id, clubId);

    // Validate name if provided
    if (data.name !== undefined) {
      if (!data.name || !data.name.trim()) {
        throw new BadRequestException('Staff name cannot be empty');
      }
      if (data.name.trim().length < 2) {
        throw new BadRequestException('Staff name must be at least 2 characters long');
      }
      if (data.name.trim().length > 100) {
        throw new BadRequestException('Staff name cannot exceed 100 characters');
      }
      data.name = data.name.trim();
    }

    // Validate role if provided
    if (data.role !== undefined && !Object.values(StaffRole).includes(data.role)) {
      throw new BadRequestException('Invalid staff role');
    }

    // Validate status if provided
    if (data.status !== undefined && !Object.values(StaffStatus).includes(data.status)) {
      throw new BadRequestException('Invalid staff status');
    }

    // Check for duplicate employee ID if provided
    if (data.employeeId !== undefined) {
      if (data.employeeId && data.employeeId.trim().length > 50) {
        throw new BadRequestException('Employee ID cannot exceed 50 characters');
      }
      if (data.employeeId && data.employeeId.trim()) {
        const existingStaff = await this.staffRepo.findOne({
          where: { club: { id: clubId }, employeeId: data.employeeId.trim() }
        });
        if (existingStaff && existingStaff.id !== id) {
          throw new ConflictException(`Staff with employee ID "${data.employeeId.trim()}" already exists in this club`);
        }
        data.employeeId = data.employeeId.trim();
      } else {
        data.employeeId = undefined as any;
      }
    }

    Object.assign(staff, data);
    return this.staffRepo.save(staff);
  }

  async remove(id: string, clubId: string) {
    const staff = await this.findOne(id, clubId);
    await this.staffRepo.remove(staff);
  }
}

