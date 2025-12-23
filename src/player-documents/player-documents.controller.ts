import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PlayerDocumentsService } from './player-documents.service';

@Controller('player-documents')
export class PlayerDocumentsController {
  constructor(private readonly documentsService: PlayerDocumentsService) {}

  /**
   * Get player's documents
   * GET /api/player-documents/my
   */
  @Get('my')
  async getMyDocuments(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.documentsService.getPlayerDocuments(playerId.trim(), clubId.trim());
  }

  /**
   * Upload KYC document
   * POST /api/player-documents/upload
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
    @Body() body?: any,
    @UploadedFile() file?: any,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.documentsService.uploadDocument(
      playerId.trim(),
      clubId.trim(),
      body,
      file,
    );
  }

  /**
   * Delete document
   * DELETE /api/player-documents/:documentId
   */
  @Delete(':documentId')
  async deleteDocument(
    @Param('documentId') documentId: string,
    @Headers('x-player-id') playerId?: string,
    @Headers('x-club-id') clubId?: string,
  ) {
    if (!playerId || !playerId.trim()) {
      throw new BadRequestException('x-player-id header is required');
    }
    if (!clubId || !clubId.trim()) {
      throw new BadRequestException('x-club-id header is required');
    }
    return this.documentsService.deleteDocument(
      documentId,
      playerId.trim(),
      clubId.trim(),
    );
  }
}


