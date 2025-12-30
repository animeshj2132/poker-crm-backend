import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { LeavePolicy } from '../entities/leave-policy.entity';
import { LeaveApplication, LeaveStatus } from '../entities/leave-application.entity';
import { Staff, StaffRole } from '../entities/staff.entity';
import { CreateLeavePolicyDto } from '../dto/create-leave-policy.dto';
import { UpdateLeavePolicyDto } from '../dto/update-leave-policy.dto';
import { CreateLeaveApplicationDto } from '../dto/create-leave-application.dto';
import { ApproveRejectLeaveDto } from '../dto/approve-reject-leave.dto';

@Injectable()
export class LeaveManagementService {
  constructor(
    @InjectRepository(LeavePolicy)
    private readonly leavePolicyRepo: Repository<LeavePolicy>,
    @InjectRepository(LeaveApplication)
    private readonly leaveApplicationRepo: Repository<LeaveApplication>,
    @InjectRepository(Staff)
    private readonly staffRepo: Repository<Staff>
  ) {}

  // ========== Leave Policy Management ==========

  async createLeavePolicy(clubId: string, dto: CreateLeavePolicyDto, createdBy: string) {
    // Check if policy already exists for this role
    const existing = await this.leavePolicyRepo.findOne({
      where: { clubId, role: dto.role }
    });

    if (existing) {
      throw new BadRequestException(`Leave policy already exists for role: ${dto.role}`);
    }

    const policy = this.leavePolicyRepo.create({
      clubId,
      role: dto.role,
      leavesPerYear: dto.leavesPerYear,
      createdBy
    });

    return this.leavePolicyRepo.save(policy);
  }

  async getLeavePolicies(clubId: string) {
    return this.leavePolicyRepo.find({
      where: { clubId },
      order: { role: 'ASC' }
    });
  }

  async getLeavePolicyByRole(clubId: string, role: StaffRole) {
    return this.leavePolicyRepo.findOne({
      where: { clubId, role }
    });
  }

  async updateLeavePolicy(clubId: string, role: StaffRole, dto: UpdateLeavePolicyDto, updatedBy: string) {
    const policy = await this.leavePolicyRepo.findOne({
      where: { clubId, role }
    });

    if (!policy) {
      throw new NotFoundException(`Leave policy not found for role: ${role}`);
    }

    if (dto.leavesPerYear !== undefined) {
      policy.leavesPerYear = dto.leavesPerYear;
    }
    policy.updatedBy = updatedBy;

    return this.leavePolicyRepo.save(policy);
  }

  async deleteLeavePolicy(clubId: string, role: StaffRole) {
    const policy = await this.leavePolicyRepo.findOne({
      where: { clubId, role }
    });

    if (!policy) {
      throw new NotFoundException(`Leave policy not found for role: ${role}`);
    }

    await this.leavePolicyRepo.remove(policy);
  }

  // ========== Leave Application Management ==========

