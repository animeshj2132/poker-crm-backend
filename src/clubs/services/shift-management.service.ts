import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Shift } from '../entities/shift.entity';
import { Staff, StaffRole, StaffStatus } from '../entities/staff.entity';
import { LeaveApplication, LeaveStatus } from '../entities/leave-application.entity';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';
import { CopyShiftDto } from '../dto/copy-shift.dto';

@Injectable()
export class ShiftManagementService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepo: Repository<Shift>,
    @InjectRepository(Staff)
    private staffRepo: Repository<Staff>,
    @InjectRepository(LeaveApplication)
    private leaveApplicationRepo: Repository<LeaveApplication>,
  ) {}

  // Create a new shift
  async createShift(clubId: string, createShiftDto: CreateShiftDto, userId?: string) {
    // Verify staff exists and belongs to the club
    const staff = await this.staffRepo.findOne({
      where: { id: createShiftDto.staffId, club: { id: clubId } },
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Check if staff has an approved leave for the shift date
    const shiftDate = new Date(createShiftDto.shiftDate);
    const approvedLeave = await this.leaveApplicationRepo.findOne({
      where: {
        staffId: createShiftDto.staffId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(shiftDate),
        endDate: MoreThanOrEqual(shiftDate),
      },
    });

    if (approvedLeave) {
      throw new BadRequestException(
        `Cannot create shift because dealer is on leave`
      );
    }

    // Validate that shift end time is after start time
    const startTime = new Date(createShiftDto.shiftStartTime);
    const endTime = new Date(createShiftDto.shiftEndTime);
    
    if (endTime <= startTime) {
      throw new BadRequestException('Shift end time must be after start time');
    }

    // Check for overlapping shifts (unless it's an off day)
    if (!createShiftDto.isOffDay) {
      const overlapping = await this.shiftRepo.findOne({
        where: [
          {
            staffId: createShiftDto.staffId,
            clubId,
            shiftStartTime: LessThanOrEqual(endTime),
            shiftEndTime: MoreThanOrEqual(startTime),
            isOffDay: false,
          },
        ],
      });

      if (overlapping) {
        throw new BadRequestException('Shift overlaps with an existing shift for this staff member');
      }
    }

    const shift = this.shiftRepo.create({
      ...createShiftDto,
      clubId,
      shiftDate: new Date(createShiftDto.shiftDate),
      shiftStartTime: startTime,
      shiftEndTime: endTime,
      createdBy: userId,
    });

    const savedShift = await this.shiftRepo.save(shift);
    
    // Return with staff details
    return this.shiftRepo.findOne({
      where: { id: savedShift.id },
      relations: ['staff'],
    });
  }

  // Get all shifts for a club with optional filters
  async getShifts(
    clubId: string,
    startDate?: string,
    endDate?: string,
    staffId?: string,
    role?: StaffRole,
  ) {
    const queryBuilder = this.shiftRepo
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.staff', 'staff')
      .where('shift.club_id = :clubId', { clubId })
      .orderBy('shift.shift_date', 'ASC')
      .addOrderBy('shift.shift_start_time', 'ASC');

    if (startDate && endDate) {
      queryBuilder.andWhere('shift.shift_date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      queryBuilder.andWhere('shift.shift_date >= :startDate', { startDate });
    } else if (endDate) {
      queryBuilder.andWhere('shift.shift_date <= :endDate', { endDate });
    }

    if (staffId) {
      queryBuilder.andWhere('shift.staff_id = :staffId', { staffId });
    }

    if (role) {
      queryBuilder.andWhere('staff.role = :role', { role });
    }

    const shifts = await queryBuilder.getMany();
    
    // Check for approved leaves and add leave information to shifts
    if (shifts.length > 0) {
      const staffIds = [...new Set(shifts.map(s => s.staffId))];
      
      // Get all approved leaves for these staff members
      const approvedLeaves = await this.leaveApplicationRepo.find({
        where: staffIds.map(sid => ({
          staffId: sid,
          status: LeaveStatus.APPROVED,
        })),
      });

      // Add leave information to shifts
      return shifts.map(shift => {
        const leave = approvedLeaves.find(l => 
          l.staffId === shift.staffId &&
          l.startDate <= shift.shiftDate &&
          l.endDate >= shift.shiftDate
        );
        
        return {
          ...shift,
          onLeave: !!leave,
          leaveInfo: leave ? {
            startDate: leave.startDate,
            endDate: leave.endDate,
            reason: leave.reason,
          } : null,
        };
      });
    }
    
    return shifts;
  }

  // Get shift by ID
  async getShiftById(clubId: string, shiftId: string) {
    const shift = await this.shiftRepo.findOne({
      where: { id: shiftId, clubId },
      relations: ['staff'],
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  // Update a shift
  async updateShift(clubId: string, shiftId: string, updateShiftDto: UpdateShiftDto) {
    const shift = await this.getShiftById(clubId, shiftId);

    // Validate times if both are provided or being updated
    const startTime = updateShiftDto.shiftStartTime
      ? new Date(updateShiftDto.shiftStartTime)
      : shift.shiftStartTime;
    const endTime = updateShiftDto.shiftEndTime
      ? new Date(updateShiftDto.shiftEndTime)
      : shift.shiftEndTime;

    if (endTime <= startTime) {
      throw new BadRequestException('Shift end time must be after start time');
    }

    // Check for overlaps if times are being changed
    if (updateShiftDto.shiftStartTime || updateShiftDto.shiftEndTime) {
      const overlapping = await this.shiftRepo
        .createQueryBuilder('shift')
        .where('shift.staff_id = :staffId', { staffId: shift.staffId })
        .andWhere('shift.club_id = :clubId', { clubId })
        .andWhere('shift.id != :shiftId', { shiftId })
        .andWhere('shift.is_off_day = false')
        .andWhere('shift.shift_start_time < :endTime', { endTime })
        .andWhere('shift.shift_end_time > :startTime', { startTime })
        .getOne();

      if (overlapping && !updateShiftDto.isOffDay) {
        throw new BadRequestException('Updated shift would overlap with an existing shift');
      }
    }

    Object.assign(shift, {
      ...updateShiftDto,
      ...(updateShiftDto.shiftDate && { shiftDate: new Date(updateShiftDto.shiftDate) }),
      ...(updateShiftDto.shiftStartTime && { shiftStartTime: startTime }),
      ...(updateShiftDto.shiftEndTime && { shiftEndTime: endTime }),
    });

    await this.shiftRepo.save(shift);
    return this.getShiftById(clubId, shiftId);
  }

  // Delete a shift
  async deleteShift(clubId: string, shiftId: string) {
    const shift = await this.getShiftById(clubId, shiftId);
    await this.shiftRepo.remove(shift);
    return { message: 'Shift deleted successfully', shiftId };
  }

  // Copy shifts to new dates
  async copyShifts(clubId: string, copyShiftDto: CopyShiftDto, userId?: string) {
    const { shiftIds, targetDates } = copyShiftDto;

    // Get all source shifts
    const sourceShifts = await this.shiftRepo.find({
      where: shiftIds.map(id => ({ id, clubId })),
      relations: ['staff'],
    });

    if (sourceShifts.length !== shiftIds.length) {
      throw new NotFoundException('One or more shifts not found');
    }

    const copiedShifts: Shift[] = [];
    const skippedShifts: Array<{ staffId: string; date: Date; reason: string }> = [];

    // Copy each shift to each target date
    for (const sourceShift of sourceShifts) {
      for (const targetDate of targetDates) {
        const targetDateObj = new Date(targetDate);
        
        // Check if staff has an approved leave for this target date
        const approvedLeave = await this.leaveApplicationRepo.findOne({
          where: {
            staffId: sourceShift.staffId,
            status: LeaveStatus.APPROVED,
            startDate: LessThanOrEqual(targetDateObj),
            endDate: MoreThanOrEqual(targetDateObj),
          },
        });

        if (approvedLeave) {
          skippedShifts.push({
            staffId: sourceShift.staffId,
            date: targetDateObj,
            reason: `Staff has approved leave from ${approvedLeave.startDate.toLocaleDateString()} to ${approvedLeave.endDate.toLocaleDateString()}`,
          });
          continue; // Skip this shift copy
        }
        
        // Calculate time difference from source shift date to target date
        const sourceDateObj = new Date(sourceShift.shiftDate);
        const dayDiff = Math.floor(
          (targetDateObj.getTime() - sourceDateObj.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Adjust start and end times by the day difference
        const newStartTime = new Date(sourceShift.shiftStartTime);
        newStartTime.setDate(newStartTime.getDate() + dayDiff);

        const newEndTime = new Date(sourceShift.shiftEndTime);
        newEndTime.setDate(newEndTime.getDate() + dayDiff);

        // Check if shift already exists for this staff on this date
        const existing = await this.shiftRepo.findOne({
          where: {
            staffId: sourceShift.staffId,
            clubId,
            shiftDate: targetDateObj,
          },
        });

        if (!existing) {
          const newShift = this.shiftRepo.create({
            clubId,
            staffId: sourceShift.staffId,
            shiftDate: targetDateObj,
            shiftStartTime: newStartTime,
            shiftEndTime: newEndTime,
            isOffDay: sourceShift.isOffDay,
            notes: sourceShift.notes ? `${sourceShift.notes} (copied)` : 'Copied shift',
            createdBy: userId,
          });

          const saved = await this.shiftRepo.save(newShift);
          copiedShifts.push(saved);
        }
      }
    }

    const result = {
      message: `Successfully copied ${copiedShifts.length} shifts`,
      copiedShifts: await this.shiftRepo.find({
        where: copiedShifts.map(s => ({ id: s.id })),
        relations: ['staff'],
      }),
      skippedShifts: skippedShifts.length > 0 ? skippedShifts : undefined,
    };

    if (skippedShifts.length > 0) {
      result.message += `. Skipped ${skippedShifts.length} shifts due to approved leaves`;
    }

    return result;
  }

  // Get dealers for shift assignment
  // Optionally filter by date to exclude dealers on leave
  async getDealers(clubId: string, date?: Date) {
    const dealers = await this.staffRepo.find({
      where: {
        club: { id: clubId },
        role: StaffRole.DEALER,
        status: StaffStatus.ACTIVE,
      },
      order: {
        name: 'ASC',
      },
    });

    // If date is provided, filter out dealers on leave
    if (date) {
      const dealersOnLeave = await this.leaveApplicationRepo.find({
        where: {
          clubId,
          status: LeaveStatus.APPROVED,
          startDate: LessThanOrEqual(date),
          endDate: MoreThanOrEqual(date),
        },
        relations: ['staff'],
      });

      const dealerIdsOnLeave = new Set(
        dealersOnLeave.map(leave => leave.staffId)
      );

      return dealers.filter(dealer => !dealerIdsOnLeave.has(dealer.id));
    }

    return dealers;
  }

  // Get dealers available for a specific date (not on leave and have a shift)
  async getAvailableDealersForDate(clubId: string, date: Date) {
    // Get all active dealers
    const allDealers = await this.getDealers(clubId);
    
    // Get dealers on leave for this date
    const dealersOnLeave = await this.leaveApplicationRepo.find({
      where: {
        clubId,
        status: LeaveStatus.APPROVED,
        startDate: LessThanOrEqual(date),
        endDate: MoreThanOrEqual(date),
      },
      relations: ['staff'],
    });

    const dealerIdsOnLeave = new Set(
      dealersOnLeave.map(leave => leave.staffId)
    );

    // Get dealers with shifts on this date
    const shiftsOnDate = await this.shiftRepo.find({
      where: {
        clubId,
        shiftDate: date,
        isOffDay: false,
      },
      relations: ['staff'],
    });

    const dealerIdsWithShifts = new Set(
      shiftsOnDate.map(shift => shift.staffId)
    );

    // Return dealers who:
    // 1. Are not on leave
    // 2. Have a shift on this date
    return allDealers.filter(dealer => 
      !dealerIdsOnLeave.has(dealer.id) && 
      dealerIdsWithShifts.has(dealer.id)
    );
  }

  // Delete multiple shifts
  async deleteMultipleShifts(clubId: string, shiftIds: string[]) {
    const shifts = await this.shiftRepo.find({
      where: shiftIds.map(id => ({ id, clubId })),
    });

    if (shifts.length === 0) {
      throw new NotFoundException('No shifts found to delete');
    }

    await this.shiftRepo.remove(shifts);
    return { message: `Successfully deleted ${shifts.length} shifts`, deletedCount: shifts.length };
  }
}

