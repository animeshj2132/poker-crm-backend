import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { AttendanceTracking, AttendanceStatus } from '../entities/attendance-tracking.entity';
import { Staff, StaffStatus } from '../entities/staff.entity';
import { LeaveApplication, LeaveStatus } from '../entities/leave-application.entity';
import { Shift } from '../entities/shift.entity';
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
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
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

  async getDailyRoster(clubId: string, date: string) {
    const targetDate = new Date(date);

    // Get all active staff
    const allStaff = await this.staffRepo.find({
      where: { club: { id: clubId }, status: StaffStatus.ACTIVE },
      order: { name: 'ASC' },
    });

    // Get shifts for this date
    const shifts = await this.shiftRepo.find({
      where: { clubId, shiftDate: targetDate },
      relations: ['staff'],
    });
    const shiftMap = new Map<string, Shift>();
    shifts.forEach(s => shiftMap.set(s.staffId, s));

    // Get existing attendance for this date
    const existingAttendance = await this.attendanceRepo.find({
      where: { club: { id: clubId }, date: targetDate },
      relations: ['staff'],
    });
    const attendanceMap = new Map<string, AttendanceTracking>();
    existingAttendance.forEach(a => attendanceMap.set(a.staff.id, a));

    // Get approved leaves covering this date
    const approvedLeaves = await this.leaveApplicationRepo.find({
      where: {
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(targetDate),
        endDate: MoreThanOrEqual(targetDate),
      },
    });
    const onLeaveStaffIds = new Set(approvedLeaves.map(l => l.staffId));

    return allStaff.map(staff => {
      const shift = shiftMap.get(staff.id);
      const attendance = attendanceMap.get(staff.id);
      const isOnLeave = onLeaveStaffIds.has(staff.id);

      return {
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        employeeId: staff.employeeId,
        hasShift: !!shift,
        isOffDay: shift?.isOffDay || false,
        shiftStartTime: shift?.shiftStartTime || null,
        shiftEndTime: shift?.shiftEndTime || null,
        alreadyLogged: !!attendance,
        attendanceId: attendance?.id || null,
        attendanceStatus: attendance?.status || null,
        loginTime: attendance?.loginTime || null,
        logoutTime: attendance?.logoutTime || null,
        isOnLeave,
      };
    });
  }

  async bulkCreateAttendance(clubId: string, entries: Array<{
    staffId: string;
    date: string;
    loginTime?: string;
    logoutTime?: string;
    useShiftTimes?: boolean;
  }>, userId: string) {
    const results: Array<{ staffId: string; success: boolean; message: string }> = [];
    const targetDate = new Date(entries[0]?.date || new Date().toISOString().split('T')[0]);

    // Pre-fetch all shifts for this date
    const staffIds = entries.map(e => e.staffId);
    const shifts = await this.shiftRepo.find({
      where: { clubId, shiftDate: targetDate, staffId: In(staffIds) },
    });
    const shiftMap = new Map<string, Shift>();
    shifts.forEach(s => shiftMap.set(s.staffId, s));

    // Pre-fetch existing attendance
    const existingAttendance = await this.attendanceRepo.find({
      where: { club: { id: clubId }, date: targetDate },
      relations: ['staff'],
    });
    const attendanceStaffIds = new Set(existingAttendance.map(a => a.staff.id));

    // Pre-fetch approved leaves
    const approvedLeaves = await this.leaveApplicationRepo.find({
      where: {
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(targetDate),
        endDate: MoreThanOrEqual(targetDate),
      },
    });
    const onLeaveStaffIds = new Set(approvedLeaves.map(l => l.staffId));

    const recordsToCreate: AttendanceTracking[] = [];

    for (const entry of entries) {
      const { staffId, date } = entry;

      // Skip already logged
      if (attendanceStaffIds.has(staffId)) {
        results.push({ staffId, success: false, message: 'Already has attendance record' });
        continue;
      }

      // Skip on leave
      if (onLeaveStaffIds.has(staffId)) {
        results.push({ staffId, success: false, message: 'Staff is on approved leave' });
        continue;
      }

      // Determine login/logout times
      let loginTime: Date;
      let logoutTime: Date;

      if (entry.useShiftTimes || (!entry.loginTime && !entry.logoutTime)) {
        const shift = shiftMap.get(staffId);
        if (!shift) {
          results.push({ staffId, success: false, message: 'No shift found and no custom times provided' });
          continue;
        }
        if (shift.isOffDay) {
          results.push({ staffId, success: false, message: 'Staff has an off day' });
          continue;
        }
        loginTime = new Date(shift.shiftStartTime);
        logoutTime = new Date(shift.shiftEndTime);
      } else {
        loginTime = new Date(entry.loginTime!);
        logoutTime = new Date(entry.logoutTime!);
      }

      if (logoutTime.getTime() <= loginTime.getTime()) {
        results.push({ staffId, success: false, message: 'Logout time must be after login time' });
        continue;
      }

      const diffMs = logoutTime.getTime() - loginTime.getTime();
      const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

      const staff = await this.staffRepo.findOne({ where: { id: staffId, club: { id: clubId } } });
      if (!staff) {
        results.push({ staffId, success: false, message: 'Staff not found' });
        continue;
      }

      const record = this.attendanceRepo.create({
        club: { id: clubId } as any,
        staff,
        loginTime,
        logoutTime,
        date: targetDate,
        totalHours,
        status: AttendanceStatus.COMPLETED,
        notes: null,
      });

      recordsToCreate.push(record);
      results.push({ staffId, success: true, message: 'Attendance created' });
    }

    if (recordsToCreate.length > 0) {
      await this.attendanceRepo.save(recordsToCreate);
    }

    return {
      total: entries.length,
      created: recordsToCreate.length,
      skipped: entries.length - recordsToCreate.length,
      results,
    };
  }
}

