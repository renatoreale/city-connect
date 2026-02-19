import { Injectable, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { Payment, PaymentType } from '../payments/entities/payment.entity';
import { StaffTask, StaffTaskStatus } from '../staff-tasks/entities/staff-task.entity';

@Injectable()
export class ReportsService {
  constructor(private dataSource: DataSource) {}

  // ─── Validazione date ─────────────────────────────────────────────

  private validateDateRange(from: string, to: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      throw new BadRequestException('Le date devono essere nel formato YYYY-MM-DD.');
    }
    if (from > to) {
      throw new BadRequestException('La data "from" deve essere precedente o uguale a "to".');
    }
    const days = (new Date(to).getTime() - new Date(from).getTime()) / (1000 * 60 * 60 * 24);
    if (days > 366) {
      throw new BadRequestException('Il periodo non può superare 366 giorni.');
    }
  }

  // ─── Overview (KPI dashboard) ──────────────────────────────────────

  async getOverview(tenantId: string): Promise<{
    today: { arrivals: number; departures: number; inStay: number; pendingTasks: number };
    currentMonth: { bookings: number; revenue: number };
  }> {
    const today = new Date().toISOString().substring(0, 10);
    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .substring(0, 10);

    const bookingRepo = this.dataSource.getRepository(Booking);
    const paymentRepo = this.dataSource.getRepository(Payment);
    const taskRepo = this.dataSource.getRepository(StaffTask);

    const [
      todayArrivals,
      todayDepartures,
      inStay,
      pendingTasks,
      monthBookings,
      monthRevenueResult,
    ] = await Promise.all([
      bookingRepo
        .createQueryBuilder('b')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.check_in_date = :today', { today })
        .andWhere('b.status NOT IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLATA, BookingStatus.RIMBORSATA, BookingStatus.SCADUTA],
        })
        .andWhere('b.deleted_at IS NULL')
        .getCount(),

      bookingRepo
        .createQueryBuilder('b')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.check_out_date = :today', { today })
        .andWhere('b.status NOT IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLATA, BookingStatus.RIMBORSATA, BookingStatus.SCADUTA],
        })
        .andWhere('b.deleted_at IS NULL')
        .getCount(),

      bookingRepo
        .createQueryBuilder('b')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.CHECK_IN, BookingStatus.IN_CORSO],
        })
        .andWhere('b.deleted_at IS NULL')
        .getCount(),

      taskRepo
        .createQueryBuilder('t')
        .where('t.tenantId = :tenantId', { tenantId })
        .andWhere('t.dueDate = :today', { today })
        .andWhere('t.status = :status', { status: StaffTaskStatus.PENDING })
        .andWhere('t.deletedAt IS NULL')
        .getCount(),

      bookingRepo
        .createQueryBuilder('b')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.check_in_date >= :start', { start: monthStart })
        .andWhere('b.check_in_date <= :end', { end: monthEnd })
        .andWhere('b.status NOT IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLATA, BookingStatus.SCADUTA],
        })
        .andWhere('b.deleted_at IS NULL')
        .getCount(),

      paymentRepo
        .createQueryBuilder('p')
        .select('SUM(p.amount)', 'total')
        .where('p.tenant_id = :tenantId', { tenantId })
        .andWhere('p.payment_date >= :start', { start: monthStart })
        .andWhere('p.payment_date <= :end', { end: monthEnd })
        .andWhere('p.payment_type != :type', { type: PaymentType.RIMBORSO })
        .getRawOne(),
    ]);

    return {
      today: {
        arrivals: todayArrivals,
        departures: todayDepartures,
        inStay,
        pendingTasks,
      },
      currentMonth: {
        bookings: monthBookings,
        revenue: Math.round(parseFloat(monthRevenueResult?.total || '0') * 100) / 100,
      },
    };
  }

  // ─── Occupancy report ─────────────────────────────────────────────

  async getOccupancy(tenantId: string, from: string, to: string): Promise<{
    from: string;
    to: string;
    totalCatNights: number;
    avgDailyOccupancy: number;
    peakDay: string;
    peakDayCats: number;
    days: { date: string; cats: number; bookings: number }[];
  }> {
    this.validateDateRange(from, to);

    const bookings = await this.dataSource
      .getRepository(Booking)
      .createQueryBuilder('b')
      .select(['b.checkInDate', 'b.checkOutDate', 'b.numberOfCats'])
      .where('b.tenant_id = :tenantId', { tenantId })
      .andWhere('b.check_in_date <= :to', { to })
      .andWhere('b.check_out_date > :from', { from })
      .andWhere('b.status NOT IN (:...statuses)', {
        statuses: [BookingStatus.CANCELLATA, BookingStatus.RIMBORSATA, BookingStatus.SCADUTA],
      })
      .andWhere('b.deleted_at IS NULL')
      .getMany();

    const dailyMap: Record<string, { date: string; cats: number; bookings: number }> = {};

    const fromDate = new Date(from);
    const toDate = new Date(to);
    const cursor = new Date(fromDate);
    while (cursor <= toDate) {
      const key = cursor.toISOString().substring(0, 10);
      dailyMap[key] = { date: key, cats: 0, bookings: 0 };
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const booking of bookings) {
      const checkIn = new Date(String(booking.checkInDate).substring(0, 10));
      const checkOut = new Date(String(booking.checkOutDate).substring(0, 10));

      const dayStart = new Date(Math.max(checkIn.getTime(), fromDate.getTime()));
      // checkout day is not an overnight day (gatto parte, non dorme)
      const dayEnd = new Date(Math.min(checkOut.getTime() - 86400000, toDate.getTime()));

      const dayCursor = new Date(dayStart);
      while (dayCursor <= dayEnd) {
        const key = dayCursor.toISOString().substring(0, 10);
        if (dailyMap[key]) {
          dailyMap[key].cats += booking.numberOfCats;
          dailyMap[key].bookings += 1;
        }
        dayCursor.setDate(dayCursor.getDate() + 1);
      }
    }

    const days = Object.values(dailyMap);
    const totalCatNights = days.reduce((sum, d) => sum + d.cats, 0);
    const avgDailyOccupancy = days.length > 0
      ? Math.round((totalCatNights / days.length) * 10) / 10
      : 0;
    const peakDay = days.reduce(
      (max, d) => (d.cats > max.cats ? d : max),
      { date: '', cats: 0, bookings: 0 },
    );

    return {
      from,
      to,
      totalCatNights,
      avgDailyOccupancy,
      peakDay: peakDay.date,
      peakDayCats: peakDay.cats,
      days,
    };
  }

  // ─── Revenue report ───────────────────────────────────────────────

  async getRevenue(tenantId: string, from: string, to: string): Promise<{
    from: string;
    to: string;
    grossRevenue: number;
    refunds: number;
    netRevenue: number;
    byType: { type: string; total: number; count: number }[];
    monthly: { month: string; total: number; count: number }[];
  }> {
    this.validateDateRange(from, to);

    const paymentRepo = this.dataSource.getRepository(Payment);

    const [byType, monthly] = await Promise.all([
      paymentRepo
        .createQueryBuilder('p')
        .select('p.payment_type', 'type')
        .addSelect('SUM(p.amount)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('p.tenant_id = :tenantId', { tenantId })
        .andWhere('p.payment_date >= :from', { from })
        .andWhere('p.payment_date <= :to', { to })
        .groupBy('p.payment_type')
        .getRawMany(),

      paymentRepo
        .createQueryBuilder('p')
        .select("DATE_FORMAT(p.payment_date, '%Y-%m')", 'month')
        .addSelect('SUM(p.amount)', 'total')
        .addSelect('COUNT(*)', 'count')
        .where('p.tenant_id = :tenantId', { tenantId })
        .andWhere('p.payment_date >= :from', { from })
        .andWhere('p.payment_date <= :to', { to })
        .andWhere('p.payment_type != :type', { type: PaymentType.RIMBORSO })
        .groupBy("DATE_FORMAT(p.payment_date, '%Y-%m')")
        .orderBy('month', 'ASC')
        .getRawMany(),
    ]);

    const grossRevenue = byType
      .filter((r) => r.type !== PaymentType.RIMBORSO)
      .reduce((sum, r) => sum + parseFloat(r.total || '0'), 0);

    const refundEntry = byType.find((r) => r.type === PaymentType.RIMBORSO);
    const refundsTotal = parseFloat(refundEntry?.total || '0');
    const netRevenue = grossRevenue - refundsTotal;

    return {
      from,
      to,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      refunds: Math.round(refundsTotal * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      byType: byType.map((r) => ({
        type: r.type,
        total: Math.round(parseFloat(r.total || '0') * 100) / 100,
        count: parseInt(r.count, 10),
      })),
      monthly: monthly.map((r) => ({
        month: r.month,
        total: Math.round(parseFloat(r.total || '0') * 100) / 100,
        count: parseInt(r.count, 10),
      })),
    };
  }

  // ─── Bookings report ──────────────────────────────────────────────

  async getBookings(tenantId: string, from: string, to: string): Promise<{
    from: string;
    to: string;
    total: number;
    active: number;
    averageNights: number;
    averageCats: number;
    averageAmount: number;
    byStatus: { status: string; count: number; totalAmount: number }[];
    monthly: { month: string; count: number; totalNights: number; totalCats: number }[];
  }> {
    this.validateDateRange(from, to);

    const bookingRepo = this.dataSource.getRepository(Booking);

    const [byStatus, monthly, avgResult] = await Promise.all([
      bookingRepo
        .createQueryBuilder('b')
        .select('b.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(b.total_amount)', 'totalAmount')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.check_in_date >= :from', { from })
        .andWhere('b.check_in_date <= :to', { to })
        .andWhere('b.deleted_at IS NULL')
        .groupBy('b.status')
        .getRawMany(),

      bookingRepo
        .createQueryBuilder('b')
        .select("DATE_FORMAT(b.check_in_date, '%Y-%m')", 'month')
        .addSelect('COUNT(*)', 'count')
        .addSelect('SUM(b.number_of_nights)', 'totalNights')
        .addSelect('SUM(b.number_of_cats)', 'totalCats')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.check_in_date >= :from', { from })
        .andWhere('b.check_in_date <= :to', { to })
        .andWhere('b.status NOT IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLATA, BookingStatus.SCADUTA],
        })
        .andWhere('b.deleted_at IS NULL')
        .groupBy("DATE_FORMAT(b.check_in_date, '%Y-%m')")
        .orderBy('month', 'ASC')
        .getRawMany(),

      bookingRepo
        .createQueryBuilder('b')
        .select('AVG(b.number_of_nights)', 'avgNights')
        .addSelect('AVG(b.number_of_cats)', 'avgCats')
        .addSelect('AVG(b.total_amount)', 'avgAmount')
        .where('b.tenant_id = :tenantId', { tenantId })
        .andWhere('b.check_in_date >= :from', { from })
        .andWhere('b.check_in_date <= :to', { to })
        .andWhere('b.status NOT IN (:...statuses)', {
          statuses: [BookingStatus.CANCELLATA, BookingStatus.SCADUTA],
        })
        .andWhere('b.deleted_at IS NULL')
        .getRawOne(),
    ]);

    const total = byStatus.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const active = byStatus
      .filter((r) =>
        ![BookingStatus.CANCELLATA, BookingStatus.SCADUTA].includes(r.status),
      )
      .reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    return {
      from,
      to,
      total,
      active,
      averageNights: Math.round(parseFloat(avgResult?.avgNights || '0') * 10) / 10,
      averageCats: Math.round(parseFloat(avgResult?.avgCats || '0') * 10) / 10,
      averageAmount: Math.round(parseFloat(avgResult?.avgAmount || '0') * 100) / 100,
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
        totalAmount: Math.round(parseFloat(r.totalAmount || '0') * 100) / 100,
      })),
      monthly: monthly.map((r) => ({
        month: r.month,
        count: parseInt(r.count, 10),
        totalNights: parseInt(r.totalNights || '0', 10),
        totalCats: parseInt(r.totalCats || '0', 10),
      })),
    };
  }

  // ─── Tasks report ─────────────────────────────────────────────────

  async getTasks(tenantId: string, from: string, to: string): Promise<{
    from: string;
    to: string;
    total: number;
    completionRate: number;
    byStatus: { status: string; count: number }[];
    byType: { typeName: string; count: number; completedCount: number; completionRate: number }[];
  }> {
    this.validateDateRange(from, to);

    const taskRepo = this.dataSource.getRepository(StaffTask);

    const [byStatus, byType] = await Promise.all([
      taskRepo
        .createQueryBuilder('t')
        .select('t.status', 'status')
        .addSelect('COUNT(*)', 'count')
        .where('t.tenantId = :tenantId', { tenantId })
        .andWhere('t.dueDate >= :from', { from })
        .andWhere('t.dueDate <= :to', { to })
        .andWhere('t.deletedAt IS NULL')
        .groupBy('t.status')
        .getRawMany(),

      taskRepo
        .createQueryBuilder('t')
        .leftJoin('t.taskType', 'tt')
        .select('tt.name', 'typeName')
        .addSelect('COUNT(*)', 'count')
        .addSelect(
          `SUM(CASE WHEN t.status = '${StaffTaskStatus.COMPLETED}' THEN 1 ELSE 0 END)`,
          'completedCount',
        )
        .where('t.tenantId = :tenantId', { tenantId })
        .andWhere('t.dueDate >= :from', { from })
        .andWhere('t.dueDate <= :to', { to })
        .andWhere('t.deletedAt IS NULL')
        .groupBy('tt.name')
        .orderBy('count', 'DESC')
        .getRawMany(),
    ]);

    const total = byStatus.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const completedEntry = byStatus.find((r) => r.status === StaffTaskStatus.COMPLETED);
    const completedCount = parseInt(completedEntry?.count || '0', 10);
    const completionRate = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return {
      from,
      to,
      total,
      completionRate,
      byStatus: byStatus.map((r) => ({
        status: r.status,
        count: parseInt(r.count, 10),
      })),
      byType: byType.map((r) => {
        const count = parseInt(r.count, 10);
        const completed = parseInt(r.completedCount || '0', 10);
        return {
          typeName: r.typeName || 'Senza tipo',
          count,
          completedCount: completed,
          completionRate: count > 0 ? Math.round((completed / count) * 100) : 0,
        };
      }),
    };
  }
}
