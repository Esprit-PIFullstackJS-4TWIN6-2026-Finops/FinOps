import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../entities/client.entity';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly repo: Repository<Client>,
  ) {}

  findAll(companyId: string): Promise<Client[]> {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  create(companyId: string, dto: CreateClientDto): Promise<Client> {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }
}
