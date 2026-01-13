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

    // Calculate end date based on period type
    // Normalize start date to remove time component
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    let end = new Date(start);

    if (periodType === RosterPeriodType.WEEKLY) {
      // 7 days from start date
      end.setDate(start.getDate() + 6);
    } else if (periodType === RosterPeriodType.MONTHLY) {
      // End of the month - get the last day of the current month
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
      end.setHours(0, 0, 0, 0);
    }
    
    // Ensure end date has no time component for proper comparison
    end.setHours(23, 59, 59, 999);

    // If overwrite is enabled, delete existing shifts in the period
    if (overwriteExisting) {
      await this.shiftRepo.delete({
        clubId,
        shiftDate: Between(start, end),
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
          start,
          end,
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
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
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
    startDate: Date,
    endDate: Date,
    userId?: string,
  ): Promise<Shift[]> {
    const shifts: Shift[] = [];
    const currentDate = new Date(startDate);

    // First, check for existing shifts in this period for this staff member
    const existingShifts = await this.shiftRepo.find({
      where: {
        clubId,
        staffId: template.staffId,
        shiftDate: Between(startDate, endDate),
      },
    });

    const existingDates = new Set(
      existingShifts.map(shift => shift.shiftDate.toISOString().split('T')[0])
    );

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Skip if shift already exists for this date
      if (existingDates.has(dateStr)) {
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

      // Check if this day is a scheduled off day for this staff member
      const isOffDay = template.offDays.includes(dayOfWeek);

      if (isOffDay) {
        // Create off day record
        const shift = this.shiftRepo.create({
          clubId,
          staffId: template.staffId,
          shiftDate: new Date(currentDate),
          shiftStartTime: new Date(currentDate), // Dummy time
          shiftEndTime: new Date(currentDate), // Dummy time
          isOffDay: true,
          notes: 'Scheduled day off',
          createdBy: userId,
        });
        shifts.push(shift);
      } else {
        // Create working shift
        const shiftStartTime = this.combineDateAndTime(
          currentDate,
          template.defaultShiftStartTime,
        );
        
        let shiftEndTime: Date;
        if (template.shiftCrossesMidnight) {
          // Shift ends next day
          const nextDay = new Date(currentDate);
          nextDay.setDate(nextDay.getDate() + 1);
          shiftEndTime = this.combineDateAndTime(nextDay, template.defaultShiftEndTime);
        } else {
          // Shift ends same day
          shiftEndTime = this.combineDateAndTime(currentDate, template.defaultShiftEndTime);
        }

        const shift = this.shiftRepo.create({
          clubId,
          staffId: template.staffId,
          shiftDate: new Date(currentDate),
          shiftStartTime,
          shiftEndTime,
          isOffDay: false,
          notes: 'Auto-generated from roster template',
          createdBy: userId,
        });
        shifts.push(shift);
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Save all shifts for this staff member (only new ones)
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
