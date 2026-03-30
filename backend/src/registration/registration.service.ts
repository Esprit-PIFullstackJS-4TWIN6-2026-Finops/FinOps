import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RegistrationRequest } from '../entities/registration-request.entity';
import { RegistrationStatus } from '../entities/registration-request.entity';
import {
  EmployeeAccessRequest,
  EmployeeAccessRequestStatus,
} from '../entities/employee-access-request.entity';
import { Company } from '../entities/company.entity';
import { User } from '../entities/user.entity';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { RequestEmployeeAccessDto } from './dto/request-employee-access.dto';
import { EmailValidatorService } from '../mail/email-validator.service';
import { MailService } from '../mail/mail.service';
import { UserRole } from '../entities/user.entity';

@Injectable()
export class RegistrationService {
  constructor(
    @InjectRepository(RegistrationRequest)
    private repo: Repository<RegistrationRequest>,
    @InjectRepository(EmployeeAccessRequest)
    private employeeAccessRepo: Repository<EmployeeAccessRequest>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private emailValidator: EmailValidatorService,
    private mailService: MailService,
  ) {}

  async submitRequest(dto: RegisterBusinessDto): Promise<RegistrationRequest> {
    const email = dto.email.toLowerCase().trim();
    const companyName = dto.companyName.trim();

    // 0. Vérifier que l'adresse email existe réellement (domaine valide, MX records)
    const emailCheck = await this.emailValidator.validateEmail(email);
    if (!emailCheck.valid) {
      throw new BadRequestException(
        emailCheck.reason || "L'adresse email n'est pas valide ou n'existe pas.",
      );
    }

    // 1. Vérifier si une demande en attente existe déjà pour cet email
    const existingRequest = await this.repo.findOne({
      where: { email, status: RegistrationStatus.PENDING },
    });
    if (existingRequest) {
      throw new ConflictException(
        'Une demande en attente existe déjà pour cet email. Veuillez patienter pendant que l\'administrateur traite votre demande.',
      );
    }

    // 2. Vérifier si un utilisateur existe déjà avec cet email
    const existingUser = await this.userRepo.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException(
        'Un compte existe déjà avec cet email. Si vous avez déjà un compte, connectez-vous directement.',
      );
    }

    // 3. Vérifier si une entreprise existe déjà avec ce nom
    const existingCompany = await this.companyRepo.findOne({
      where: { name: companyName },
    });
    if (existingCompany) {
      throw new ConflictException(
        `Une entreprise avec le nom "${companyName}" existe déjà. Veuillez choisir un nom différent.`,
      );
    }

    // 4. Vérifier si une demande (pending ou accepted) existe déjà pour ce nom d'entreprise
    const existingCompanyRequest = await this.repo.findOne({
      where: [
        { companyName, status: RegistrationStatus.PENDING },
        { companyName, status: RegistrationStatus.ACCEPTED },
      ],
    });
    if (existingCompanyRequest) {
      throw new ConflictException(
        `Une demande pour l'entreprise "${companyName}" existe déjà. Veuillez choisir un nom différent.`,
      );
    }

    const req = this.repo.create({
      companyName,
      companyCategory: dto.companyCategory,
      email,
      ownerName: dto.ownerName.trim(),
      phone: dto.phone?.trim() || undefined,
      status: RegistrationStatus.PENDING,
    });
    const saved = await this.repo.save(req);

    // Best-effort admin notification email on each new owner request.
    const adminUsers = await this.userRepo.find({
      where: { role: UserRole.PLATFORM_ADMIN },
      select: ['email'],
    });
    const configured = (process.env.ADMIN_NOTIFICATION_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const recipients = [...new Set([...adminUsers.map((u) => u.email), ...configured])];
    if (recipients.length) {
      await Promise.allSettled(
        recipients.map((adminEmail) =>
          this.mailService.sendAdminRegistrationNotification(adminEmail, {
            companyName,
            companyCategory: dto.companyCategory,
            ownerName: dto.ownerName.trim(),
            ownerEmail: email,
            phone: dto.phone?.trim(),
          }),
        ),
      );
    }

    return saved;
  }

  async findAllPending(): Promise<RegistrationRequest[]> {
    return this.repo.find({
      where: { status: RegistrationStatus.PENDING },
      order: { createdAt: 'ASC' },
    });
  }

  async findById(id: string): Promise<RegistrationRequest | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findAll(): Promise<RegistrationRequest[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async submitEmployeeAccessRequest(
    dto: RequestEmployeeAccessDto,
  ): Promise<EmployeeAccessRequest> {
    const email = dto.email.toLowerCase().trim();
    const companyName = dto.companyName.trim();

    const emailCheck = await this.emailValidator.validateEmail(email);
    if (!emailCheck.valid) {
      throw new BadRequestException(
        emailCheck.reason || "L'adresse email n'est pas valide ou n'existe pas.",
      );
    }

    const existingUser = await this.userRepo.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException(
        'Un compte existe déjà avec cet email. Veuillez vous connecter.',
      );
    }

    const company = await this.companyRepo.findOne({ where: { name: companyName } });
    if (!company) {
      throw new BadRequestException(
        `Aucune entreprise "${companyName}" n'a été trouvée sur la plateforme.`,
      );
    }

    const duplicatePending = await this.employeeAccessRepo.findOne({
      where: {
        email,
        companyName,
        status: EmployeeAccessRequestStatus.PENDING,
      },
    });
    if (duplicatePending) {
      throw new ConflictException(
        'Une demande employé en attente existe déjà pour cet email et cette entreprise.',
      );
    }

    const req = this.employeeAccessRepo.create({
      fullName: dto.fullName.trim(),
      email,
      companyName,
      desiredRole: dto.desiredRole,
      status: EmployeeAccessRequestStatus.PENDING,
    });
    const saved = await this.employeeAccessRepo.save(req);

    const adminUsers = await this.userRepo.find({
      where: { role: UserRole.PLATFORM_ADMIN },
      select: ['email'],
    });
    const configured = (process.env.ADMIN_NOTIFICATION_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const recipients = [...new Set([...adminUsers.map((u) => u.email), ...configured])];
    if (recipients.length) {
      await Promise.allSettled(
        recipients.map((adminEmail) =>
          this.mailService.sendAdminEmployeeAccessRequestNotification(adminEmail, {
            fullName: dto.fullName.trim(),
            email,
            companyName,
            desiredRole: dto.desiredRole,
          }),
        ),
      );
    }

    return saved;
  }

  async findAllEmployeeAccessRequests(): Promise<EmployeeAccessRequest[]> {
    return this.employeeAccessRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findEmployeeAccessRequestById(
    id: string,
  ): Promise<EmployeeAccessRequest | null> {
    return this.employeeAccessRepo.findOne({ where: { id } });
  }
}
