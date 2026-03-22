import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { Company } from '../entities/company.entity';
import {
  CompanyJoinRequest,
  CompanyJoinRequestStatus,
} from '../entities/company-join-request.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../entities/user.entity';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { EmailValidatorService } from '../mail/email-validator.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateCompanyDto } from './dto/create-company.dto';
import { CreateCompanyJoinRequestDto } from './dto/create-company-join-request.dto';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(CompanyJoinRequest)
    private joinRequestRepo: Repository<CompanyJoinRequest>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private authService: AuthService,
    private mailService: MailService,
    private emailValidator: EmailValidatorService,
    private membershipsService: MembershipsService,
    private notificationsService: NotificationsService,
  ) {}

  async findById(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({
      where: { id },
      relations: ['users'],
    });
    if (!company) throw new NotFoundException('Entreprise non trouvée');
    return company;
  }

  async getCompanyForUser(companyId: string, userId: string): Promise<Company> {
    const company = await this.findById(companyId);
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    await this.ensureUserCanAccessCompany(user, companyId);
    return company;
  }

  async findUserCompanies(userId: string): Promise<Company[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      return this.companyRepo.find({ order: { createdAt: 'DESC' } });
    }

    const ownedCompanies = await this.companyRepo.find({
      where: { ownerId: userId },
      order: { createdAt: 'DESC' },
    });

    const companyIds = new Set<string>();
    if (user.companyId) {
      companyIds.add(user.companyId);
    }
    for (const company of ownedCompanies) {
      companyIds.add(company.id);
    }

    if (!companyIds.size) {
      return [];
    }

    return this.companyRepo.find({
      where: { id: In([...companyIds]) },
      order: { createdAt: 'DESC' },
    });
  }

  async createCompany(
    userId: string,
    dto: CreateCompanyDto,
  ): Promise<Company> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    if (user.role !== UserRole.OWNER) {
      throw new ForbiddenException(
        'Seul un proprietaire peut creer plusieurs entreprises',
      );
    }

    const existingCompany = await this.companyRepo.findOne({
      where: { name: dto.name.trim() },
    });
    if (existingCompany) {
      throw new ConflictException(
        `Une entreprise avec le nom "${dto.name}" existe deja`,
      );
    }

    const company = this.companyRepo.create({
      name: dto.name.trim(),
      category: dto.category,
      ownerId: userId,
      address: dto.address,
      currency: dto.currency || 'USD',
      taxRate: 0,
    });
    const savedCompany = await this.companyRepo.save(company);
    await this.membershipsService.assignMembership(
      userId,
      savedCompany.id,
      UserRole.OWNER,
      false,
    );
    return savedCompany;
  }

  async switchCompany(
    companyId: string,
    userId: string,
  ): Promise<{ message: string; activeCompanyId: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    await this.ensureUserCanAccessCompany(user, companyId);

    user.companyId = companyId;
    user.activeCompanyId = companyId;
    await this.userRepo.save(user);

    return {
      message: 'Entreprise active mise a jour',
      activeCompanyId: companyId,
    };
  }

  async updateCompany(
    companyId: string,
    userId: string,
    dto: UpdateCompanyDto,
  ): Promise<Company> {
    await this.ensureUserCanManageCompany(userId, companyId);
    const company = await this.findById(companyId);

    // Vérifier si le nouveau nom n'est pas déjà pris par une autre entreprise
    if (dto.name && dto.name !== company.name) {
      const existingCompany = await this.companyRepo.findOne({
        where: { name: dto.name, id: Not(companyId) },
      });
      if (existingCompany) {
        throw new ConflictException(`Une entreprise avec le nom "${dto.name}" existe déjà`);
      }
    }

    Object.assign(company, dto);
    return this.companyRepo.save(company);
  }

  async getEmployees(companyId: string, userId: string): Promise<User[]> {
    await this.ensureUserCanManageCompany(userId, companyId);
    return this.userRepo.find({
      where: { companyId },
      relations: ['company'],
      select: ['id', 'email', 'name', 'role', 'avatarUrl', 'createdAt', 'companyId'],
    });
  }

  async createEmployee(
    companyId: string,
    userId: string,
    dto: CreateEmployeeDto,
  ): Promise<{ user: Partial<User>; tempPassword: string; emailSent: boolean; previewUrl?: string; role: string }> {
    const company = await this.findById(companyId);
    await this.ensureUserCanManageCompany(userId, companyId);

    // Vérifier que l'email existe réellement (domaine valide, MX records)
    const emailCheck = await this.emailValidator.validateEmail(dto.email);
    if (!emailCheck.valid) {
      throw new BadRequestException(
        emailCheck.reason || "L'adresse email de l'employé n'est pas valide ou n'existe pas.",
      );
    }

    // Vérifier si un utilisateur existe déjà avec cet email
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(
        `Un utilisateur avec l'email "${dto.email}" existe déjà. Chaque employé doit avoir un email unique.`,
      );
    }

    const tempPassword = this.authService.generateTempPassword();
    const user = await this.authService.createUser(
      dto.email,
      tempPassword,
      dto.name,
      dto.role,
      companyId,
      true,
    );
    await this.membershipsService.assignMembership(
      user.id,
      companyId,
      dto.role,
      true,
    );

    const roleLabel =
      dto.role === UserRole.MANAGER
        ? 'Manager'
        : dto.role === UserRole.ACCOUNTANT
        ? 'Comptable'
        : 'Employé';

    // Envoyer l'email d'invitation
    const emailResult = await this.mailService.sendEmployeeInvite(
      dto.email,
      dto.name,
      roleLabel,
      company.name,
      tempPassword,
    );

    console.log('═══════════════════════════════════════════');
    console.log('  👤 EMPLOYÉ CRÉÉ');
    console.log(`  Entreprise : ${company.name}`);
    console.log(`  Nom : ${dto.name}`);
    console.log(`  Email : ${dto.email}`);
    console.log(`  Rôle : ${roleLabel}`);
    console.log(`  Mot de passe temporaire : ${tempPassword}`);
    console.log(`  Email envoyé : ${emailResult.sent ? 'Oui' : 'Non (voir console)'}`);
    if (emailResult.previewUrl) {
      console.log(`  👁️  Voir l'email : ${emailResult.previewUrl}`);
    }
    console.log('═══════════════════════════════════════════');

    const { passwordHash, ...safeUser } = user;
    return { user: safeUser, tempPassword, emailSent: emailResult.sent, previewUrl: emailResult.previewUrl, role: roleLabel };
  }

  async discoverCompanies(userId: string): Promise<Company[]> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    return this.companyRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async createJoinRequest(
    userId: string,
    dto: CreateCompanyJoinRequestDto,
  ): Promise<CompanyJoinRequest> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }
    const company = await this.companyRepo.findOne({ where: { id: dto.companyId } });
    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    const hasMembership = await this.membershipsService.hasMembership(
      user.id,
      company.id,
    );
    if (hasMembership || user.companyId === company.id) {
      throw new ConflictException('Vous êtes déjà membre de cette entreprise.');
    }

    const alreadyPending = await this.joinRequestRepo.findOne({
      where: {
        requesterUserId: user.id,
        companyId: company.id,
        status: CompanyJoinRequestStatus.PENDING,
      },
    });
    if (alreadyPending) {
      throw new ConflictException(
        'Vous avez déjà une demande en attente pour cette entreprise.',
      );
    }

    const req = this.joinRequestRepo.create({
      requesterUserId: user.id,
      companyId: company.id,
      desiredRole: dto.desiredRole,
      profileDetails: dto.profileDetails?.trim() || undefined,
      status: CompanyJoinRequestStatus.PENDING,
    });
    const saved = await this.joinRequestRepo.save(req);

    if (company.ownerId) {
      await this.notificationsService.createForUser({
        userId: company.ownerId,
        type: 'join_request',
        title: 'Nouvelle demande pour rejoindre votre entreprise',
        message: `${user.name} (${user.email}) souhaite rejoindre ${company.name} comme ${dto.desiredRole}.`,
        link: `/companies/${company.id}/join-requests`,
      });
    }

    return saved;
  }

  async getMyJoinRequests(userId: string): Promise<CompanyJoinRequest[]> {
    return this.joinRequestRepo.find({
      where: { requesterUserId: userId },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCompanyJoinRequests(
    companyId: string,
    userId: string,
  ): Promise<CompanyJoinRequest[]> {
    await this.ensureUserCanManageCompany(userId, companyId);
    return this.joinRequestRepo.find({
      where: { companyId },
      relations: ['requesterUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async acceptJoinRequest(
    companyId: string,
    requestId: string,
    actorUserId: string,
  ): Promise<{ message: string }> {
    await this.ensureUserCanManageCompany(actorUserId, companyId);
    const req = await this.joinRequestRepo.findOne({
      where: { id: requestId, companyId },
      relations: ['requesterUser', 'company'],
    });
    if (!req) {
      throw new NotFoundException('Demande introuvable');
    }
    if (req.status !== CompanyJoinRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    await this.membershipsService.assignMembership(
      req.requesterUserId,
      req.companyId,
      req.desiredRole,
      false,
    );

    const requester = req.requesterUser;
    if (!requester.companyId) {
      requester.companyId = req.companyId;
      requester.activeCompanyId = req.companyId;
      await this.userRepo.save(requester);
    }

    req.status = CompanyJoinRequestStatus.ACCEPTED;
    req.processedAt = new Date();
    req.processedByUserId = actorUserId;
    await this.joinRequestRepo.save(req);

    await this.notificationsService.createForUser({
      userId: req.requesterUserId,
      type: 'join_request_accepted',
      title: 'Demande de rattachement acceptée',
      message: `Votre demande pour rejoindre ${req.company.name} a été acceptée.`,
      link: `/dashboard`,
    });

    return { message: 'Demande acceptée' };
  }

  async rejectJoinRequest(
    companyId: string,
    requestId: string,
    actorUserId: string,
    rejectionReason: string,
  ): Promise<{ message: string }> {
    await this.ensureUserCanManageCompany(actorUserId, companyId);
    const req = await this.joinRequestRepo.findOne({
      where: { id: requestId, companyId },
      relations: ['company'],
    });
    if (!req) {
      throw new NotFoundException('Demande introuvable');
    }
    if (req.status !== CompanyJoinRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    req.status = CompanyJoinRequestStatus.REJECTED;
    req.rejectionReason = rejectionReason;
    req.processedAt = new Date();
    req.processedByUserId = actorUserId;
    await this.joinRequestRepo.save(req);

    await this.notificationsService.createForUser({
      userId: req.requesterUserId,
      type: 'join_request_rejected',
      title: 'Demande de rattachement rejetée',
      message: `Votre demande pour rejoindre ${req.company.name} a été rejetée. Motif: ${rejectionReason}`,
      link: `/dashboard`,
    });

    return { message: 'Demande rejetée' };
  }

  private async ensureUserCanManageCompany(
    userId: string,
    companyId: string,
  ): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new ForbiddenException("Vous n'avez pas acces a cette entreprise");
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    if (user.role === UserRole.OWNER) {
      const isOwner = await this.companyRepo.exists({
        where: { id: companyId, ownerId: userId },
      });
      if (!isOwner) {
        throw new ForbiddenException(
          "Vous n'avez pas acces a cette entreprise",
        );
      }
      return;
    }

    if (user.role === UserRole.MANAGER && user.companyId === companyId) {
      return;
    }

    throw new ForbiddenException(
      'Droits insuffisants pour gerer cette entreprise',
    );
  }

  private async ensureUserCanAccessCompany(
    user: User,
    companyId: string,
  ): Promise<void> {
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    if (user.role === UserRole.OWNER) {
      const isOwner = await this.companyRepo.exists({
        where: { id: companyId, ownerId: user.id },
      });
      if (isOwner) {
        return;
      }
    }

    const hasMembership = await this.membershipsService.hasMembership(
      user.id,
      companyId,
    );
    if (hasMembership) {
      return;
    }

    if (user.companyId === companyId) {
      return;
    }

    throw new ForbiddenException("Vous n'avez pas acces a cette entreprise");
  }
}
