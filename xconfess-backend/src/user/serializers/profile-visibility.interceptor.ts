import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { serializeProfile } from './profile-visibility.serializer';

@Injectable()
export class ProfileVisibilityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const viewerContext = {
      viewerId: user?.id,
      viewerRole: user?.role,
    };

    return next.handle().pipe(
      map((data) => {
        if (!data) return data;
        if (Array.isArray(data)) {
          return data.map((item) =>
            item && typeof item === 'object' && ('id' in item)
              ? serializeProfile(item, viewerContext)
              : item,
          );
        }
        if (typeof data === 'object' && ('id' in data)) {
          return serializeProfile(data, viewerContext);
        }
        return data;
      }),
    );
  }
}
