import { IsUUID, IsEnum, IsNumber, IsDateString, IsOptional, IsString } from 'class-validator';
import { PaymentType, PaymentMethod } from '../entities/payment.entity';

export class CreatePaymentDto {
  @IsUUID()
  bookingId: string;

  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @IsNumber()
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
