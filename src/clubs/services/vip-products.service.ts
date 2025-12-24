import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VipProduct } from '../entities/vip-product.entity';
import { Club } from '../club.entity';

@Injectable()
export class VipProductsService {
  constructor(
    @InjectRepository(VipProduct) private readonly productsRepo: Repository<VipProduct>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>
  ) {}

  async create(clubId: string, data: { 
    title: string; 
    points: number; 
    description?: string; 
    images?: Array<{ url: string }>; 
    stock?: number;
    isActive?: boolean;
  }) {
    // Validate inputs
    if (!data.title || !data.title.trim()) {
      throw new BadRequestException('Product title is required');
    }
    if (data.title.trim().length < 2) {
      throw new BadRequestException('Product title must be at least 2 characters long');
    }
    if (data.title.trim().length > 200) {
      throw new BadRequestException('Product title cannot exceed 200 characters');
    }
    if (data.points === null || data.points === undefined) {
      throw new BadRequestException('Points is required');
    }
    if (typeof data.points !== 'number' || isNaN(data.points)) {
      throw new BadRequestException('Points must be a valid number');
    }
    if (data.points < 1) {
      throw new BadRequestException('Points must be at least 1');
    }
    if (data.points > 1000000) {
      throw new BadRequestException('Points cannot exceed 1,000,000');
    }
    if (!Number.isInteger(data.points)) {
      throw new BadRequestException('Points must be an integer');
    }
    if (data.description && data.description.trim().length > 1000) {
      throw new BadRequestException('Description cannot exceed 1000 characters');
    }
    if (data.images && data.images.length > 3) {
      throw new BadRequestException('Maximum 3 images allowed per product');
    }
    if (data.stock !== undefined && (typeof data.stock !== 'number' || data.stock < 0)) {
      throw new BadRequestException('Stock must be a non-negative number');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    // Check for duplicate product title in same club
    const existingProduct = await this.productsRepo.findOne({
      where: { club: { id: clubId }, title: data.title.trim() }
    });
    if (existingProduct) {
      throw new ConflictException(`A product with title "${data.title}" already exists in this club`);
    }

    const product = this.productsRepo.create({
      title: data.title.trim(),
      points: data.points,
      description: data.description?.trim() || null,
      images: data.images || [],
      stock: data.stock !== undefined ? data.stock : 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
      club
    });

    return this.productsRepo.save(product);
  }

  async findAll(clubId: string) {
    return this.productsRepo.find({
      where: { club: { id: clubId } },
      order: { points: 'ASC' }
    });
  }

  async findOne(id: string, clubId: string) {
    const product = await this.productsRepo.findOne({
      where: { id, club: { id: clubId } }
    });
    if (!product) throw new NotFoundException('VIP product not found');
    return product;
  }

  async update(id: string, clubId: string, data: Partial<{ 
    title: string; 
    points: number; 
    description: string; 
    images: Array<{ url: string }>; 
    stock: number;
    isActive: boolean;
  }>) {
    const product = await this.findOne(id, clubId);

    // Validate title if provided
    if (data.title !== undefined) {
      if (!data.title || !data.title.trim()) {
        throw new BadRequestException('Product title cannot be empty');
      }
      if (data.title.trim().length < 2) {
        throw new BadRequestException('Product title must be at least 2 characters long');
      }
      if (data.title.trim().length > 200) {
        throw new BadRequestException('Product title cannot exceed 200 characters');
      }
      // Check for duplicate title (excluding current product)
      const existingProduct = await this.productsRepo.findOne({
        where: { club: { id: clubId }, title: data.title.trim() }
      });
      if (existingProduct && existingProduct.id !== id) {
        throw new ConflictException(`A product with title "${data.title.trim()}" already exists in this club`);
      }
      data.title = data.title.trim();
    }

    // Validate points if provided
    if (data.points !== undefined) {
      if (typeof data.points !== 'number' || isNaN(data.points)) {
        throw new BadRequestException('Points must be a valid number');
      }
      if (data.points < 1) {
        throw new BadRequestException('Points must be at least 1');
      }
      if (data.points > 1000000) {
        throw new BadRequestException('Points cannot exceed 1,000,000');
      }
      if (!Number.isInteger(data.points)) {
        throw new BadRequestException('Points must be an integer');
      }
    }

    // Validate description if provided
    if (data.description !== undefined) {
      if (data.description && data.description.trim().length > 1000) {
        throw new BadRequestException('Description cannot exceed 1000 characters');
      }
      data.description = (data.description?.trim() || undefined) as any;
    }

    // Validate images if provided
    if (data.images !== undefined) {
      if (data.images.length > 3) {
        throw new BadRequestException('Maximum 3 images allowed per product');
      }
    }

    // Validate stock if provided
    if (data.stock !== undefined) {
      if (typeof data.stock !== 'number' || data.stock < 0) {
        throw new BadRequestException('Stock must be a non-negative number');
      }
    }

    Object.assign(product, data);
    return this.productsRepo.save(product);
  }

  async remove(id: string, clubId: string) {
    const product = await this.findOne(id, clubId);
    await this.productsRepo.remove(product);
  }
}

