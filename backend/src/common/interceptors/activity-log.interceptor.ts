import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const latency = Date.now() - startedAt;
        const actor = req.user?.id || 'anonymous';
        const companyId = req.user?.companyId || null;
        const action = `${req.method} ${req.url}`;

        // Placeholder: persist via ActivityLogsService (infrastructure repository)
        console.log('[ACTIVITY]', { actor, companyId, action, latency });
      }),
    );
  }
}
