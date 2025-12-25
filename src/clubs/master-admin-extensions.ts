/**
 * Master Admin Extensions for Clubs Controller
 * Additional endpoints for Master Admin operations
 * 
 * Add these to clubs.controller.ts
 */

import { Body, Controller, Get, Param, ParseUUIDPipe, Put, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { RolesGuard } from '../common/rbac/roles.guard';
import { Roles } from '../common/rbac/roles.decorator';
import { GlobalRole } from '../common/rbac/roles';
import { UpdateClubStatusDto } from './dto/update-club-status.dto';
import { UpdateClubSubscriptionDto } from './dto/update-club-subscription.dto';
import { UpdateClubTermsDto } from './dto/update-club-terms.dto';

/**
 * Update club status (active/suspended/killed)
 * PUT /api/clubs/:id/status
 */
/*
@Put(':id/status')
@Roles(GlobalRole.MASTER_ADMIN)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
async updateClubStatus(
  @Param('id', new ParseUUIDPipe()) clubId: string,
  @Body() dto: UpdateClubStatusDto
) {
  const club = await this.clubsService.findById(clubId);
  if (!club) {
    throw new NotFoundException('Club not found');
  }

  // Update status
  club.status = dto.status;
  if (dto.reason) {
    club.subscriptionNotes = `Status changed to ${dto.status}: ${dto.reason}`;
  }

  await this.clubsRepo.save(club);

  // TODO: If status is 'suspended' or 'killed', emit WebSocket event to disconnect all users
  // TODO: Log audit trail
  
  return {
    success: true,
    club: {
      id: club.id,
      name: club.name,
      status: club.status,
      code: club.code
    },
    message: `Club ${dto.status === 'killed' ? 'permanently disabled' : dto.status}`
  };
}
*/

/**
 * Update club subscription
 * PUT /api/clubs/:id/subscription
 */
/*
@Put(':id/subscription')
@Roles(GlobalRole.MASTER_ADMIN)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
async updateClubSubscription(
  @Param('id', new ParseUUIDPipe()) clubId: string,
  @Body() dto: UpdateClubSubscriptionDto
) {
  const club = await this.clubsService.findById(clubId);
  if (!club) {
    throw new NotFoundException('Club not found');
  }

  // Update subscription fields
  if (dto.subscriptionPrice !== undefined) {
    club.subscriptionPrice = dto.subscriptionPrice;
  }
  if (dto.subscriptionStatus) {
    club.subscriptionStatus = dto.subscriptionStatus;
  }
  if (dto.lastPaymentDate) {
    club.lastPaymentDate = new Date(dto.lastPaymentDate);
  }
  if (dto.subscriptionNotes) {
    club.subscriptionNotes = dto.subscriptionNotes;
  }

  await this.clubsRepo.save(club);
  
  return {
    success: true,
    club: {
      id: club.id,
      name: club.name,
      subscriptionPrice: club.subscriptionPrice,
      subscriptionStatus: club.subscriptionStatus,
      lastPaymentDate: club.lastPaymentDate
    }
  };
}
*/

/**
 * Update club terms and conditions
 * PUT /api/clubs/:id/terms
 */
/*
@Put(':id/terms')
@Roles(GlobalRole.MASTER_ADMIN)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
async updateClubTerms(
  @Param('id', new ParseUUIDPipe()) clubId: string,
  @Body() dto: UpdateClubTermsDto
) {
  const club = await this.clubsService.findById(clubId);
  if (!club) {
    throw new NotFoundException('Club not found');
  }

  club.termsAndConditions = dto.termsAndConditions;
  await this.clubsRepo.save(club);
  
  return {
    success: true,
    club: {
      id: club.id,
      name: club.name,
      termsAndConditions: club.termsAndConditions
    }
  };
}
*/

/**
 * Get all clubs with tenant info (Master Admin view)
 * GET /api/clubs/master-admin/all
 */
/*
@Get('master-admin/all')
@Roles(GlobalRole.MASTER_ADMIN)
async getAllClubsForMasterAdmin() {
  const clubs = await this.clubsRepo.find({
    relations: ['tenant'],
    order: {
      createdAt: 'DESC'
    }
  });

  return clubs.map(club => ({
    id: club.id,
    name: club.name,
    description: club.description,
    code: club.code,
    status: club.status,
    subscriptionPrice: club.subscriptionPrice,
    subscriptionStatus: club.subscriptionStatus,
    lastPaymentDate: club.lastPaymentDate,
    termsAndConditions: club.termsAndConditions,
    logoUrl: club.logoUrl,
    videoUrl: club.videoUrl,
    skinColor: club.skinColor,
    gradient: club.gradient,
    tenant: {
      id: club.tenant.id,
      name: club.tenant.name
    },
    createdAt: club.created,
    updatedAt: club.updatedAt
  }));
}
*/


