import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { UserRole } from '../entities/user.entity';
import { RegistrationService } from '../registration/registration.service';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { RejectRequestDto } from './dto/reject-request.dto';
import { MembershipsService } from '../memberships/memberships.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(RegistrationRequest)
    private regRepo: Repository<RegistrationRequest>,
    @InjectRepository(EmployeeAccessRequest)
    private employeeAccessRepo: Repository<EmployeeAccessRequest>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private registrationService: RegistrationService,
    private authService: AuthService,
    private mailService: MailService,
    private membershipsService: MembershipsService,
    private notificationsService: NotificationsService,
  ) {}

  async acceptRegistrationRequest(requestId: string): Promise<{
    message: string;
    credentials: { email: string; tempPassword: string; role: string; companyName: string };
    emailSent: boolean;
    previewUrl?: string;
  }> {
    const req = await this.registrationService.findById(requestId);
    if (!req) {
      throw new NotFoundException('Demande non trouvée');
    }
    if (req.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    // Vérifier qu'il n'y a pas déjà une entreprise avec ce nom
    const existingCompany = await this.companyRepo.findOne({ where: { name: req.companyName } });
    if (existingCompany) {
      throw new BadRequestException(`Une entreprise avec le nom "${req.companyName}" existe déjà sur la plateforme`);
    }

    // Vérifier qu'il n'y a pas déjà un utilisateur avec cet email
    const existingUser = await this.userRepo.findOne({ where: { email: req.email.toLowerCase() } });
    if (existingUser) {
      throw new BadRequestException(`Un utilisateur avec l'email "${req.email}" existe déjà sur la plateforme`);
    }

    const tempPassword = this.authService.generateTempPassword();

    const company = this.companyRepo.create({
      name: req.companyName,
      category: req.companyCategory,
      currency: 'USD',
      taxRate: 0,
    });
    const savedCompany = await this.companyRepo.save(company);

    const ownerUser = await this.authService.createUser(
      req.email,
      tempPassword,
      req.ownerName,
      UserRole.OWNER,
      savedCompany.id,
      true,
    );
    await this.membershipsService.assignMembership(
      ownerUser.id,
      savedCompany.id,
      UserRole.OWNER,
      true,
    );

    await this.notificationsService.createForUser({
      userId: ownerUser.id,
      type: 'registration_accepted',
      title: 'Inscription entreprise acceptée',
      message: `Votre entreprise ${req.companyName} a été validée. Vous pouvez vous connecter.`,
      link: '/dashboard',
    });

    savedCompany.ownerId = ownerUser.id;
    await this.companyRepo.save(savedCompany);

    req.status = RegistrationStatus.ACCEPTED;
    req.processedAt = new Date();
    await this.regRepo.save(req);

    // Envoyer l'email
    const emailResult = await this.mailService.sendRegistrationAccepted(
      req.email,
      req.ownerName,
      tempPassword,
    );

    console.log('═══════════════════════════════════════════');
    console.log('  ✅ INSCRIPTION ACCEPTÉE');
    console.log(`  Entreprise : ${req.companyName}`);
    console.log(`  Propriétaire : ${req.ownerName}`);
    console.log(`  Email : ${req.email}`);
    console.log(`  Mot de passe temporaire : ${tempPassword}`);
    console.log(`  Email envoyé : ${emailResult.sent ? 'Oui' : 'Non (voir console)'}`);
    if (emailResult.previewUrl) {
      console.log(`  👁️  Voir l'email : ${emailResult.previewUrl}`);
    }
    console.log('═══════════════════════════════════════════');

    return {
      message: 'Demande acceptée avec succès.',
      credentials: {
        email: req.email,
        tempPassword,
        role: 'Propriétaire (owner)',
        companyName: req.companyName,
      },
      emailSent: emailResult.sent,
      previewUrl: emailResult.previewUrl,
    };
  }

  async rejectRegistrationRequest(
    requestId: string,
    dto: RejectRequestDto,
  ): Promise<{
    message: string;
    emailSent: boolean;
    previewUrl?: string;
    rejectedUser: { email: string; name: string; reason: string };
  }> {
    const req = await this.registrationService.findById(requestId);
    if (!req) {
      throw new NotFoundException('Demande non trouvée');
    }
    if (req.status !== RegistrationStatus.PENDING) {
      throw new BadRequestException('Cette demande a déjà été traitée');
    }

    req.status = RegistrationStatus.REJECTED;
    req.rejectionReason = dto.rejectionReason;
    req.processedAt = new Date();
    await this.regRepo.save(req);

    // Envoyer l'email de rejet
    const emailResult = await this.mailService.sendRegistrationRejected(
      req.email,
      req.ownerName,
      dto.rejectionReason,
    );

    console.log('═══════════════════════════════════════════');
    console.log('  ❌ INSCRIPTION REJETÉE');
    console.log(`  Entreprise : ${req.companyName}`);
    console.log(`  Demandeur : ${req.ownerName} (${req.email})`);
    console.log(`  Motif : ${dto.rejectionReason}`);
    console.log(`  Email envoyé : ${emailResult.sent ? 'Oui' : 'Non (voir console)'}`);
    if (emailResult.previewUrl) {
      console.log(`  👁️  Voir l'email : ${emailResult.previewUrl}`);
    }
    console.log('═══════════════════════════════════════════');

    return {
      message: 'Demande rejetée.',
      emailSent: emailResult.sent,
      previewUrl: emailResult.previewUrl,
      rejectedUser: {
        email: req.email,
        name: req.ownerName,
        reason: dto.rejectionReason,
      },
    };
  }

  async getRegistrationRequests(): Promise<RegistrationRequest[]> {
    return this.registrationService.findAll();
  }

  async getPendingRegistrationRequests(): Promise<RegistrationRequest[]> {
    return this.registrationService.findAllPending();
  }

  async purgeRegistrationRequest(requestId: string): Promise<{
    message: string;
    deletedRequestId: string;
    deletedCompany: boolean;
    deletedUsersCount: number;
  }> {
    const req = await this.registrationService.findById(requestId);
    if (!req) {
      throw new NotFoundException('Demande non trouvée');
    }

    let deletedCompany = false;
    let deletedUsersCount = 0;

    // Si la demande avait été acceptée, supprimer aussi les données du tenant
    if (req.status === RegistrationStatus.ACCEPTED) {
      const company = await this.companyRepo.findOne({ where: { name: req.companyName } });
      if (company) {
        const usersDeleteResult = await this.userRepo.delete({ companyId: company.id });
        deletedUsersCount = usersDeleteResult.affected || 0;
        await this.companyRepo.delete(company.id);
        deletedCompany = true;
      }
    }

    await this.regRepo.delete(req.id);

    return {
      message:
        req.status === RegistrationStatus.ACCEPTED
          ? "Demande supprimée, entreprise et utilisateurs associés supprimés."
          : 'Demande supprimée avec succès.',
      deletedRequestId: req.id,
      deletedCompany,
      deletedUsersCount,
    };
  }

  async getEmployeeAccessRequests(): Promise<EmployeeAccessRequest[]> {
    return this.registrationService.findAllEmployeeAccessRequests();
  }

  async acceptEmployeeAccessRequest(requestId: string): Promise<{
    message: string;
    credentials: { email: string; tempPassword: string; role: string; companyName: string };
    emailSent: boolean;
    previewUrl?: string;
  }> {
    const req = await this.registrationService.findEmployeeAccessRequestById(
      requestId,
    );
    if (!req) {
      throw new NotFoundException('Demande employé non trouvée');
    }
    if (req.status !== EmployeeAccessRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande employé a déjà été traitée');
    }

    const company = await this.companyRepo.findOne({
      where: { name: req.companyName },
    });
    if (!company) {
      throw new BadRequestException(
        `Entreprise introuvable: "${req.companyName}".`,
      );
    }

    const existingUser = await this.userRepo.findOne({
      where: { email: req.email.toLowerCase() },
    });
    if (existingUser) {
      throw new BadRequestException(
        `Un utilisateur avec l'email "${req.email}" existe déjà sur la plateforme`,
      );
    }

    const tempPassword = this.authService.generateTempPassword();
    const user = await this.authService.createUser(
      req.email,
      tempPassword,
      req.fullName,
      req.desiredRole,
      company.id,
      true,
    );
    await this.membershipsService.assignMembership(
      user.id,
      company.id,
      req.desiredRole,
      true,
    );

    await this.notificationsService.createForUser({
      userId: user.id,
      type: 'employee_access_accepted',
      title: 'Compte employé validé',
      message: `Votre accès à ${company.name} a été validé par l'administrateur.`,
      link: '/dashboard',
    });

    req.status = EmployeeAccessRequestStatus.ACCEPTED;
    req.processedAt = new Date();
    await this.employeeAccessRepo.save(req);

    const roleLabel =
      req.desiredRole === UserRole.MANAGER
        ? 'Manager'
        : req.desiredRole === UserRole.ACCOUNTANT
        ? 'Comptable'
        : 'Employé';
    const emailResult = await this.mailService.sendEmployeeInvite(
      req.email,
      req.fullName,
      roleLabel,
      company.name,
      tempPassword,
    );

    return {
      message: 'Demande employé acceptée avec succès.',
      credentials: {
        email: req.email,
        tempPassword,
        role: roleLabel,
        companyName: company.name,
      },
      emailSent: emailResult.sent,
      previewUrl: emailResult.previewUrl,
    };
  }

  async rejectEmployeeAccessRequest(
    requestId: string,
    dto: RejectRequestDto,
  ): Promise<{
    message: string;
    emailSent: boolean;
    previewUrl?: string;
    rejectedUser: { email: string; name: string; reason: string };
  }> {
    const req = await this.registrationService.findEmployeeAccessRequestById(
      requestId,
    );
    if (!req) {
      throw new NotFoundException('Demande employé non trouvée');
    }
    if (req.status !== EmployeeAccessRequestStatus.PENDING) {
      throw new BadRequestException('Cette demande employé a déjà été traitée');
    }

    req.status = EmployeeAccessRequestStatus.REJECTED;
    req.rejectionReason = dto.rejectionReason;
    req.processedAt = new Date();
    await this.employeeAccessRepo.save(req);

    const emailResult = await this.mailService.sendEmployeeAccessRequestRejected(
      req.email,
      req.fullName,
      req.companyName,
      dto.rejectionReason,
    );

    return {
      message: 'Demande employé rejetée.',
      emailSent: emailResult.sent,
      previewUrl: emailResult.previewUrl,
      rejectedUser: {
        email: req.email,
        name: req.fullName,
        reason: dto.rejectionReason,
      },
    };
  }
}
