import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Player } from '../clubs/entities/player.entity';
import { ClubsService } from '../clubs/clubs.service';

@Injectable()
export class PlayerDocumentsService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
  ) {}

  /**
   * Get player's KYC documents
   */
  async getPlayerDocuments(playerId: string, clubId: string) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Get documents from kycDocuments JSONB field
      const documents = (player as any).kycDocuments || [];

      return {
        documents: Array.isArray(documents) ? documents : [],
        kycStatus: (player as any).kycStatus || 'pending',
        kycApprovedAt: (player as any).kycApprovedAt || null,
        totalDocuments: Array.isArray(documents) ? documents.length : 0,
      };
    } catch (err) {
      console.error('Get documents error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to get documents');
    }
  }

  /**
   * Upload KYC document
   */
  async uploadDocument(
    playerId: string,
    clubId: string,
    data: any,
    file?: any,
  ) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Get existing documents
      const existingDocs = (player as any).kycDocuments || [];
      const documents = Array.isArray(existingDocs) ? existingDocs : [];

      // Create new document entry
      const newDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: data?.type || 'other',
        name: data?.name || file?.originalname || 'Untitled Document',
        url: data?.url || (file ? `/uploads/${file.filename}` : ''),
        uploadedAt: new Date().toISOString(),
        status: 'pending',
        size: file?.size || 0,
        mimeType: file?.mimetype || 'application/octet-stream',
      };

      documents.push(newDocument);

      // Update player's kyc_documents
      await this.playersRepo.update(
        { id: playerId },
        { kycDocuments: documents as any },
      );

      return {
        success: true,
        message: 'Document uploaded successfully',
        document: newDocument,
        totalDocuments: documents.length,
      };
    } catch (err) {
      console.error('Upload document error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to upload document');
    }
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId: string, playerId: string, clubId: string) {
    try {
      // Validate UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playerId)) {
        throw new BadRequestException('Invalid player ID format');
      }
      if (!uuidRegex.test(clubId)) {
        throw new BadRequestException('Invalid club ID format');
      }

      const player = await this.playersRepo.findOne({
        where: { id: playerId, club: { id: clubId } },
        relations: ['club'],
      });

      if (!player) {
        throw new NotFoundException('Player not found');
      }

      // Get existing documents
      const existingDocs = (player as any).kycDocuments || [];
      const documents = Array.isArray(existingDocs) ? existingDocs : [];

      // Filter out the document
      const updatedDocuments = documents.filter((doc: any) => doc.id !== documentId);

      if (documents.length === updatedDocuments.length) {
        throw new NotFoundException('Document not found');
      }

      // Update player's kyc_documents
      await this.playersRepo.update(
        { id: playerId },
        { kycDocuments: updatedDocuments as any },
      );

      return {
        success: true,
        message: 'Document deleted successfully',
        totalDocuments: updatedDocuments.length,
      };
    } catch (err) {
      console.error('Delete document error:', err);
      if (
        err instanceof BadRequestException ||
        err instanceof NotFoundException ||
        err instanceof ForbiddenException
      ) {
        throw err;
      }
      throw new BadRequestException('Failed to delete document');
    }
  }
}

