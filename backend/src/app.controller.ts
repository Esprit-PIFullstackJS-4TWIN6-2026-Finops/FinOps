import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'FinOps SaaS Platform API',
      status: 'running',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        health: 'GET /health',
        login: 'POST /auth/login',
        register: 'POST /registration',
        me: 'GET /users/me',
      },
    };
  }

  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
