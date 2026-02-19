import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * SecurityHeadersMiddleware
 * Imposta header HTTP di sicurezza su ogni risposta.
 * Sostituisce l'utilizzo di helmet per ridurre le dipendenze esterne.
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(_req: Request, res: Response, next: NextFunction): void {
    // Impedisce al browser di inferire il MIME type
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Impedisce che la pagina sia incorporata in un iframe (clickjacking)
    res.setHeader('X-Frame-Options', 'DENY');

    // Abilita il filtro XSS del browser (legacy, ma comunque utile)
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Controlla le informazioni di referrer inviate alle richieste esterne
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Disabilita funzionalità del browser non necessarie per un'API
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=()',
    );

    // Rimuove il banner che rivela la tecnologia server
    res.removeHeader('X-Powered-By');

    next();
  }
}
