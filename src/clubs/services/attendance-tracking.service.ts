import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { AttendanceTracking, AttendanceStatus } from '../entities/attendance-tracking.entity';
import { Staff, StaffStatus } from '../entities/staff.entity';
import { LeaveApplication, LeaveStatus } from '../entities/leave-application.entity';
import { Shift } from '../entities/shift.entity';
import { RosterTemplate } from '../entities/roster-template.entity';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { ActionCategory } from '../dto/create-audit-log.dto';
import { canOverrideAttendance } from '../../common/rbac/attendance-authority.util';
import { AuditLogsService } from './audit-logs.service';
import { UsersService } from '../../users/users.service';
import { UserClubRole } from '../../users/user-club-role.entity';
import { UserTenantRole } from '../../users/user-tenant-role.entity';
import { TenantRole } from '../../common/rbac/roles';

/** Wall-clock datetimes from the CRM are interpreted in this offset (club operations). */
const CLUB_TZ_OFFSET = '+05:30';

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
    @InjectRepository(RosterTemplate)
    private rosterTemplateRepo: Repository<RosterTemplate>,
    @InjectRepository(UserClubRole)
    private userClubRoleRepo: Repository<UserClubRole>,
    @InjectRepository(UserTenantRole)
    private userTenantRoleRepo: Repository<UserTenantRole>,
    private readonly auditLogsService: AuditLogsService,
    private readonly usersService: UsersService,
  ) {}

  private async resolveAttendanceActor(
    userId: string | undefined,
    clubId: string,
  ): Promise<{ staffEntityId?: string; staffName: string; staffRole: string }> {
    if (!userId?.trim()) {
      return { staffName: 'Unknown', staffRole: 'UNKNOWN' };
    }
    const uid = userId.trim();
    const user = await this.usersService.findById(uid);
    const name = user?.displayName || user?.email || uid;
    const staffLink = await this.staffRepo.findOne({
      where: { club: { id: clubId }, userId: uid },
    });
    let staffRole = 'USER';
    if (user?.isMasterAdmin) {
      staffRole = 'MASTER_ADMIN';
    } else {
      const tenantRs = await this.userTenantRoleRepo.find({
        where: { user: { id: uid } },
      });
      if (tenantRs.some((r) => r.role === TenantRole.SUPER_ADMIN)) {
        staffRole = 'TENANT_SUPER_ADMIN';
      } else {
        const clubRs = await this.userClubRoleRepo.find({
          where: { user: { id: uid }, club: { id: clubId } },
        });
        if (clubRs.length > 0) {
          staffRole = clubRs.map((r) => String(r.role)).join(', ');
        }
      }
    }
    return {
      staffEntityId: staffLink?.id,
      staffName: name,
      staffRole,
    };
  }

  private async logAttendanceAudit(params: {
    clubId: string;
    userId: string | undefined;
    actionType: string;
    description: string;
    targetId?: string;
    targetName?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const actor = await this.resolveAttendanceActor(params.userId, params.clubId);
      await this.auditLogsService.logAction({
        clubId: params.clubId,
        staffId: actor.staffEntityId,
        staffName: actor.staffName,
        staffRole: actor.staffRole,
        actionType: params.actionType,
        actionCategory: ActionCategory.STAFF_MANAGEMENT,
        description: params.description,
        targetType: 'attendance',
        targetId: params.targetId,
        targetName: params.targetName,
        metadata: params.metadata,
      });
    } catch (err) {
      console.error('Attendance audit log failed:', err);
    }
  }

  private todayYmdClub(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private assertAttendanceDateNotPastFuture(ymd: string): void {
    const today = this.todayYmdClub();
    if (ymd > today) {
      throw new BadRequestException('Cannot record attendance for a future date');
    }
  }

  /**
   * Parse "YYYY-MM-DDTHH:mm[:ss]" or ISO with Z as club wall time when no offset is present
   * (avoids Node interpreting naive strings as UTC).
   */
  /** Wall-clock time on calendar day ymd in club timezone → absolute Date. */
  private combineYmdTimeClubTz(ymd: string, time: string): Date {
    const parts = String(time || '').split(':');
    const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
    const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
    const s = String(parseInt(parts[2] || '0', 10)).padStart(2, '0');
    return new Date(`${ymd}T${h}:${m}:${s}${CLUB_TZ_OFFSET}`);
  }

  private addDaysToYmd(ymd: string, delta: number): string {
    const [y, mo, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d + delta));
    return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
  }

  private formatTimeClubTz(date: Date | string): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  private parseClubDateTimeInput(isoLike: string): Date {
    const s = String(isoLike).trim();
    const zMatch = s.match(
      /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/i,
    );
    if (zMatch) {
      const [, ymd, hh, mm, ss = '00', , tz] = zMatch;
      if (tz) {
        return new Date(s);
      }
      return new Date(`${ymd}T${hh}:${mm}:${ss}${CLUB_TZ_OFFSET}`);
    }
    return new Date(s);
  }

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

    return records.map((record) => ({
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
      overtimeHours: record.overtimeHours != null ? Number(record.overtimeHours) : 0,
      workedRosterOffDay: record.workedRosterOffDay || false,
      markedByTier: record.markedByTier ?? 0,
      lastEditReason: record.lastEditReason,
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

  async createAttendanceRecord(
    clubId: string,
    dto: CreateAttendanceDto,
    userId: string,
    markTier: number,
  ) {
    const dateYmd = String(dto.date).split('T')[0];
    this.assertAttendanceDateNotPastFuture(dateYmd);

    // Check if staff exists and belongs to club
    const staff = await this.staffRepo.findOne({
      where: { id: dto.staffId, club: { id: clubId } },
      relations: ['club'],
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found in this club');
    }

    const approvedLeave = await this.leaveApplicationRepo.findOne({
      where: {
        clubId,
        staffId: dto.staffId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(dateYmd as any),
        endDate: MoreThanOrEqual(dateYmd as any),
      },
    });

    if (approvedLeave) {
      throw new BadRequestException(
        `Cannot log attendance as staff member was on leave that day`
      );
    }

    const existingRecord = await this.attendanceRepo
      .createQueryBuilder('a')
      .innerJoin('a.staff', 'staff')
      .innerJoin('a.club', 'club')
      .where('staff.id = :staffId', { staffId: dto.staffId })
      .andWhere('club.id = :clubId', { clubId })
      .andWhere('a.date = :dateYmd', { dateYmd })
      .getOne();

    const loginTime = this.parseClubDateTimeInput(dto.loginTime);
    const logoutTime = this.parseClubDateTimeInput(dto.logoutTime);
    const date = dateYmd as unknown as Date;

    if (logoutTime.getTime() <= loginTime.getTime()) {
      throw new BadRequestException('Logout time must be after login time');
    }

    const diffMs = logoutTime.getTime() - loginTime.getTime();
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    const status = AttendanceStatus.COMPLETED;
    const overtimeHours = dto.overtimeHours != null ? Number(dto.overtimeHours) : 0;
    const workedRosterOffDay = Boolean(dto.workedRosterOffDay);

    if (existingRecord) {
      const prevTier = existingRecord.markedByTier ?? 0;
      if (!canOverrideAttendance(prevTier, markTier)) {
        throw new ForbiddenException(
          'Attendance was recorded by a higher-privilege user and cannot be overwritten.',
        );
      }
      existingRecord.loginTime = loginTime;
      existingRecord.logoutTime = logoutTime;
      existingRecord.totalHours = totalHours;
      existingRecord.status = status;
      existingRecord.notes = dto.notes != null ? dto.notes : existingRecord.notes;
      existingRecord.overtimeHours = String(overtimeHours) as any;
      existingRecord.workedRosterOffDay = workedRosterOffDay;
      existingRecord.markedByTier = markTier;
      existingRecord.markedByUserId = userId || null;
      existingRecord.lastEditedByUserId = userId || null;
      existingRecord.lastEditReason = dto.notes?.trim()
        ? `Updated via create: ${dto.notes.trim()}`
        : 'Attendance replaced by equal or higher-privilege user';
      const saved = await this.attendanceRepo.save(existingRecord);
      await this.logAttendanceAudit({
        clubId,
        userId,
        actionType: 'attendance_upsert',
        description: `Attendance saved/updated for ${staff.name} on ${dateYmd} (${totalHours}h, OT ${overtimeHours}h${workedRosterOffDay ? ', roster off-day work' : ''})`,
        targetId: saved.id,
        targetName: staff.name,
        metadata: {
          date: dateYmd,
          staffId: staff.id,
          totalHours,
          overtimeHours,
          workedRosterOffDay,
          replacedExisting: true,
        },
      });
      return this.formatAttendanceRecord(saved, staff);
    }

    const attendance = this.attendanceRepo.create({
      club: { id: clubId } as any,
      staff: staff,
      loginTime,
      logoutTime,
      date,
      totalHours,
      status,
      notes: dto.notes || null,
      overtimeHours: String(overtimeHours) as any,
      workedRosterOffDay,
      markedByTier: markTier,
      markedByUserId: userId || null,
      lastEditReason: null,
      lastEditedByUserId: null,
    });

    const saved = await this.attendanceRepo.save(attendance);
    await this.logAttendanceAudit({
      clubId,
      userId,
      actionType: 'attendance_created',
      description: `Attendance created for ${staff.name} on ${dateYmd} (${totalHours}h, OT ${overtimeHours}h${workedRosterOffDay ? ', roster off-day work' : ''})`,
      targetId: saved.id,
      targetName: staff.name,
      metadata: {
        date: dateYmd,
        staffId: staff.id,
        totalHours,
        overtimeHours,
        workedRosterOffDay,
      },
    });
    return this.formatAttendanceRecord(saved, staff);
  }

  private formatAttendanceRecord(saved: AttendanceTracking, staff: Staff) {
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
      overtimeHours: saved.overtimeHours != null ? Number(saved.overtimeHours) : 0,
      workedRosterOffDay: saved.workedRosterOffDay || false,
      markedByTier: saved.markedByTier ?? 0,
      lastEditReason: saved.lastEditReason,
    };
  }

  async updateAttendanceRecord(
    clubId: string,
    recordId: string,
    dto: UpdateAttendanceDto,
    userId: string,
    markTier: number,
  ) {
    const record = await this.attendanceRepo.findOne({
      where: { id: recordId },
      relations: ['club', 'staff'],
    });
    if (!record || record.club.id !== clubId) {
      throw new NotFoundException('Attendance record not found');
    }
    const prevTier = record.markedByTier ?? 0;
    if (!canOverrideAttendance(prevTier, markTier)) {
      throw new ForbiddenException(
        'Cannot edit attendance recorded by a higher-privilege user.',
      );
    }

    let loginTime: Date = record.loginTime;
    let logoutTime: Date = record.logoutTime as Date;
    if (dto.loginTime) loginTime = this.parseClubDateTimeInput(dto.loginTime);
    if (dto.logoutTime) logoutTime = this.parseClubDateTimeInput(dto.logoutTime);

    if (!loginTime || !logoutTime) {
      throw new BadRequestException('Login and logout times are required');
    }
    if (logoutTime.getTime() <= loginTime.getTime()) {
      throw new BadRequestException('Logout time must be after login time');
    }

    const diffMs = logoutTime.getTime() - loginTime.getTime();
    const totalHours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));

    record.loginTime = loginTime;
    record.logoutTime = logoutTime;
    record.totalHours = totalHours;
    if (dto.overtimeHours != null) {
      record.overtimeHours = String(dto.overtimeHours) as any;
    }
    if (dto.notes !== undefined) record.notes = dto.notes;
    record.lastEditedByUserId = userId || null;
    record.lastEditReason = dto.editReason.trim();
    record.markedByTier = markTier;
    record.markedByUserId = userId || null;

    const saved = await this.attendanceRepo.save(record);
    const ot = saved.overtimeHours != null ? Number(saved.overtimeHours) : 0;
    await this.logAttendanceAudit({
      clubId,
      userId,
      actionType: 'attendance_updated',
      description: `Attendance edited for ${record.staff.name}: ${dto.editReason.trim()} (OT ${ot}h)`,
      targetId: saved.id,
      targetName: record.staff.name,
      metadata: {
        editReason: dto.editReason.trim(),
        overtimeHours: dto.overtimeHours,
        staffId: record.staff.id,
      },
    });
    return this.formatAttendanceRecord(saved, record.staff);
  }

  async deleteAttendanceRecord(
    clubId: string,
    recordId: string,
    requesterTier: number,
    userId?: string,
  ) {
    const record = await this.attendanceRepo.findOne({
      where: { id: recordId },
      relations: ['club', 'staff'],
    });
    if (!record || record.club.id !== clubId) {
      throw new NotFoundException('Attendance record not found');
    }
    if (!canOverrideAttendance(record.markedByTier ?? 0, requesterTier)) {
      throw new ForbiddenException(
        'Cannot delete attendance recorded by a higher-privilege user.',
      );
    }
    const staffName = record.staff?.name || 'Staff';
    const dateYmd = String(record.date).split('T')[0];
    await this.attendanceRepo.remove(record);
    await this.logAttendanceAudit({
      clubId,
      userId,
      actionType: 'attendance_deleted',
      description: `Attendance deleted for ${staffName} (${dateYmd})`,
      targetId: recordId,
      targetName: staffName,
      metadata: { date: dateYmd, staffId: record.staff?.id },
    });
    return { success: true, id: recordId };
  }

  async bulkDeleteAttendanceRecords(
    clubId: string,
    recordIds: string[],
    requesterTier: number,
    userId?: string,
  ) {
    const ids = [...new Set((recordIds || []).map(String).filter(Boolean))];
    if (ids.length === 0) {
      throw new BadRequestException('No attendance record IDs provided');
    }
    const records = await this.attendanceRepo.find({
      where: { id: In(ids) },
      relations: ['club', 'staff'],
    });
    const inClub = records.filter((r) => r.club.id === clubId);
    const toRemove = inClub.filter((r) => canOverrideAttendance(r.markedByTier ?? 0, requesterTier));
    if (toRemove.length === 0) {
      throw new NotFoundException('No deletable attendance records for this club (check privileges)');
    }
    await this.attendanceRepo.remove(toRemove);
    const names = toRemove.map((r) => r.staff?.name || r.id).join(', ');
    await this.logAttendanceAudit({
      clubId,
      userId,
      actionType: 'attendance_bulk_deleted',
      description: `Bulk deleted ${toRemove.length} attendance record(s): ${names}`,
      metadata: {
        deletedIds: toRemove.map((r) => r.id),
        count: toRemove.length,
      },
    });
    return {
      success: true,
      deleted: toRemove.length,
      skipped: ids.length - toRemove.length,
    };
  }

  async getDailyRoster(clubId: string, date: string) {
    const dateYmd = String(date).split('T')[0];

    const allStaff = await this.staffRepo.find({
      where: { club: { id: clubId }, status: StaffStatus.ACTIVE },
      order: { name: 'ASC' },
    });

    const shifts = await this.shiftRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.staff', 'staff')
      .where('s.clubId = :clubId', { clubId })
      .andWhere('s.shiftDate = :dateYmd', { dateYmd })
      .getMany();
    const shiftMap = new Map<string, Shift>();
    shifts.forEach(s => shiftMap.set(s.staffId, s));

    // Fetch roster templates for authoritative shift time strings
    const templates = await this.rosterTemplateRepo.find({
      where: { clubId, isActive: true },
    });
    const templateMap = new Map<string, RosterTemplate>();
    templates.forEach(t => templateMap.set(t.staffId, t));

    const existingAttendance = await this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.staff', 'staff')
      .innerJoin('a.club', 'club')
      .where('club.id = :clubId', { clubId })
      .andWhere('a.date = :dateYmd', { dateYmd })
      .getMany();
    const attendanceMap = new Map<string, AttendanceTracking>();
    existingAttendance.forEach(a => attendanceMap.set(a.staff.id, a));

    const approvedLeaves = await this.leaveApplicationRepo.find({
      where: {
        clubId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(dateYmd as any),
        endDate: MoreThanOrEqual(dateYmd as any),
      },
    });
    const onLeaveStaffIds = new Set(approvedLeaves.map(l => l.staffId));

    return allStaff.map(staff => {
      const shift = shiftMap.get(staff.id);
      const attendance = attendanceMap.get(staff.id);
      const isOnLeave = onLeaveStaffIds.has(staff.id);
      const template = templateMap.get(staff.id);

      // Use template time strings for display (always correct), fall back to DB timestamps
      let shiftStartDisplay: string | null = null;
      let shiftEndDisplay: string | null = null;
      if (template && shift && !shift.isOffDay) {
        shiftStartDisplay = String(template.defaultShiftStartTime).slice(0, 5);
        shiftEndDisplay = String(template.defaultShiftEndTime).slice(0, 5);
      } else if (template && shift && shift.isOffDay) {
        // Template wall times still apply when HR marks an extra work day on a roster off day
        shiftStartDisplay = String(template.defaultShiftStartTime).slice(0, 5);
        shiftEndDisplay = String(template.defaultShiftEndTime).slice(0, 5);
      } else if (shift && !shift.isOffDay) {
        shiftStartDisplay = this.formatTimeClubTz(shift.shiftStartTime);
        shiftEndDisplay = this.formatTimeClubTz(shift.shiftEndTime);
      }

      // For attendance records, format with correct timezone
      let loginDisplay: string | null = null;
      let logoutDisplay: string | null = null;
      if (attendance?.loginTime) {
        loginDisplay = this.formatTimeClubTz(attendance.loginTime);
      }
      if (attendance?.logoutTime) {
        logoutDisplay = this.formatTimeClubTz(attendance.logoutTime);
      }

      return {
        staffId: staff.id,
        staffName: staff.name,
        staffRole: staff.role,
        employeeId: staff.employeeId,
        hasShift: !!shift,
        isOffDay: shift?.isOffDay || false,
        shiftStartTime: shift?.shiftStartTime || null,
        shiftEndTime: shift?.shiftEndTime || null,
        shiftStartDisplay,
        shiftEndDisplay,
        shiftCrossesMidnight: template?.shiftCrossesMidnight || false,
        alreadyLogged: !!attendance,
        attendanceId: attendance?.id || null,
        attendanceStatus: attendance?.status || null,
        loginTime: attendance?.loginTime || null,
        logoutTime: attendance?.logoutTime || null,
        loginDisplay,
        logoutDisplay,
        attendanceOvertimeHours: attendance
          ? Number(attendance.overtimeHours ?? 0)
          : null,
        attendanceWorkedRosterOffDay: attendance?.workedRosterOffDay || false,
        isOnLeave,
      };
    });
  }

  async bulkCreateAttendance(
    clubId: string,
    entries: Array<{
      staffId: string;
      date: string;
      loginTime?: string;
      logoutTime?: string;
      useShiftTimes?: boolean;
      overtimeHours?: number;
      workedRosterOffDay?: boolean;
    }>,
    userId: string,
    allowOffDayExtraAttendance = false,
    markTier = 0,
  ) {
    const results: Array<{ staffId: string; success: boolean; message: string }> = [];
    const dateYmd = String(entries[0]?.date || this.todayYmdClub()).split('T')[0];
    this.assertAttendanceDateNotPastFuture(dateYmd);

    const staffIds = [...new Set(entries.map((e) => e.staffId))];
    const shifts =
      staffIds.length === 0
        ? []
        : await this.shiftRepo
            .createQueryBuilder('s')
            .where('s.clubId = :clubId', { clubId })
            .andWhere('s.shiftDate = :dateYmd', { dateYmd })
            .andWhere('s.staffId IN (:...staffIds)', { staffIds })
            .getMany();
    const shiftMap = new Map<string, Shift>();
    shifts.forEach((s) => shiftMap.set(s.staffId, s));

    const templates = await this.rosterTemplateRepo.find({
      where: { clubId, isActive: true },
    });
    const templateMap = new Map<string, RosterTemplate>();
    templates.forEach((t) => templateMap.set(t.staffId, t));

    const existingAttendance = await this.attendanceRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.staff', 'staff')
      .innerJoin('a.club', 'club')
      .where('club.id = :clubId', { clubId })
      .andWhere('a.date = :dateYmd', { dateYmd })
      .getMany();
    const existingByStaff = new Map<string, AttendanceTracking>();
    existingAttendance.forEach((a) => existingByStaff.set(a.staff.id, a));

    const approvedLeaves = await this.leaveApplicationRepo.find({
      where: {
        clubId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(dateYmd as any),
        endDate: MoreThanOrEqual(dateYmd as any),
      },
    });
    const onLeaveStaffIds = new Set(approvedLeaves.map((l) => l.staffId));

    const recordsToSave: AttendanceTracking[] = [];

    for (const entry of entries) {
      const { staffId } = entry;
      const entryYmd = String(entry.date || dateYmd).split('T')[0];
      if (entryYmd !== dateYmd) {
        results.push({ staffId, success: false, message: 'All entries must use the same date' });
        continue;
      }

      const existingRec = existingByStaff.get(staffId);
      if (existingRec) {
        if (!canOverrideAttendance(existingRec.markedByTier ?? 0, markTier)) {
          results.push({
            staffId,
            success: false,
            message: 'Already recorded by a higher-privilege user',
          });
          continue;
        }
      }

      if (onLeaveStaffIds.has(staffId)) {
        results.push({ staffId, success: false, message: 'Staff is on approved leave' });
        continue;
      }

      let loginTime: Date;
      let logoutTime: Date;

      const offDayWorkAllowed =
        Boolean(allowOffDayExtraAttendance) || Boolean(entry.workedRosterOffDay);

      if (entry.useShiftTimes || (!entry.loginTime && !entry.logoutTime)) {
        const shift = shiftMap.get(staffId);
        if (!shift) {
          results.push({ staffId, success: false, message: 'No shift found and no custom times provided' });
          continue;
        }
        if (shift.isOffDay && !offDayWorkAllowed) {
          results.push({ staffId, success: false, message: 'Staff has an off day' });
          continue;
        }
        const template = templateMap.get(staffId);
        if (template) {
          loginTime = this.combineYmdTimeClubTz(dateYmd, template.defaultShiftStartTime);
          if (template.shiftCrossesMidnight) {
            logoutTime = this.combineYmdTimeClubTz(this.addDaysToYmd(dateYmd, 1), template.defaultShiftEndTime);
          } else {
            logoutTime = this.combineYmdTimeClubTz(dateYmd, template.defaultShiftEndTime);
          }
        } else if (shift.isOffDay) {
          results.push({
            staffId,
            success: false,
            message: 'No roster template for this staff; cannot set times on an off day',
          });
          continue;
        } else {
          loginTime = new Date(shift.shiftStartTime);
          logoutTime = new Date(shift.shiftEndTime);
        }
      } else {
        const shift = shiftMap.get(staffId);
        if (shift?.isOffDay && !offDayWorkAllowed) {
          results.push({ staffId, success: false, message: 'Staff has an off day' });
          continue;
        }
        loginTime = this.parseClubDateTimeInput(entry.loginTime!);
        logoutTime = this.parseClubDateTimeInput(entry.logoutTime!);
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

      const shiftForFlag = shiftMap.get(staffId);
      const workedRosterOffDay =
        Boolean(shiftForFlag?.isOffDay) &&
        (Boolean(entry.workedRosterOffDay) || Boolean(allowOffDayExtraAttendance));
      const overtimeVal = entry.overtimeHours != null ? Number(entry.overtimeHours) : 0;

      if (existingRec) {
        existingRec.loginTime = loginTime;
        existingRec.logoutTime = logoutTime;
        existingRec.totalHours = totalHours;
        existingRec.status = AttendanceStatus.COMPLETED;
        existingRec.overtimeHours = String(overtimeVal) as any;
        existingRec.workedRosterOffDay = workedRosterOffDay;
        existingRec.markedByTier = markTier;
        existingRec.markedByUserId = userId || null;
        existingRec.lastEditedByUserId = userId || null;
        existingRec.lastEditReason = 'Bulk attendance save';
        recordsToSave.push(existingRec);
        results.push({ staffId, success: true, message: 'Attendance updated' });
      } else {
        const record = this.attendanceRepo.create({
          club: { id: clubId } as any,
          staff,
          loginTime,
          logoutTime,
          date: dateYmd as unknown as Date,
          totalHours,
          status: AttendanceStatus.COMPLETED,
          notes: null,
          overtimeHours: String(overtimeVal) as any,
          workedRosterOffDay,
          markedByTier: markTier,
          markedByUserId: userId || null,
          lastEditReason: null,
          lastEditedByUserId: null,
        });
        recordsToSave.push(record);
        results.push({ staffId, success: true, message: 'Attendance created' });
      }
    }

    if (recordsToSave.length > 0) {
      await this.attendanceRepo.save(recordsToSave);
    }

    const ok = results.filter((r) => r.success).length;
    if (ok > 0) {
      const successStaffIds = results.filter((r) => r.success).map((r) => r.staffId);
      await this.logAttendanceAudit({
        clubId,
        userId,
        actionType: 'attendance_bulk_saved',
        description: `Bulk attendance: ${ok} record(s) for ${dateYmd}`,
        metadata: {
          date: dateYmd,
          staffIds: successStaffIds,
          totalEntries: entries.length,
          skipped: entries.length - ok,
        },
      });
    }
    return {
      total: entries.length,
      created: ok,
      skipped: entries.length - ok,
      results,
    };
  }
}

