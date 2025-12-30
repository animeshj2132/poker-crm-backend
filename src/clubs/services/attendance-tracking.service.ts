import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AttendanceTracking, AttendanceStatus } from '../entities/attendance-tracking.entity';
import { Staff } from '../entities/staff.entity';
import { LeaveApplication, LeaveStatus } from '../entities/leave-application.entity';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';

@Injectable()
export class AttendanceTrackingService {
  constructor(
    @InjectRepository(AttendanceTracking)
    private attendanceRepo: Repository<AttendanceTracking>,
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    @InjectRepository(LeaveApplication)
    private leaveApplicationRepo: Repository<LeaveApplication>,
  ) {}

  async getAttendanceRecords(
    clubId: string,
    startDate?: string,
    endDate?: string,
    staffId?: string
  ) {
    const query = this.attendanceRepo
      .createQueryBuilder('attendance')
      .leftJoinAndSelect('attendance.staff', 'staff')
      .leftJoinAndSelect('attendance.club', 'club')
      .where('attendance.club.id = :clubId', { clubId })
      .orderBy('attendance.date', 'DESC')
      .addOrderBy('attendance.loginTime', 'DESC');

    if (startDate && endDate) {
      query.andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('attendance.date >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('attendance.date <= :endDate', { endDate });
    }

    if (staffId) {
      query.andWhere('attendance.staff.id = :staffId', { staffId });
    }

    const records = await query.getMany();

    return records.map(record => ({
      id: record.id,
      staffId: record.staff.id,
      staffName: record.staff.name,
      staffEmail: record.staff.email,
      staffRole: record.staff.role,
      employeeId: record.staff.employeeId,
      loginTime: record.loginTime,
      logoutTime: record.logoutTime,
      date: record.date,
      totalHours: record.totalHours ? Number(record.totalHours) : null,
      status: record.status,
      notes: record.notes,
    }));
  }

  async getAttendanceByStaff(clubId: string, staffId: string, startDate?: string, endDate?: string) {
    return this.getAttendanceRecords(clubId, startDate, endDate, staffId);
  }

  async getAttendanceStats(clubId: string, startDate?: string, endDate?: string) {
    const records = await this.getAttendanceRecords(clubId, startDate, endDate);
    
    const totalRecords = records.length;
    const activeSessions = records.filter(r => r.status === AttendanceStatus.ACTIVE).length;
    const completedSessions = records.filter(r => r.status === AttendanceStatus.COMPLETED).length;
    const totalHours = records
      .filter(r => r.totalHours !== null)
      .reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHours = completedSessions > 0 ? totalHours / completedSessions : 0;

    return {
      totalRecords,
      activeSessions,
      completedSessions,
      incompleteSessions: totalRecords - activeSessions - completedSessions,
      totalHours: totalHours.toFixed(2),
      avgHours: avgHours.toFixed(2),
    };
  }

  async createAttendanceRecord(clubId: string, dto: CreateAttendanceDto, userId: string) {
    // Check if staff exists and belongs to club
    const staff = await this.staffRepo.findOne({
      where: { id: dto.staffId, club: { id: clubId } },
      relations: ['club'],
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found in this club');
    }

    // Check if staff has an approved leave for this date
    const attendanceDate = new Date(dto.date);
    const approvedLeave = await this.leaveApplicationRepo.findOne({
      where: {
        staffId: dto.staffId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(attendanceDate),
        endDate: MoreThanOrEqual(attendanceDate),
      },
    });

    if (approvedLeave) {
      throw new BadRequestException(
        `Cannot log attendance as staff member was on leave that day`
      );
    }

    // Check if attendance record already exists for this date
    const existingRecord = await this.attendanceRepo.findOne({
      where: {
        staff: { id: dto.staffId },
        date: new Date(dto.date),
      },
    });

    if (existingRecord) {
      throw new BadRequestException('Attendance record already exists for this date');
    }

    // Parse dates
    const loginTime = new Date(dto.loginTime);
    const date = new Date(dto.date);
    const logoutTime = new Date(dto.logoutTime);

    // Validate logout time is after login time
    if (logoutTime.getTime() <= loginTime.getTime()) {
      throw new BadRequestException('Logout time must be after login time');
    }

    // Calculate total hours
    const diffMs = logoutTime.getTime() - loginTime.getTime();
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    const status = AttendanceStatus.COMPLETED;

    // Create attendance record
    const attendance = this.attendanceRepo.create({
      club: { id: clubId } as any,
      staff: staff,
      loginTime,
      logoutTime,
      date,
      totalHours,
      status,
      notes: dto.notes || null,
    });

    const saved = await this.attendanceRepo.save(attendance);

    return {
      id: saved.id,
      staffId: staff.id,
      staffName: staff.name,
      staffEmail: staff.email,
      staffRole: staff.role,
      employeeId: staff.employeeId,
      loginTime: saved.loginTime,
      logoutTime: saved.logoutTime,
      date: saved.date,
      totalHours: saved.totalHours ? Number(saved.totalHours) : null,
      status: saved.status,
      notes: saved.notes,
    };
  }
}

