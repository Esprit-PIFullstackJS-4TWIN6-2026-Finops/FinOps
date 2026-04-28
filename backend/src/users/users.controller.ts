import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, UserRole } from '../entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { RequestEmailVerificationDto } from './dto/request-email-verification.dto';
import { ConfirmEmailVerificationDto } from './dto/confirm-email-verification.dto';
import { ActivityHistoryQueryDto } from './dto/activity-history.query.dto';
import { ExportUsersQueryDto } from './dto/export-users.query.dto';
import { LockUserDto } from './dto/lock-user.dto';

const AVATAR_UPLOAD_DIR = join(process.cwd(), 'uploads', 'avatars');

const avatarStorage = diskStorage({
  destination: (_req, _file, callback) => {
    mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
    callback(null, AVATAR_UPLOAD_DIR);
  },
  filename: (_req, file, callback) => {
    const suffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = extname(file.originalname || '').toLowerCase() || '.png';
    callback(null, `avatar-${suffix}${extension}`);
  },
});

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: User) {
    return this.usersService.getCurrentUser(user.id);
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateCurrentUser(user.id, dto);
  }

  @Get('me/preferences')
  async getPreferences(@CurrentUser() user: User) {
    return this.usersService.getCurrentUserPreferences(user.id);
  }

  @Patch('me/preferences')
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdateUserPreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Post('me/avatar')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: avatarStorage,
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'image/gif',
        ];
        callback(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async uploadAvatar(
    @CurrentUser() user: User,
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Veuillez envoyer une image JPG, PNG, WEBP ou GIF de 5 Mo maximum.',
      );
    }

    const protocol =
      (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const publicBaseUrl = `${protocol}://${req.get('host')}`;
    return this.usersService.uploadAvatar(user.id, file.filename, publicBaseUrl);
  }

  @Post('me/email-verification/request')
  async requestEmailVerification(
    @CurrentUser() user: User,
    @Body() dto: RequestEmailVerificationDto,
  ) {
    return this.usersService.requestEmailVerification(user.id, dto);
  }

  @Post('me/email-verification/confirm')
  async confirmEmailVerification(
    @CurrentUser() user: User,
    @Body() dto: ConfirmEmailVerificationDto,
  ) {
    return this.usersService.confirmEmailVerification(user.id, dto);
  }

  @Get('me/activity')
  async myActivity(
    @CurrentUser() user: User,
    @Query() query: ActivityHistoryQueryDto,
  ) {
    return this.usersService.getMyActivity(user, user.id, query);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async stats(@CurrentUser() user: User) {
    return this.usersService.getUserStats(user);
  }

  @Get('export')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async exportUsers(
    @CurrentUser() user: User,
    @Query() query: ExportUsersQueryDto,
    @Res({ passthrough: true }) res: any,
  ) {
    const exportFile = await this.usersService.exportUsers(user, query);
    res.setHeader('Content-Type', exportFile.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exportFile.fileName}"`,
    );
    return exportFile.content;
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER, UserRole.MANAGER)
  async listUsers(
    @CurrentUser() user: User,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.listUsers(user, query);
  }

  @Patch(':id/lock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER)
  async lockUser(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: LockUserDto,
  ) {
    return this.usersService.lockUser(user, id, dto);
  }

  @Patch(':id/unlock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN, UserRole.OWNER)
  async unlockUser(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.unlockUser(user, id);
  }

  @Get(':id/activity')
  async userActivity(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Query() query: ActivityHistoryQueryDto,
  ) {
    return this.usersService.getUserActivity(user, id, query);
  }

  @Get(':id')
  async getOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.usersService.getUserById(user, id);
  }
}
