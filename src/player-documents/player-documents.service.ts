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
import { StorageService } from '../storage/storage.service';

/** All player KYC/approval docs use this bucket. Override with env KYC_DOCUMENTS_BUCKET. Create in Supabase Storage if missing. */
const KYC_DOCUMENTS_BUCKET = process.env.KYC_DOCUMENTS_BUCKET || 'kyc-docs';

@Injectable()
export class PlayerDocumentsService {
  constructor(
    @InjectRepository(Player)
    private readonly playersRepo: Repository<Player>,
    private readonly clubsService: ClubsService,
    private readonly storageService: StorageService,
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
   * Upload KYC document to Supabase storage
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

      // Validate document type
      const allowedTypes = ['government_id', 'address_proof', 'pan_card', 'id_proof', 'utility_bill', 'profile_photo', 'other'];
      const documentType = data?.type || data?.documentType || 'other';
      if (!allowedTypes.includes(documentType)) {
        throw new BadRequestException(`Document type must be one of: ${allowedTypes.join(', ')}`);
      }

      let fileUrl = data?.url;

      // Upload file to Supabase (bucket "kyc-docs" must exist in Supabase Storage)
      if (file && file.buffer) {
        const timestamp = Date.now();
        const fileExtension = file.originalname ? file.originalname.split('.').pop() : 'pdf';
        const fileName = `${timestamp}-${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        const filePath = `${clubId}/${playerId}/${documentType}/${fileName}`;

        const doUpload = () =>
          this.storageService.uploadFile(
            KYC_DOCUMENTS_BUCKET,
            filePath,
            file.buffer,
            file.mimetype || 'application/octet-stream',
          );

        try {
          await doUpload();
        } catch (firstErr: any) {
          const isNetworkError = /fetch failed|timeout|ECONNREFUSED|ETIMEDOUT|UND_ERR_CONNECT/i.test(firstErr?.message || '') || firstErr?.cause;
          if (isNetworkError) {
            await new Promise((r) => setTimeout(r, 2000));
            await doUpload();
          } else {
            throw firstErr;
          }
        }

        // Get public URL
        fileUrl = this.storageService.getPublicUrlForBucket(KYC_DOCUMENTS_BUCKET, filePath);
      }

      if (!fileUrl) {
        throw new BadRequestException('File URL is required. Either provide a file or a URL.');
      }

      // Get existing documents
      const existingDocs = (player as any).kycDocuments || [];
      const documents = Array.isArray(existingDocs) ? existingDocs : [];

      const newDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: documentType,
        documentType: documentType,
        name: data?.name || file?.originalname || 'Untitled Document',
        fileName: data?.name || data?.fileName || file?.originalname || 'Untitled Document',
        url: fileUrl,
        fileUrl: fileUrl,
        uploadedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
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
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const isFetchFailed = /fetch failed|timeout|ECONNREFUSED|ETIMEDOUT/i.test(msg);
      let hint = '';
      if (isFetchFailed) {
        hint = ' Backend cannot reach Supabase Storage (network/timeout). If running locally, try another network or run the backend where it can reach Supabase.';
      } else if (/bucket|not found|404|403/i.test(msg)) {
        hint = ` Create bucket "${KYC_DOCUMENTS_BUCKET}" in Supabase Storage (Dashboard → Storage → New bucket).`;
      }
      throw new BadRequestException(`Failed to upload document: ${msg}${hint}`);
    }
  }

  /**
   * Record a KYC document that was uploaded by the client directly to Supabase Storage.
   * Backend does not call Storage (avoids network issues when backend cannot reach Supabase).
   */
  async recordDocument(
    playerId: string,
    clubId: string,
    documentType: string,
    filePath: string,
    fileName: string,
    fileSize?: number,
    mimeType?: string,
  ) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playerId) || !uuidRegex.test(clubId)) {
      throw new BadRequestException('Invalid player ID or club ID format');
    }
    const allowedTypes = ['government_id', 'address_proof', 'pan_card', 'id_proof', 'utility_bill', 'profile_photo', 'other'];
    if (!allowedTypes.includes(documentType)) {
      throw new BadRequestException(`Document type must be one of: ${allowedTypes.join(', ')}`);
    }
    if (!filePath?.trim() || !fileName?.trim()) {
      throw new BadRequestException('filePath and fileName are required');
    }
    const player = await this.playersRepo.findOne({
      where: { id: playerId, club: { id: clubId } },
      relations: ['club'],
    });
    if (!player) {
      throw new NotFoundException('Player not found');
    }
    const fileUrl = this.storageService.getPublicUrlForBucket(KYC_DOCUMENTS_BUCKET, filePath.trim());
    if (!fileUrl) {
      throw new BadRequestException('Could not build document URL');
    }
    const existingDocs = (player as any).kycDocuments || [];
    const documents = Array.isArray(existingDocs) ? [...existingDocs] : [];
    const newDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: documentType,
      documentType,
      name: fileName,
      fileName,
      url: fileUrl,
      fileUrl,
      uploadedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      size: fileSize ?? 0,
      mimeType: mimeType ?? 'application/octet-stream',
    };
    documents.push(newDocument);
    await this.playersRepo.update({ id: playerId }, { kycDocuments: documents as any });
    return {
      success: true,
      message: 'Document recorded successfully',
      document: newDocument,
      totalDocuments: documents.length,
    };
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





