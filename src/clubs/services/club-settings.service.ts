import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClubSettings } from '../entities/club-settings.entity';
import { Club } from '../club.entity';

@Injectable()
export class ClubSettingsService {
  constructor(
    @InjectRepository(ClubSettings) private readonly settingsRepo: Repository<ClubSettings>,
    @InjectRepository(Club) private readonly clubsRepo: Repository<Club>
  ) {}

  async getSetting(clubId: string, key: string): Promise<string | Record<string, unknown> | null> {
    if (!key || !key.trim()) {
      throw new BadRequestException('Setting key is required');
    }

    const setting = await this.settingsRepo.findOne({
      where: { club: { id: clubId }, key: key.trim() }
    });
    if (!setting) return null;
    return setting.jsonValue || setting.value;
  }

  async setSetting(clubId: string, key: string, value: string | Record<string, unknown>) {
    if (!key || !key.trim()) {
      throw new BadRequestException('Setting key is required');
    }
    if (value === null || value === undefined) {
      throw new BadRequestException('Setting value cannot be null or undefined');
    }

    const club = await this.clubsRepo.findOne({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club not found');

    let setting = await this.settingsRepo.findOne({
      where: { club: { id: clubId }, key }
    });

    if (setting) {
      if (typeof value === 'object') {
        setting.jsonValue = value;
        setting.value = null;
      } else {
        setting.value = value;
        setting.jsonValue = null;
      }
    } else {
      setting = this.settingsRepo.create({
        club,
        key,
        value: typeof value === 'string' ? value : null,
        jsonValue: typeof value === 'object' ? value : null
      });
    }

    return this.settingsRepo.save(setting);
  }

  async getAllSettings(clubId: string) {
    const settings = await this.settingsRepo.find({
      where: { club: { id: clubId } }
    });

    const result: Record<string, string | Record<string, unknown>> = {};
    for (const setting of settings) {
      result[setting.key] = setting.jsonValue || setting.value || '';
    }
    return result;
  }
}

