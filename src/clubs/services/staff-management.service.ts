import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Staff, StaffRole, StaffStatus } from '../entities/staff.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class StaffManagementService {
  constructor(
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  // Generate temporary password
  private generateTempPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }

  // Generate unique affiliate code
  private async generateAffiliateCode(clubId: string): Promise<string> {
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      // Generate 8-character alphanumeric code
      code = 'AFF' + crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 5);
      
      const existing = await this.staffRepo.findOne({
        where: { affiliateCode: code }
      });

      if (!existing) {
        return code;
      }

      attempts++;
    } while (attempts < maxAttempts);

    throw new BadRequestException('Failed to generate unique affiliate code. Please try again.');
  }

  // Create staff member
  async createStaff(clubId: string, data: {
    name: string;
    role: StaffRole;
    email: string;
    phone: string;
    employeeId?: string;
    aadharDocumentUrl?: string;
    panDocumentUrl?: string;
    customRoleName?: string;
  }, createdBy: string) {
    // Validate custom role
    if (data.role === StaffRole.STAFF && !data.customRoleName) {
      throw new BadRequestException('Custom role name is required when role is Staff');
    }

    // Check for duplicate email
    const existingEmail = await this.staffRepo.findOne({
      where: { email: data.email },
      relations: ['club']
    });
    if (existingEmail) {
      throw new ConflictException('Email address already in use');
    }

    // Check for duplicate phone
    const existingPhone = await this.staffRepo.findOne({
      where: { phone: data.phone },
      relations: ['club']
    });
    if (existingPhone) {
      throw new ConflictException('Phone number already in use');
    }

    // Check for duplicate employee ID if provided
    if (data.employeeId) {
      const existingEmployeeId = await this.staffRepo.findOne({
        where: { employeeId: data.employeeId },
        relations: ['club']
      });
      if (existingEmployeeId && existingEmployeeId.club.id === clubId) {
        throw new ConflictException('Employee ID already in use in this club');
      }
    }

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // Generate affiliate code if role is AFFILIATE
    let affiliateCode: string | null = null;
    if (data.role === StaffRole.AFFILIATE) {
      affiliateCode = await this.generateAffiliateCode(clubId);
    }

    // Create staff
    const staff = this.staffRepo.create({
      name: data.name,
      role: data.role,
      email: data.email,
      phone: data.phone,
      employeeId: data.employeeId || null,
      passwordHash,
      tempPassword: true,
      aadharDocumentUrl: data.aadharDocumentUrl || null,
      panDocumentUrl: data.panDocumentUrl || null,
      affiliateCode,
      customRoleName: data.customRoleName || null,
      status: StaffStatus.ACTIVE,
      club: { id: clubId } as any,
    });

    const savedStaff = await this.staffRepo.save(staff);

    // Return staff data with temporary password (only returned once)
    return {
      ...savedStaff,
      tempPasswordPlainText: tempPassword, // Only included in creation response
    };
  }

  // Get all staff for a club with filters
  async getAllStaff(clubId: string, filters?: {
    role?: StaffRole;
    status?: StaffStatus;
    search?: string;
    sortBy?: 'createdAt' | 'name' | 'role';
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const queryBuilder = this.staffRepo.createQueryBuilder('staff')
      .leftJoinAndSelect('staff.club', 'club')
      .where('club.id = :clubId', { clubId });

    // Apply filters
    if (filters?.role) {
      queryBuilder.andWhere('staff.role = :role', { role: filters.role });
    }

    if (filters?.status) {
      queryBuilder.andWhere('staff.status = :status', { status: filters.status });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(staff.name ILIKE :search OR staff.email ILIKE :search OR staff.phone ILIKE :search OR staff.employeeId ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Apply sorting
    const sortBy = filters?.sortBy || 'createdAt';
    const sortOrder = filters?.sortOrder || 'DESC';
    queryBuilder.orderBy(`staff.${sortBy}`, sortOrder);

    const staff = await queryBuilder.getMany();

    // Remove sensitive data using destructuring
    return staff.map(s => {
      const { passwordHash, ...staffWithoutPassword } = s;
      return staffWithoutPassword as Omit<Staff, 'passwordHash'>;
    });
  }

  // Get staff by ID (returns sanitized version without password)
  async getStaffById(clubId: string, staffId: string) {
    const staff = await this.staffRepo.findOne({
      where: { id: staffId },
      relations: ['club']
    });

    if (!staff || staff.club.id !== clubId) {
      throw new NotFoundException('Staff member not found');
    }

    // Remove sensitive data using destructuring
    const { passwordHash, ...staffWithoutPassword } = staff;
    return staffWithoutPassword as Omit<Staff, 'passwordHash'>;
  }

  // Get staff entity by ID (for internal operations)
  private async getStaffEntity(clubId: string, staffId: string): Promise<Staff> {
    const staff = await this.staffRepo.findOne({
      where: { id: staffId },
      relations: ['club']
    });

    if (!staff || staff.club.id !== clubId) {
      throw new NotFoundException('Staff member not found');
    }

    return staff;
  }

  // Update staff
  async updateStaff(clubId: string, staffId: string, data: Partial<{
    name: string;
    email: string;
    phone: string;
    employeeId: string;
    aadharDocumentUrl: string;
    panDocumentUrl: string;
    customRoleName: string;
  }>) {
    const staff = await this.getStaffEntity(clubId, staffId);

    // Check for duplicate email if changing
    if (data.email && data.email !== staff.email) {
      const existingEmail = await this.staffRepo.findOne({
        where: { email: data.email }
      });
      if (existingEmail && existingEmail.id !== staffId) {
        throw new ConflictException('Email address already in use');
      }
    }

    // Check for duplicate phone if changing
    if (data.phone && data.phone !== staff.phone) {
      const existingPhone = await this.staffRepo.findOne({
        where: { phone: data.phone }
      });
      if (existingPhone && existingPhone.id !== staffId) {
        throw new ConflictException('Phone number already in use');
      }
    }

    // Update staff
    Object.assign(staff, data);
    const updated = await this.staffRepo.save(staff);

    // Remove sensitive data using destructuring
    const { passwordHash, ...staffWithoutPassword } = updated;
    return staffWithoutPassword as Omit<Staff, 'passwordHash'>;
  }

  // Suspend staff
  async suspendStaff(clubId: string, staffId: string, reason: string, suspendedBy: string) {
    const staff = await this.getStaffEntity(clubId, staffId);

    if (staff.status === StaffStatus.SUSPENDED) {
      throw new BadRequestException('Staff member is already suspended');
    }

    staff.status = StaffStatus.SUSPENDED;
    staff.suspendedReason = reason;
    staff.suspendedAt = new Date();
    staff.suspendedBy = suspendedBy;

    const updated = await this.staffRepo.save(staff);

    // Remove sensitive data using destructuring
    const { passwordHash, ...staffWithoutPassword } = updated;
    return staffWithoutPassword as Omit<Staff, 'passwordHash'>;
  }

  // Reactivate staff
  async reactivateStaff(clubId: string, staffId: string) {
    const staff = await this.getStaffEntity(clubId, staffId);

    if (staff.status !== StaffStatus.SUSPENDED) {
      throw new BadRequestException('Staff member is not suspended');
    }

    staff.status = StaffStatus.ACTIVE;
    staff.suspendedReason = null;
    staff.suspendedAt = null;
    staff.suspendedBy = null;

    const updated = await this.staffRepo.save(staff);

    // Remove sensitive data using destructuring
    const { passwordHash, ...staffWithoutPassword } = updated;
    return staffWithoutPassword as Omit<Staff, 'passwordHash'>;
  }

  // Delete staff
  async deleteStaff(clubId: string, staffId: string) {
    const staff = await this.getStaffEntity(clubId, staffId);
    await this.staffRepo.remove(staff);
    return { message: 'Staff member deleted successfully' };
  }

  // Reset password (generates new temp password)
  async resetStaffPassword(clubId: string, staffId: string) {
    const staff = await this.getStaffEntity(clubId, staffId);

    const tempPassword = this.generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    staff.passwordHash = passwordHash;
    staff.tempPassword = true;

    await this.staffRepo.save(staff);

    return {
      message: 'Password reset successfully',
      tempPassword, // Return to admin to share with staff
    };
  }
}

