/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { randomUUID } from 'crypto';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    const start = Date.now();
    const requestId = request.headers['x-request-id'] || randomUUID();
    const version = process.env.API_VERSION || '1.0.0';

    return next.handle().pipe(
      map((data) => {
        const elapsed = Date.now() - start;

        return {
          meta: {
            timestamp: Math.floor(Date.now() / 1000),
            version,
            messageService: request.route?.path || null,
            codeService: context.switchToHttp().getResponse().statusCode,
            requestId,
            responseId: randomUUID(),
            messageException: null,
            codeException: null,
            elapsedTimeMs: elapsed,
          },
          data,
        };
      }),
    );
  }
}
