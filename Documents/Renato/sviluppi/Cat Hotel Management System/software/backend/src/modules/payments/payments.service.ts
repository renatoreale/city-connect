import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Payment, PaymentType } from './entities/payment.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { CreatePaymentDto } from './dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async create(
    tenantId: string,
    dto: CreatePaymentDto,
    userId: string,
  ): Promise<Payment> {
    // Verify booking exists and belongs to tenant
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId, tenantId, deletedAt: IsNull() },
    });

    if (!booking) {
      throw new NotFoundException('Prenotazione non trovata');
    }

    // Validate that payments can be added in current status
    if ([BookingStatus.SCADUTA].includes(booking.status)) {
      throw new BadRequestException('Impossibile registrare pagamenti per prenotazioni scadute');
    }

    // Validate refund
    if (dto.paymentType === PaymentType.RIMBORSO && dto.amount > 0) {
      throw new BadRequestException('I rimborsi devono avere importo negativo');
    }

    // Validate non-refund payments
    if (dto.paymentType !== PaymentType.RIMBORSO && dto.amount < 0) {
      throw new BadRequestException('I pagamenti devono avere importo positivo');
    }

    const payment = this.paymentRepository.create({
      tenantId,
      bookingId: dto.bookingId,
      paymentType: dto.paymentType,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      paymentDate: new Date(dto.paymentDate),
      notes: dto.notes,
      createdBy: userId,
    });

    return this.paymentRepository.save(payment);
  }

  async findByBooking(bookingId: string, tenantId: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: { bookingId, tenantId },
      relations: ['createdByUser'],
      order: { paymentDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async findAll(
    tenantId: string,
    options?: {
      bookingId?: string;
      paymentType?: PaymentType;
      fromDate?: string;
      toDate?: string;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: Payment[]; total: number }> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('payment.createdByUser', 'user')
      .where('payment.tenantId = :tenantId', { tenantId });

    if (options?.bookingId) {
      queryBuilder.andWhere('payment.bookingId = :bookingId', { bookingId: options.bookingId });
    }

    if (options?.paymentType) {
      queryBuilder.andWhere('payment.paymentType = :paymentType', { paymentType: options.paymentType });
    }

    if (options?.fromDate) {
      queryBuilder.andWhere('payment.paymentDate >= :fromDate', { fromDate: options.fromDate });
    }

    if (options?.toDate) {
      queryBuilder.andWhere('payment.paymentDate <= :toDate', { toDate: options.toDate });
    }

    const [data, total] = await queryBuilder
      .skip(options?.skip || 0)
      .take(options?.take || 50)
      .orderBy('payment.paymentDate', 'DESC')
      .addOrderBy('payment.createdAt', 'DESC')
      .getManyAndCount();

    return { data, total };
  }

  async findById(id: string, tenantId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id, tenantId },
      relations: ['booking', 'booking.client', 'createdByUser'],
    });

    if (!payment) {
      throw new NotFoundException('Pagamento non trovato');
    }

    return payment;
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const payment = await this.findById(id, tenantId);
    await this.paymentRepository.delete(payment.id);
  }

  async getBookingBalance(bookingId: string): Promise<{
    totalAmount: number;
    totalPaid: number;
    balance: number;
    depositRequired: number;
    depositPaid: number;
    isDepositPaid: boolean;
  }> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Prenotazione non trovata');
    }

    const payments = await this.paymentRepository.find({
      where: { bookingId },
    });

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const depositPaid = payments
      .filter(p => p.paymentType === PaymentType.CAPARRA)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalAmount: Number(booking.totalAmount),
      totalPaid,
      balance: Number(booking.totalAmount) - totalPaid,
      depositRequired: Number(booking.depositRequired),
      depositPaid,
      isDepositPaid: depositPaid >= Number(booking.depositRequired),
    };
  }

  async getTenantSummary(
    tenantId: string,
    fromDate?: string,
    toDate?: string,
  ): Promise<{
    totalIncome: number;
    totalRefunds: number;
    netIncome: number;
    byType: Record<PaymentType, number>;
  }> {
    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .where('payment.tenantId = :tenantId', { tenantId });

    if (fromDate) {
      queryBuilder.andWhere('payment.paymentDate >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('payment.paymentDate <= :toDate', { toDate });
    }

    const payments = await queryBuilder.getMany();

    const byType: Record<PaymentType, number> = {
      [PaymentType.CAPARRA]: 0,
      [PaymentType.ACCONTO_CHECKIN]: 0,
      [PaymentType.SALDO_CHECKOUT]: 0,
      [PaymentType.EXTRA]: 0,
      [PaymentType.RIMBORSO]: 0,
    };

    let totalIncome = 0;
    let totalRefunds = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount);
      byType[payment.paymentType] += amount;

      if (payment.paymentType === PaymentType.RIMBORSO) {
        totalRefunds += Math.abs(amount);
      } else {
        totalIncome += amount;
      }
    }

    return {
      totalIncome,
      totalRefunds,
      netIncome: totalIncome - totalRefunds,
      byType,
    };
  }
}
