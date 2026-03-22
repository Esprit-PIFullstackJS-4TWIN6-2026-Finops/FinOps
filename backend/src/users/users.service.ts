import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  async getCurrentUser(id: string) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['company'],
      select: [
        'id',
        'email',
        'name',
        'role',
        'companyId',
        'avatarUrl',
        'mustChangePassword',
      ],
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }
}
