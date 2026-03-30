import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from '../entities/activity-log.entity';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
  ) {}

  create(data: Partial<ActivityLog>) {
    return this.repo.save(this.repo.create(data));
  }

  findByCompany(companyId: string) {
    return this.repo.find({
      where: { companyId },
      relations: ['actor'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }
}
