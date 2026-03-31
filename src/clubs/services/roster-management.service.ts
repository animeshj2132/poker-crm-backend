import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { RosterTemplate } from '../entities/roster-template.entity';
import { Shift } from '../entities/shift.entity';
import { Staff, StaffStatus } from '../entities/staff.entity';
import { LeaveApplication, LeaveStatus } from '../entities/leave-application.entity';
import { CreateRosterTemplateDto } from '../dto/create-roster-template.dto';
import { UpdateRosterTemplateDto } from '../dto/update-roster-template.dto';
import { GenerateRosterDto, RosterPeriodType } from '../dto/generate-roster.dto';

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

  /** YYYY-MM-DD in the server local calendar (matches how JS Date builds shift days). */
  private ymdFromLocalDate(d: Date): string {
    const x = d instanceof Date ? d : new Date(d);
    const y = x.getFullYear();
    const m = String(x.getMonth() + 1).padStart(2, '0');
    const day = String(x.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  private localMidnight(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  private localEndOfDay(ymd: string): Date {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }

  private addDaysToYmd(ymd: string, delta: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const n = new Date(y, m - 1, d + delta);
    return this.ymdFromLocalDate(n);
  }

  private endYmdForPeriod(startYmd: string, periodType: RosterPeriodType): string {
    if (periodType === RosterPeriodType.WEEKLY) {
      return this.addDaysToYmd(startYmd, 6);
    }
    const [y, m] = startYmd.split('-').map(Number);
    const last = new Date(y, m, 0);
    return this.ymdFromLocalDate(last);
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
    const rangeStart = this.localMidnight(startYmd);
    const rangeEnd = this.localEndOfDay(endYmd);

    // If overwrite is enabled, delete existing shifts in the period
    if (overwriteExisting) {
      await this.shiftRepo.delete({
        clubId,
        shiftDate: Between(rangeStart, rangeEnd),
      });
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
    const rangeStart = this.localMidnight(startYmd);
    const rangeEnd = this.localEndOfDay(endYmd);

    // First, check for existing shifts in this period for this staff member
    const existingShifts = await this.shiftRepo.find({
      where: {
        clubId,
        staffId: template.staffId,
        shiftDate: Between(rangeStart, rangeEnd),
      },
    });

    // Use local calendar YYYY-MM-DD so this matches the loop (avoids duplicate rows from UTC vs local ISO mismatch).
    const existingDates = new Set(
      existingShifts.map((shift) => this.ymdFromLocalDate(new Date(shift.shiftDate))),
    );

    for (let ymd = startYmd; ymd <= endYmd; ymd = this.addDaysToYmd(ymd, 1)) {
      if (existingDates.has(ymd)) {
        continue;
      }

      const currentDate = this.localMidnight(ymd);
      const dayOfWeek = currentDate.getDay();

      const isOffDay = template.offDays.includes(dayOfWeek);

      if (isOffDay) {
        const shift = this.shiftRepo.create({
          clubId,
          staffId: template.staffId,
          shiftDate: currentDate,
          shiftStartTime: new Date(currentDate),
          shiftEndTime: new Date(currentDate),
          isOffDay: true,
          notes: 'Scheduled day off',
          createdBy: userId,
        });
        shifts.push(shift);
      } else {
        const shiftStartTime = this.combineDateAndTime(
          currentDate,
          template.defaultShiftStartTime,
        );

        let shiftEndTime: Date;
        if (template.shiftCrossesMidnight) {
          const nextDay = this.addDaysToYmd(ymd, 1);
          const nextDate = this.localMidnight(nextDay);
          shiftEndTime = this.combineDateAndTime(nextDate, template.defaultShiftEndTime);
        } else {
          shiftEndTime = this.combineDateAndTime(currentDate, template.defaultShiftEndTime);
        }

        const shift = this.shiftRepo.create({
          clubId,
          staffId: template.staffId,
          shiftDate: currentDate,
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
   * Helper: Combine date and time strings
   */
  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes, seconds = '00'] = time.split(':');
    const combined = new Date(date);
    combined.setHours(parseInt(hours, 10), parseInt(minutes, 10), parseInt(seconds, 10), 0);
    return combined;
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
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get all shifts in the period
    const shifts = await this.shiftRepo.find({
      where: {
        clubId,
        shiftDate: Between(start, end),
      },
      relations: ['staff'],
      order: {
        shiftDate: 'ASC',
        staff: { name: 'ASC' },
      },
    });

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

        // Format shift date properly
        const shiftDateObj = typeof shift.shiftDate === 'string' ? new Date(shift.shiftDate) : shift.shiftDate;
        
        const shiftData = {
          id: shift.id,
          date: shiftDateObj.toISOString().split('T')[0],
          dayOfWeek: shiftDateObj.getDay(), // 0=Sun, 1=Mon, etc.
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

  /**
   * Format time to HH:MM (IST format)
   * Converts UTC timestamp to IST (UTC+5:30)
   */
  private formatTime(date: Date | string): string {
    if (!date) return '00:00';
    
    // Convert to Date if string
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // IST is UTC+5:30
    const istOffset = 5.5 * 60; // 330 minutes
    const utcTime = d.getTime();
    const istTime = new Date(utcTime + (istOffset * 60 * 1000));
    
    const hours = istTime.getUTCHours().toString().padStart(2, '0');
    const minutes = istTime.getUTCMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
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
