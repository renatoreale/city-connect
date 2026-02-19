import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * LoginThrottleGuard
 * Rate limiting in-memory per gli endpoint di autenticazione.
 * Limita i tentativi di login/refresh per IP a 10 per finestra di 15 minuti.
 *
 * Nota: in ambienti multi-istanza usare un rate limiter basato su Redis.
 */
@Injectable()
export class LoginThrottleGuard implements CanActivate {
  private readonly windowMs = 15 * 60 * 1000; // 15 minuti
  private readonly maxAttempts = 10;
  private readonly store = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.extractIp(request);
    const now = Date.now();

    // Filtra solo i timestamp nella finestra corrente
    const timestamps = (this.store.get(ip) ?? []).filter(
      (t) => now - t < this.windowMs,
    );

    if (timestamps.length >= this.maxAttempts) {
      const retryAfterSeconds = Math.ceil(
        (timestamps[0] + this.windowMs - now) / 1000,
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Troppi tentativi. Riprova tra ${retryAfterSeconds} secondi.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    timestamps.push(now);
    this.store.set(ip, timestamps);

    // Pulizia periodica dello store per evitare memory leak
    if (this.store.size > 5000) {
      for (const [key, times] of this.store.entries()) {
        if (times.every((t) => now - t >= this.windowMs)) {
          this.store.delete(key);
        }
      }
    }

    return true;
  }

  private extractIp(request: Request): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
