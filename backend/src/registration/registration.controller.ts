import { Controller, Post, Body } from '@nestjs/common';
import { RegistrationService } from './registration.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { RequestEmployeeAccessDto } from './dto/request-employee-access.dto';

@Controller('registration')
export class RegistrationController {
  constructor(private registrationService: RegistrationService) {}

  @Post()
  async submit(@Body() dto: RegisterBusinessDto) {
    return this.registrationService.submitRequest(dto);
  }

  @Post('employee-access')
  async submitEmployeeAccess(@Body() dto: RequestEmployeeAccessDto) {
    return this.registrationService.submitEmployeeAccessRequest(dto);
  }
}
