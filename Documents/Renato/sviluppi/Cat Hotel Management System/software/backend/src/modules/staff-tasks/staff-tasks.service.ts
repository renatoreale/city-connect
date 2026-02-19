import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { StaffTaskType } from './entities/staff-task-type.entity';
import { StaffTask, StaffTaskStatus } from './entities/staff-task.entity';
import { Booking } from '../bookings/entities/booking.entity';
import {
  CreateStaffTaskTypeDto,
  UpdateStaffTaskTypeDto,
  CreateStaffTaskDto,
  UpdateStaffTaskDto,
  CompleteTaskDto,
  CancelTaskDto,
} from './dto';

@Injectable()
export class StaffTasksService {
  constructor(
    @InjectRepository(StaffTaskType)
    private taskTypeRepository: Repository<StaffTaskType>,
    @InjectRepository(StaffTask)
    private staffTaskRepository: Repository<StaffTask>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  // ─── Task Types (configurazione per pensione) ────────────────────

  async findAllTaskTypes(tenantId: string, includeInactive = false): Promise<StaffTaskType[]> {
    const where: any = { tenantId, deletedAt: IsNull() };
    if (!includeInactive) {
      where.isActive = true;
    }
    return this.taskTypeRepository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findTaskTypeById(id: string, tenantId: string): Promise<StaffTaskType> {
    const taskType = await this.taskTypeRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!taskType) {
      throw new NotFoundException('Tipo di compito non trovato');
    }
    return taskType;
  }

  async createTaskType(
    tenantId: string,
    dto: CreateStaffTaskTypeDto,
    userId: string,
  ): Promise<StaffTaskType> {
    const taskType = this.taskTypeRepository.create({
      tenantId,
      name: dto.name,
      color: dto.color ?? null,
      description: dto.description ?? null,
      isActive: dto.isActive ?? true,
      createdBy: userId,
      updatedBy: userId,
    });
    return this.taskTypeRepository.save(taskType);
  }

  async updateTaskType(
    id: string,
    tenantId: string,
    dto: UpdateStaffTaskTypeDto,
    userId: string,
  ): Promise<StaffTaskType> {
    const taskType = await this.findTaskTypeById(id, tenantId);
    Object.assign(taskType, { ...dto, updatedBy: userId });
    return this.taskTypeRepository.save(taskType);
  }

  async deleteTaskType(id: string, tenantId: string): Promise<void> {
    const taskType = await this.findTaskTypeById(id, tenantId);

    // Verifica che non ci siano compiti pendenti con questo tipo
    const activeTasks = await this.staffTaskRepository.count({
      where: {
        taskTypeId: id,
        tenantId,
        deletedAt: IsNull(),
        status: StaffTaskStatus.PENDING,
      },
    });
    if (activeTasks > 0) {
      throw new BadRequestException(
        `Impossibile eliminare il tipo: esistono ${activeTasks} compiti pendenti che lo utilizzano.`,
      );
    }

    await this.taskTypeRepository.softDelete(taskType.id);
  }

  // ─── Staff Tasks ──────────────────────────────────────────────────

  async findAll(
    tenantId: string,
    options?: {
      date?: string;
      from?: string;
      to?: string;
      assignedToUserId?: string;
      status?: StaffTaskStatus;
      bookingId?: string;
    },
  ): Promise<StaffTask[]> {
    const qb = this.staffTaskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.taskType', 'taskType')
      .leftJoinAndSelect('task.booking', 'booking')
      .leftJoinAndSelect('booking.client', 'client')
      .leftJoinAndSelect('booking.bookingCats', 'bookingCats')
      .leftJoinAndSelect('bookingCats.cat', 'cat')
      .leftJoinAndSelect('task.assignedToUser', 'assignedToUser')
      .leftJoinAndSelect('task.completedByUser', 'completedByUser')
      .where('task.tenantId = :tenantId', { tenantId })
      .andWhere('task.deletedAt IS NULL');

    if (options?.date) {
      qb.andWhere('task.dueDate = :date', { date: options.date });
    } else if (options?.from && options?.to) {
      qb.andWhere('task.dueDate BETWEEN :from AND :to', { from: options.from, to: options.to });
    }

    if (options?.assignedToUserId) {
      qb.andWhere('task.assignedToUserId = :userId', { userId: options.assignedToUserId });
    }

    if (options?.status) {
      qb.andWhere('task.status = :status', { status: options.status });
    }

    if (options?.bookingId) {
      qb.andWhere('task.bookingId = :bookingId', { bookingId: options.bookingId });
    }

    return qb
      .orderBy('task.dueDate', 'ASC')
      .addOrderBy('task.dueTime', 'ASC')
      .addOrderBy('taskType.name', 'ASC')
      .getMany();
  }

  async getCalendar(
    tenantId: string,
    from: string,
    to: string,
    assignedToUserId?: string,
  ): Promise<Record<string, StaffTask[]>> {
    const tasks = await this.findAll(tenantId, { from, to, assignedToUserId });

    const grouped: Record<string, StaffTask[]> = {};
    for (const task of tasks) {
      const dateKey = String(task.dueDate).substring(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(task);
    }
    return grouped;
  }

  async getToday(tenantId: string, assignedToUserId?: string): Promise<StaffTask[]> {
    const today = new Date().toISOString().substring(0, 10);
    return this.findAll(tenantId, { date: today, assignedToUserId });
  }

  async findById(id: string, tenantId: string): Promise<StaffTask> {
    const task = await this.staffTaskRepository.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: [
        'taskType',
        'booking',
        'booking.client',
        'booking.bookingCats',
        'booking.bookingCats.cat',
        'assignedToUser',
        'completedByUser',
      ],
    });
    if (!task) {
      throw new NotFoundException('Compito non trovato');
    }
    return task;
  }

