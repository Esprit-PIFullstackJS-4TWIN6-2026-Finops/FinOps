import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        if (!req.user?.id) {
          return;
        }

        const latency = Date.now() - startedAt;
        const path = (req.originalUrl || req.url || '').split('?')[0];
        const segments = path.split('/').filter(Boolean);
        const firstResource = segments[0] || 'system';
        const secondSegment = segments[1];
        const forwardedFor = req.headers['x-forwarded-for'];
        const ipAddress = Array.isArray(forwardedFor)
          ? forwardedFor[0]
          : forwardedFor || req.ip || req.socket?.remoteAddress;
        const entityId =
          secondSegment === 'me'
            ? req.user.id
            : secondSegment || req.user.id;

        void this.activityLogsService.create({
          actorUserId: req.user.id,
          companyId: req.user.activeCompanyId || req.user.companyId,
          action: `${req.method} ${path}`,
          entityType: firstResource,
          entityId,
          ipAddress,
          metadataJson: {
            statusCode: res?.statusCode,
            latencyMs: latency,
            userAgent: req.headers['user-agent'],
          },
        });
      }),
    );
  }
}
