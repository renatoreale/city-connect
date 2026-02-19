import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

@Controller('api/v1/health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * GET /api/v1/health
   * Endpoint pubblico per verificare lo stato dell'applicazione.
   * Utile per load balancer, orchestratori (K8s) e monitoring.
   */
  @Public()
  @Get()
  async check(): Promise<{
    status: 'ok' | 'degraded';
    timestamp: string;
    uptime: number;
    database: 'ok' | 'error';
  }> {
    let dbStatus: 'ok' | 'error' = 'ok';

    try {
      await this.dataSource.query('SELECT 1');
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      database: dbStatus,
    };
  }
}