  async createLeaveApplication(
    clubId: string,
    staffId: string,
    dto: CreateLeaveApplicationDto
  ) {
    // Verify staff exists and belongs to club
    const staff = await this.staffRepo.findOne({
      where: { id: staffId, club: { id: clubId } }
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Check if staff role is Affiliate (not allowed)
    if (staff.role === StaffRole.AFFILIATE) {
      throw new BadRequestException('Affiliates cannot apply for leaves');
    }

    // Parse dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // Validate dates
    if (startDate > endDate) {
      throw new BadRequestException('Start date cannot be after end date');
    }

    if (startDate < new Date(new Date().setHours(0, 0, 0, 0))) {
      throw new BadRequestException('Start date cannot be in the past');
    }

    // Calculate number of days (excluding weekends)
    const numberOfDays = this.calculateWorkingDays(startDate, endDate);

    if (numberOfDays <= 0) {
      throw new BadRequestException('Invalid date range');
    }

    // Check if there's an overlapping leave application
    const overlapping = await this.leaveApplicationRepo.findOne({
      where: {
        staffId,
        status: LeaveStatus.PENDING,
        startDate: Between(startDate, endDate)
      }
    });

    if (overlapping) {
      throw new BadRequestException('You already have a pending leave application for this period');
    }

    // Get leave policy for this role
    const policy = await this.getLeavePolicyByRole(clubId, staff.role);
    if (!policy) {
      throw new BadRequestException(`Leave policy not configured for role: ${staff.role}`);
    }

    // Calculate remaining leaves for current year
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const approvedLeaves = await this.leaveApplicationRepo.find({
      where: {
        staffId,
        status: LeaveStatus.APPROVED,
        startDate: Between(yearStart, yearEnd)
      }
    });

    const usedLeaves = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);
    const remainingLeaves = policy.leavesPerYear - usedLeaves;

    if (numberOfDays > remainingLeaves) {
      throw new BadRequestException(
        `Insufficient leave balance. Available: ${remainingLeaves} days, Requested: ${numberOfDays} days`
      );
    }

    // Create leave application
    const application = this.leaveApplicationRepo.create({
      clubId,
      staffId,
      startDate,
      endDate,
      numberOfDays,
      reason: dto.reason,
      status: LeaveStatus.PENDING
    });

    return this.leaveApplicationRepo.save(application);
  }

  async getStaffLeaveApplications(
    clubId: string,
    staffId: string,
    filters?: {
      status?: LeaveStatus;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }
  ) {
    // Verify staff belongs to club
    const staff = await this.staffRepo.findOne({
      where: { id: staffId, club: { id: clubId } }
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query
    let queryBuilder = this.leaveApplicationRepo.createQueryBuilder('application')
      .leftJoinAndSelect('application.staff', 'staff')
      .where('application.clubId = :clubId', { clubId })
      .andWhere('application.staffId = :staffId', { staffId });

    if (filters?.status) {
      queryBuilder = queryBuilder.andWhere('application.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      queryBuilder = queryBuilder.andWhere('application.startDate >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder = queryBuilder.andWhere('application.endDate <= :endDate', { endDate: filters.endDate });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination and ordering
    const applications = await queryBuilder
      .orderBy('application.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getPendingLeaveApplications(clubId: string, approverRole: StaffRole, approverId: string) {
    // Get all pending applications for this club
    const applications = await this.leaveApplicationRepo.find({
      where: {
        clubId,
        status: LeaveStatus.PENDING
      },
      relations: ['staff'],
      order: { createdAt: 'ASC' }
    });

    // Filter based on approver role:
    // - Super Admin, Admin, HR can approve regular staff (not Admin/HR)
    // - Only Super Admin can approve Admin/HR leaves
    return applications.filter(app => {
      const staffRole = app.staff.role;
      
      // If staff is Admin or HR, only Super Admin can approve
      if (staffRole === StaffRole.ADMIN || staffRole === StaffRole.HR) {
        return approverRole === StaffRole.SUPER_ADMIN;
      }
      
      // For other roles, Super Admin, Admin, or HR can approve
      return approverRole === StaffRole.SUPER_ADMIN || 
             approverRole === StaffRole.ADMIN || 
             approverRole === StaffRole.HR;
    });
  }

  async getLeaveApplicationsForApproval(
    clubId: string,
    approverRole: StaffRole,
    approverId: string,
    filters?: {
      status?: LeaveStatus;
      role?: StaffRole;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query conditions
    const whereConditions: any = { clubId };
    
    if (filters?.status) {
      whereConditions.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      whereConditions.startDate = filters.startDate ? MoreThanOrEqual(new Date(filters.startDate)) : undefined;
      if (filters.endDate) {
        whereConditions.endDate = LessThanOrEqual(new Date(filters.endDate));
      }
    }

    // Get all applications matching basic filters
    let queryBuilder = this.leaveApplicationRepo.createQueryBuilder('application')
      .leftJoinAndSelect('application.staff', 'staff')
      .where('application.clubId = :clubId', { clubId });

    if (filters?.status) {
      queryBuilder = queryBuilder.andWhere('application.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      queryBuilder = queryBuilder.andWhere('application.startDate >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder = queryBuilder.andWhere('application.endDate <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.role) {
      queryBuilder = queryBuilder.andWhere('staff.role = :role', { role: filters.role });
    }

    if (filters?.search) {
      queryBuilder = queryBuilder.andWhere(
        '(staff.name ILIKE :search OR staff.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    // Apply pagination and ordering
    const applications = await queryBuilder
      .orderBy('application.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Filter based on approver role (permission check):
    // - Super Admin, Admin, HR can approve regular staff (not Admin/HR)
    // - Only Super Admin can approve Admin/HR leaves
    const filteredApplications = applications.filter(app => {
      const staffRole = app.staff.role;
      
      // If staff is Admin or HR, only Super Admin can approve
      if (staffRole === StaffRole.ADMIN || staffRole === StaffRole.HR) {
        return approverRole === StaffRole.SUPER_ADMIN;
      }
      
      // For other roles, Super Admin, Admin, or HR can approve
      return approverRole === StaffRole.SUPER_ADMIN || 
             approverRole === StaffRole.ADMIN || 
             approverRole === StaffRole.HR;
    });

    // Get total count after permission filtering (need to count all matching records)
    const countQueryBuilder = this.leaveApplicationRepo.createQueryBuilder('application')
      .leftJoinAndSelect('application.staff', 'staff')
      .where('application.clubId = :clubId', { clubId });

    if (filters?.status) {
      countQueryBuilder.andWhere('application.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      countQueryBuilder.andWhere('application.startDate >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      countQueryBuilder.andWhere('application.endDate <= :endDate', { endDate: filters.endDate });
    }

    if (filters?.role) {
      countQueryBuilder.andWhere('staff.role = :role', { role: filters.role });
    }

    if (filters?.search) {
      countQueryBuilder.andWhere(
        '(staff.name ILIKE :search OR staff.email ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const allMatchingApplications = await countQueryBuilder.getMany();
    
    // Filter by permission
    const totalFiltered = allMatchingApplications.filter(app => {
      const staffRole = app.staff.role;
      if (staffRole === StaffRole.ADMIN || staffRole === StaffRole.HR) {
        return approverRole === StaffRole.SUPER_ADMIN;
      }
      return approverRole === StaffRole.SUPER_ADMIN || 
             approverRole === StaffRole.ADMIN || 
             approverRole === StaffRole.HR;
    }).length;

    return {
      applications: filteredApplications,
      total: totalFiltered,
      page,
      limit,
      totalPages: Math.ceil(totalFiltered / limit)
    };
  }

  async approveLeaveApplication(
    clubId: string,
    applicationId: string,
    approverId: string,
    approverRole: StaffRole
  ) {
    const application = await this.leaveApplicationRepo.findOne({
      where: { id: applicationId, clubId },
      relations: ['staff']
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave application is not pending');
    }

    // Check if approver has permission
    const staffRole = application.staff.role;
    if ((staffRole === StaffRole.ADMIN || staffRole === StaffRole.HR) && 
        approverRole !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can approve leaves for Admin and HR');
    }

    if (staffRole !== StaffRole.ADMIN && staffRole !== StaffRole.HR) {
      if (approverRole !== StaffRole.SUPER_ADMIN && 
          approverRole !== StaffRole.ADMIN && 
          approverRole !== StaffRole.HR) {
        throw new ForbiddenException('You do not have permission to approve leaves');
      }
    }

    application.status = LeaveStatus.APPROVED;
    application.approvedBy = approverId;
    application.approvedAt = new Date();

    return this.leaveApplicationRepo.save(application);
  }

  async rejectLeaveApplication(
    clubId: string,
    applicationId: string,
    approverId: string,
    approverRole: StaffRole,
    dto: ApproveRejectLeaveDto
  ) {
    const application = await this.leaveApplicationRepo.findOne({
      where: { id: applicationId, clubId },
      relations: ['staff']
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    if (application.status !== LeaveStatus.PENDING) {
      throw new BadRequestException('Leave application is not pending');
    }

    // Check if approver has permission (same as approve)
    const staffRole = application.staff.role;
    if ((staffRole === StaffRole.ADMIN || staffRole === StaffRole.HR) && 
        approverRole !== StaffRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can reject leaves for Admin and HR');
    }

    if (staffRole !== StaffRole.ADMIN && staffRole !== StaffRole.HR) {
      if (approverRole !== StaffRole.SUPER_ADMIN && 
          approverRole !== StaffRole.ADMIN && 
          approverRole !== StaffRole.HR) {
        throw new ForbiddenException('You do not have permission to reject leaves');
      }
    }

    application.status = LeaveStatus.REJECTED;
    application.rejectionReason = dto.rejectionReason || 'No reason provided';
    application.rejectedAt = new Date();

    return this.leaveApplicationRepo.save(application);
  }

  async getLeaveBalance(clubId: string, staffId: string) {
    const staff = await this.staffRepo.findOne({
      where: { id: staffId, club: { id: clubId } }
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    const policy = await this.getLeavePolicyByRole(clubId, staff.role);
    if (!policy) {
      return {
        totalLeaves: 0,
        usedLeaves: 0,
        remainingLeaves: 0
      };
    }

    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const approvedLeaves = await this.leaveApplicationRepo.find({
      where: {
        staffId,
        status: LeaveStatus.APPROVED,
        startDate: Between(yearStart, yearEnd)
      }
    });

    const usedLeaves = approvedLeaves.reduce((sum, leave) => sum + leave.numberOfDays, 0);
    const remainingLeaves = policy.leavesPerYear - usedLeaves;

    return {
      totalLeaves: policy.leavesPerYear,
      usedLeaves,
      remainingLeaves: Math.max(0, remainingLeaves)
    };
  }

  async cancelLeaveApplication(
    clubId: string,
    applicationId: string,
    staffId: string
  ) {
    const application = await this.leaveApplicationRepo.findOne({
      where: { id: applicationId, clubId },
      relations: ['staff']
    });

    if (!application) {
      throw new NotFoundException('Leave application not found');
    }

    // Verify the staff member owns this leave application
    if (application.staffId !== staffId) {
      throw new ForbiddenException('You can only cancel your own leave applications');
    }

    // Can cancel if status is PENDING, APPROVED, or REJECTED (not already CANCELLED)
    if (application.status === LeaveStatus.CANCELLED) {
      throw new BadRequestException('Leave application is already cancelled');
    }

    const previousStatus = application.status;
    application.status = LeaveStatus.CANCELLED;

    const savedApplication = await this.leaveApplicationRepo.save(application);
    
    // Return both the application and previous status for audit logging
    return { application: savedApplication, previousStatus };
  }

  // Helper method to calculate working days (excluding weekends)
  private calculateWorkingDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const dayOfWeek = current.getDay();
      // Exclude weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      current.setDate(current.getDate() + 1);
    }
    
    return count;
  }
}

