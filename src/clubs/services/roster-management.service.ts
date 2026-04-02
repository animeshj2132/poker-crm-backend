import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { RosterTemplate } from '../entities/roster-template.entity';
import { Shift } from '../entities/shift.entity';
import { Staff, StaffStatus } from '../entities/staff.entity';
import { LeaveApplication, LeaveStatus } from '../entities/leave-application.entity';
import { CreateRosterTemplateDto } from '../dto/create-roster-template.dto';
import { UpdateRosterTemplateDto } from '../dto/update-roster-template.dto';
import { GenerateRosterDto, RosterPeriodType } from '../dto/generate-roster.dto';

/** Club operations timezone: shift wall times in templates are interpreted in this zone. */
const ROSTER_TZ_OFFSET = '+05:30';

@Injectable()
export class RosterManagementService {
  constructor(
    @InjectRepository(RosterTemplate)
    private rosterTemplateRepo: Repository<RosterTemplate>,
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    @InjectRepository(LeaveApplication)
    private leaveApplicationRepo: Repository<LeaveApplication>,
  ) {}

  /** Calendar YYYY-MM-DD from a stored shift date (timezone-safe for roster grid). */
  private ymdFromStoredShiftDate(d: Date | string): string {
    if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) {
      return d.slice(0, 10);
    }
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(d as Date));
  }

  /** Add calendar days to YYYY-MM-DD (no server-local timezone drift). */
  private addDaysToYmd(ymd: string, delta: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + delta));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  private endYmdForPeriod(startYmd: string, periodType: RosterPeriodType): string {
    if (periodType === RosterPeriodType.WEEKLY) {
      return this.addDaysToYmd(startYmd, 6);
    }
    const [y, m] = startYmd.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0));
    const yy = last.getUTCFullYear();
    const mm = String(last.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(last.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  /** Use noon in club TZ for DATE column to avoid UTC midnight rolling the calendar day. */
  private dateOnlyNoonClubTz(ymd: string): Date {
    return new Date(`${ymd}T12:00:00${ROSTER_TZ_OFFSET}`);
  }

  private normalizeTimeToHhMmSs(time: string): string {
    const parts = String(time || '').split(':');
    const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
    const min = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
    const secPart = (parts[2] || '00').replace(/\D/g, '').slice(0, 2) || '00';
    const s = String(parseInt(secPart, 10)).padStart(2, '0');
    return `${h}:${min}:${s}`;
  }

  /** Wall-clock time on calendar day ymd in club timezone → absolute Date. */
  private combineYmdTimeClubTz(ymd: string, time: string): Date {
    const t = this.normalizeTimeToHhMmSs(time);
    return new Date(`${ymd}T${t}${ROSTER_TZ_OFFSET}`);
  }

  private dayOfWeekFromYmd(ymd: string): number {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  }

  // ==================== ROSTER TEMPLATE MANAGEMENT ====================

  /**
   * Create or update a roster template for a staff member
   */
  async createOrUpdateTemplate(
    clubId: string,
    createRosterTemplateDto: CreateRosterTemplateDto,
    userId?: string,
  ) {
    // Verify staff exists and belongs to the club
    const staff = await this.staffRepo.findOne({
      where: { id: createRosterTemplateDto.staffId, club: { id: clubId } },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // If trying to set as active, ensure no other active template exists for this staff
    if (createRosterTemplateDto.isActive !== false) {
      const activeTemplate = await this.rosterTemplateRepo.findOne({
        where: { clubId, staffId: createRosterTemplateDto.staffId, isActive: true },
      });

      if (activeTemplate) {
        throw new ConflictException('Staff member already has an active roster template. Please deactivate it first.');
      }
    }

    // Check if template already exists
    const existingTemplate = await this.rosterTemplateRepo.findOne({
      where: { clubId, staffId: createRosterTemplateDto.staffId },
    });

    if (existingTemplate) {
      // Update existing template
      Object.assign(existingTemplate, {
        ...createRosterTemplateDto,
        updatedBy: userId,
      });
      return await this.rosterTemplateRepo.save(existingTemplate);
    } else {
      // Create new template
      const template = this.rosterTemplateRepo.create({
        ...createRosterTemplateDto,
        clubId,
        createdBy: userId,
      });
      return await this.rosterTemplateRepo.save(template);
    }
  }

  /**
   * Get all roster templates for a club
   */
  async getAllTemplates(clubId: string, includeInactive: boolean = false) {
    const where: any = { clubId };
    if (!includeInactive) {
      where.isActive = true;
    }

    return await this.rosterTemplateRepo.find({
      where,
      relations: ['staff'],
      order: { staffName: 'ASC' },
    });
  }

  /**
   * Get roster template for a specific staff member
   */
  async getTemplateByStaffId(clubId: string, staffId: string) {
    const template = await this.rosterTemplateRepo.findOne({
      where: { clubId, staffId },
      relations: ['staff'],
    });

    if (!template) {
      throw new NotFoundException('Roster template not found for this staff member');
    }

    return template;
  }

  /**
   * Get roster template by template ID
   */
  async getTemplateById(clubId: string, templateId: string) {
    const template = await this.rosterTemplateRepo.findOne({
      where: { clubId, id: templateId },
      relations: ['staff'],
    });

    if (!template) {
      throw new NotFoundException('Roster template not found');
    }

    return template;
  }

  /**
   * Update a roster template
   */
  async updateTemplate(
    clubId: string,
    templateId: string,
    updateDto: UpdateRosterTemplateDto,
    userId?: string,
  ) {
    const template = await this.rosterTemplateRepo.findOne({
      where: { id: templateId, clubId },
    });

    if (!template) {
      throw new NotFoundException('Roster template not found');
    }

    // If trying to activate this template, ensure no other active template exists for this staff
    if (updateDto.isActive === true) {
      const activeTemplate = await this.rosterTemplateRepo.findOne({
        where: { clubId, staffId: template.staffId, isActive: true },
      });

      if (activeTemplate && activeTemplate.id !== templateId) {
        throw new ConflictException('Staff member already has an active roster template. Please deactivate it first.');
      }
    }

    Object.assign(template, {
      ...updateDto,
      updatedBy: userId,
    });

    return await this.rosterTemplateRepo.save(template);
  }

  /**
   * Delete a roster template
   */
  async deleteTemplate(clubId: string, templateId: string) {
    const template = await this.rosterTemplateRepo.findOne({
      where: { id: templateId, clubId },
    });

    if (!template) {
      throw new NotFoundException('Roster template not found');
    }

    await this.rosterTemplateRepo.remove(template);
    return { success: true, message: 'Roster template deleted successfully' };
  }

  // ==================== ROSTER GENERATION ====================

  /**
   * Generate roster (shifts) for all staff members based on their templates
   */
  async generateRoster(
    clubId: string,
    generateRosterDto: GenerateRosterDto,
    userId?: string,
  ) {
    const { startDate, periodType, overwriteExisting = false } = generateRosterDto;

    // Get all active templates for the club
    const templates = await this.getAllTemplates(clubId, false);

    if (templates.length === 0) {
      throw new BadRequestException('No roster templates found. Please create templates first.');
    }

    const startYmd = String(startDate).split('T')[0];
    const endYmd = this.endYmdForPeriod(startYmd, periodType);

    // If overwrite is enabled, delete existing shifts in the period (calendar dates, no UTC drift)
    if (overwriteExisting) {
      await this.shiftRepo
        .createQueryBuilder()
        .delete()
        .from(Shift)
        .where('club_id = :clubId', { clubId })
        .andWhere('shift_date >= :startYmd', { startYmd })
        .andWhere('shift_date <= :endYmd', { endYmd })
        .execute();
    }

    // Generate shifts for each staff member
    const createdShifts: Shift[] = [];
    const errors: any[] = [];

    for (const template of templates) {
      try {
        const shiftsForStaff = await this.generateShiftsForStaff(
          clubId,
          template,
          startYmd,
          endYmd,
          userId,
        );
        createdShifts.push(...shiftsForStaff);
      } catch (error: any) {
        errors.push({
          staffId: template.staffId,
          staffName: template.staffName,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      message: `Roster generated successfully for ${periodType} period`,
      startDate: startYmd,
      endDate: endYmd,
      totalShiftsCreated: createdShifts.length,
      staffProcessed: templates.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Generate shifts for a single staff member based on their template
   */
  private async generateShiftsForStaff(
    clubId: string,
    template: RosterTemplate,
    startYmd: string,
    endYmd: string,
    userId?: string,
  ): Promise<Shift[]> {
    const shifts: Shift[] = [];

    // First, check for existing shifts in this period for this staff member
    const existingShifts = await this.shiftRepo
      .createQueryBuilder('s')
      .where('s.clubId = :clubId', { clubId })
      .andWhere('s.staffId = :staffId', { staffId: template.staffId })
      .andWhere('s.shiftDate >= :startYmd', { startYmd })
      .andWhere('s.shiftDate <= :endYmd', { endYmd })
      .getMany();

    const existingDates = new Set(existingShifts.map((shift) => this.ymdFromStoredShiftDate(shift.shiftDate)));

    for (let ymd = startYmd; ymd <= endYmd; ymd = this.addDaysToYmd(ymd, 1)) {
      if (existingDates.has(ymd)) {
        continue;
      }

      const shiftDateOnly = this.dateOnlyNoonClubTz(ymd);
      const dayOfWeek = this.dayOfWeekFromYmd(ymd);

      const isOffDay = template.offDays.includes(dayOfWeek);

      if (isOffDay) {
        const shift = this.shiftRepo.create({
          clubId,
          staffId: template.staffId,
          shiftDate: shiftDateOnly,
          shiftStartTime: shiftDateOnly,
          shiftEndTime: shiftDateOnly,
          isOffDay: true,
          notes: 'Scheduled day off',
          createdBy: userId,
        });
        shifts.push(shift);
      } else {
        const shiftStartTime = this.combineYmdTimeClubTz(ymd, template.defaultShiftStartTime);

        let shiftEndTime: Date;
        if (template.shiftCrossesMidnight) {
          const nextYmd = this.addDaysToYmd(ymd, 1);
          shiftEndTime = this.combineYmdTimeClubTz(nextYmd, template.defaultShiftEndTime);
        } else {
          shiftEndTime = this.combineYmdTimeClubTz(ymd, template.defaultShiftEndTime);
        }

        const shift = this.shiftRepo.create({
          clubId,
          staffId: template.staffId,
          shiftDate: shiftDateOnly,
          shiftStartTime,
          shiftEndTime,
          isOffDay: false,
          notes: 'Auto-generated from roster template',
          createdBy: userId,
        });
        shifts.push(shift);
      }
    }

    if (shifts.length > 0) {
      return await this.shiftRepo.save(shifts);
    }
    return [];
  }

  /**
   * Get roster overview for a period (all staff shifts)
   * Shows calendar view with working days properly counted
   * Includes approved leave information
   */
  async getRosterOverview(
    clubId: string,
    startDate: string,
    endDate: string,
  ) {
    const startYmd = String(startDate).split('T')[0];
    const endYmd = String(endDate).split('T')[0];

    const shifts = await this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.staff', 'staff')
      .where('shift.clubId = :clubId', { clubId })
      .andWhere('shift.shiftDate >= :startYmd', { startYmd })
      .andWhere('shift.shiftDate <= :endYmd', { endYmd })
      .orderBy('shift.shiftDate', 'ASC')
      .addOrderBy('staff.name', 'ASC')
      .getMany();

    // Get all staff members with templates
    const templates = await this.getAllTemplates(clubId, false);

    // Get approved leaves that overlap with this period
    const staffIds = templates.map(t => t.staffId);
    const approvedLeaves = await this.leaveApplicationRepo.find({
      where: {
        clubId,
        staffId: In(staffIds),
        status: LeaveStatus.APPROVED,
      },
    });

    // Group shifts by staff
    const staffShifts: any = {};
    
    templates.forEach(template => {
      staffShifts[template.staffId] = {
        staffId: template.staffId,
        staffName: template.staffName,
        staffRole: template.staffRole,
        offDays: template.offDays,
        defaultShiftTimes: {
          start: template.defaultShiftStartTime.substring(0, 5),
          end: template.defaultShiftEndTime.substring(0, 5),
          crossesMidnight: template.shiftCrossesMidnight,
        },
        shifts: [],
        workingDaysCount: 0,
        offDaysCount: 0,
        leaveDaysCount: 0,
      };
    });

    shifts.forEach(shift => {
      if (staffShifts[shift.staffId]) {
        // Check if this shift date falls within an approved leave period
        const onLeave = approvedLeaves.some(leave => 
          leave.staffId === shift.staffId &&
          shift.shiftDate >= leave.startDate &&
          shift.shiftDate <= leave.endDate
        );

        const dateYmd = this.ymdFromStoredShiftDate(shift.shiftDate);

        const shiftData = {
          id: shift.id,
          date: dateYmd,
          dayOfWeek: this.dayOfWeekFromYmd(dateYmd),
          startTime: this.formatTime(shift.shiftStartTime),
          endTime: this.formatTime(shift.shiftEndTime),
          isOffDay: shift.isOffDay,
          onLeave: onLeave,
          notes: shift.notes,
        };
        
        staffShifts[shift.staffId].shifts.push(shiftData);
        
        // Count days
        if (onLeave) {
          staffShifts[shift.staffId].leaveDaysCount++;
        } else if (!shift.isOffDay) {
          staffShifts[shift.staffId].workingDaysCount++;
        } else {
          staffShifts[shift.staffId].offDaysCount++;
        }
      }
    });

    return {
      startDate,
      endDate,
      staff: Object.values(staffShifts),
    };
  }

  /** Wall-clock time in Asia/Kolkata for display (matches template HH:mm). */
  private formatTime(date: Date | string): string {
    if (!date) return '00:00';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  }

  /**
   * Bulk create roster templates for multiple staff members
   */
  async bulkCreateTemplates(
    clubId: string,
    templates: CreateRosterTemplateDto[],
    userId?: string,
  ) {
    const created: RosterTemplate[] = [];
    const errors: any[] = [];

    for (const templateDto of templates) {
      try {
        const template = await this.createOrUpdateTemplate(clubId, templateDto, userId);
        created.push(template);
      } catch (error: any) {
        errors.push({
          staffId: templateDto.staffId,
          staffName: templateDto.staffName,
          error: error.message,
        });
      }
    }

    return {
      success: true,
      created: created.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