  async create(
    tenantId: string,
    dto: CreateStaffTaskDto,
    userId: string,
  ): Promise<StaffTask> {
    // Valida il tipo di compito
    await this.findTaskTypeById(dto.taskTypeId, tenantId);

    // Valida la prenotazione se fornita
    if (dto.bookingId) {
      const booking = await this.bookingRepository.findOne({
        where: { id: dto.bookingId, tenantId, deletedAt: IsNull() },
      });
      if (!booking) {
        throw new NotFoundException('Prenotazione non trovata');
      }
    }

    const task = this.staffTaskRepository.create({
      tenantId,
      taskTypeId: dto.taskTypeId,
      bookingId: dto.bookingId ?? null,
      assignedToUserId: dto.assignedToUserId ?? null,
      dueDate: new Date(dto.dueDate) as any,
      dueTime: dto.dueTime ?? null,
      notes: dto.notes ?? null,
      status: StaffTaskStatus.PENDING,
      completedAt: null,
      completedByUserId: null,
      completionNotes: null,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.staffTaskRepository.save(task);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateStaffTaskDto,
    userId: string,
  ): Promise<StaffTask> {
    const task = await this.findById(id, tenantId);

    if ([StaffTaskStatus.COMPLETED, StaffTaskStatus.CANCELLED].includes(task.status)) {
      throw new BadRequestException(
        `Impossibile modificare un compito già ${task.status === StaffTaskStatus.COMPLETED ? 'completato' : 'cancellato'}.`,
      );
    }

    if (dto.taskTypeId) {
      await this.findTaskTypeById(dto.taskTypeId, tenantId);
    }

    if (dto.bookingId) {
      const booking = await this.bookingRepository.findOne({
        where: { id: dto.bookingId, tenantId, deletedAt: IsNull() },
      });
      if (!booking) {
        throw new NotFoundException('Prenotazione non trovata');
      }
    }

    const updates: Partial<StaffTask> = { updatedBy: userId };
    if (dto.taskTypeId !== undefined) updates.taskTypeId = dto.taskTypeId;
    if (dto.bookingId !== undefined) updates.bookingId = dto.bookingId;
    if (dto.assignedToUserId !== undefined) updates.assignedToUserId = dto.assignedToUserId;
    if (dto.dueDate !== undefined) updates.dueDate = new Date(dto.dueDate) as any;
    if (dto.dueTime !== undefined) updates.dueTime = dto.dueTime;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    Object.assign(task, updates);
    await this.staffTaskRepository.save(task);
    return this.findById(id, tenantId);
  }

  async completeTask(
    id: string,
    tenantId: string,
    dto: CompleteTaskDto,
    userId: string,
  ): Promise<StaffTask> {
    const task = await this.findById(id, tenantId);

    if (task.status === StaffTaskStatus.COMPLETED) {
      throw new BadRequestException('Il compito è già completato.');
    }
    if (task.status === StaffTaskStatus.CANCELLED) {
      throw new BadRequestException('Impossibile completare un compito cancellato.');
    }

    task.status = StaffTaskStatus.COMPLETED;
    task.completedAt = new Date();
    task.completedByUserId = userId;
    task.completionNotes = dto.completionNotes ?? null;
    task.updatedBy = userId;

    await this.staffTaskRepository.save(task);
    return this.findById(id, tenantId);
  }

  async cancelTask(
    id: string,
    tenantId: string,
    dto: CancelTaskDto,
    userId: string,
  ): Promise<StaffTask> {
    const task = await this.findById(id, tenantId);

    if (task.status === StaffTaskStatus.COMPLETED) {
      throw new BadRequestException('Impossibile cancellare un compito già completato.');
    }
    if (task.status === StaffTaskStatus.CANCELLED) {
      throw new BadRequestException('Il compito è già cancellato.');
    }

    task.status = StaffTaskStatus.CANCELLED;
    task.completionNotes = dto.completionNotes ?? null;
    task.updatedBy = userId;

    await this.staffTaskRepository.save(task);
    return this.findById(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const task = await this.findById(id, tenantId);
    await this.staffTaskRepository.softDelete(task.id);
  }

  async getBookingTasks(bookingId: string, tenantId: string): Promise<StaffTask[]> {
    return this.findAll(tenantId, { bookingId });
  }
}
