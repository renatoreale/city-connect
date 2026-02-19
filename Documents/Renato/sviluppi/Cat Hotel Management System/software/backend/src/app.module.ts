import { Module, MiddlewareConsumer, NestModule, OnModuleInit, ClassSerializerInterceptor } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';

import { ScheduleModule } from '@nestjs/schedule';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { SecurityHeadersMiddleware } from './common/middleware/security-headers.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TenantSettingsModule } from './modules/tenants/tenant-settings.module';
import { RolesModule } from './modules/roles/roles.module';
import { AuditModule } from './modules/audit/audit.module';
import { ClientsModule } from './modules/clients/clients.module';
import { CatsModule } from './modules/cats/cats.module';
import { PriceListModule } from './modules/price-list/price-list.module';
import { SeasonalPeriodsModule } from './modules/seasonal-periods/seasonal-periods.module';
import { TenantPriceOverridesModule } from './modules/tenant-price-overrides/tenant-price-overrides.module';
import { DiscountRulesModule } from './modules/discount-rules/discount-rules.module';
import { PriceCalculationModule } from './modules/price-calculation/price-calculation.module';
import { QuotesModule } from './modules/quotes/quotes.module';
import { PdfModule } from './modules/pdf/pdf.module';
import { EmailTemplatesModule } from './modules/email-templates/email-templates.module';
import { EmailModule } from './modules/email/email.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AvailabilityModule } from './modules/availability/availability.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { StaffTasksModule } from './modules/staff-tasks/staff-tasks.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';

import { User } from './modules/users/entities/user.entity';
import { UserTenant } from './modules/users/entities/user-tenant.entity';
import { RefreshToken } from './modules/users/entities/refresh-token.entity';
import { Tenant } from './modules/tenants/entities/tenant.entity';
import { TenantSettings } from './modules/tenants/entities/tenant-settings.entity';
import { Role } from './modules/roles/entities/role.entity';
import { Permission } from './modules/roles/entities/permission.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { Client } from './modules/clients/entities/client.entity';
import { Cat } from './modules/cats/entities/cat.entity';
import { PriceListItem } from './modules/price-list/entities/price-list-item.entity';
import { SeasonalPeriod } from './modules/seasonal-periods/entities/seasonal-period.entity';
import { TenantPriceOverride } from './modules/tenant-price-overrides/entities/tenant-price-override.entity';
import { DiscountRule } from './modules/discount-rules/entities/discount-rule.entity';
import { Quote } from './modules/quotes/entities/quote.entity';
import { QuoteLineItem } from './modules/quotes/entities/quote-line-item.entity';
import { QuoteCat } from './modules/quotes/entities/quote-cat.entity';
import { EmailTemplate } from './modules/email-templates/entities/email-template.entity';
import { EmailLog } from './modules/email/entities/email-log.entity';
import { Booking } from './modules/bookings/entities/booking.entity';
import { BookingLineItem } from './modules/bookings/entities/booking-line-item.entity';
import { BookingCat } from './modules/bookings/entities/booking-cat.entity';
import { BookingStatusHistory } from './modules/bookings/entities/booking-status-history.entity';
import { BookingDailyOverride } from './modules/bookings/entities/booking-daily-override.entity';
import { Payment } from './modules/payments/entities/payment.entity';
import { AppointmentWeeklySchedule } from './modules/appointments/entities/appointment-weekly-schedule.entity';
import { Appointment } from './modules/appointments/entities/appointment.entity';
import { AppointmentReminder } from './modules/appointments/entities/appointment-reminder.entity';
import { StaffTaskType } from './modules/staff-tasks/entities/staff-task-type.entity';
import { StaffTask } from './modules/staff-tasks/entities/staff-task.entity';

import { seedDatabase } from './database/seeds/initial-seed';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.database'),
        entities: [User, UserTenant, RefreshToken, Tenant, TenantSettings, Role, Permission, AuditLog, Client, Cat, PriceListItem, SeasonalPeriod, TenantPriceOverride, DiscountRule, Quote, QuoteLineItem, QuoteCat, EmailTemplate, EmailLog, Booking, BookingLineItem, BookingCat, BookingStatusHistory, BookingDailyOverride, Payment, AppointmentWeeklySchedule, Appointment, AppointmentReminder, StaffTaskType, StaffTask],
        synchronize: configService.get<string>('APP_ENV') === 'development',
        logging: configService.get<string>('APP_ENV') === 'development',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    TenantsModule,
    TenantSettingsModule,
    RolesModule,
    AuditModule,
    ClientsModule,
    CatsModule,
    PriceListModule,
    SeasonalPeriodsModule,
    TenantPriceOverridesModule,
    DiscountRulesModule,
    PriceCalculationModule,
    QuotesModule,
    PdfModule,
    EmailTemplatesModule,
    EmailModule,
    BookingsModule,
    PaymentsModule,
    AvailabilityModule,
    AppointmentsModule,
    StaffTasksModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  constructor(private dataSource: DataSource) {}

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SecurityHeadersMiddleware).forRoutes('*');
    consumer.apply(TenantMiddleware).forRoutes('*');
  }

  async onModuleInit() {
    if (process.env.APP_ENV === 'development') {
      try {
        await seedDatabase(this.dataSource);
      } catch (error) {
        console.error('Seed error:', error.message);
      }
    }
  }
}
