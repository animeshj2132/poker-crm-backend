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
   * Record a document uploaded by the client to Supabase Storage (backend does not call Storage).
   * POST /api/player-documents/record
   * Body: { playerId, clubId, documentType, filePath, fileName, fileSize?, mimeType? }
   */
  @Post('record')
  async recordDocument(
    @Headers('x-player-id') playerIdHeader?: string,
    @Headers('x-club-id') clubIdHeader?: string,
    @Body() body?: { playerId?: string; clubId?: string; documentType?: string; filePath?: string; fileName?: string; fileSize?: number; mimeType?: string },
  ) {
    const playerId = (body?.playerId ?? playerIdHeader ?? '').toString().trim();
    const clubId = (body?.clubId ?? clubIdHeader ?? '').toString().trim();
    if (!playerId || !clubId) {
      throw new BadRequestException('playerId and clubId are required (body or x-player-id / x-club-id headers)');
    }
    if (!body?.documentType || !body?.filePath || !body?.fileName) {
      throw new BadRequestException('documentType, filePath, and fileName are required in body');
    }
    return this.documentsService.recordDocument(
      playerId,
      clubId,
      body.documentType.trim(),
      body.filePath.trim(),
      body.fileName.trim(),
      body.fileSize,
      body.mimeType?.trim(),
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














