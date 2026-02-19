import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, FindOptionsWhere } from 'typeorm';
import { EmailTemplate } from './entities/email-template.entity';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto } from './dto';

@Injectable()
export class EmailTemplatesService {
  constructor(
    @InjectRepository(EmailTemplate)
    private templateRepository: Repository<EmailTemplate>,
  ) {}

  async create(
    createDto: CreateEmailTemplateDto,
    userId: string,
    tenantId?: string,
  ): Promise<EmailTemplate> {
    // Check for duplicate code in the same scope (tenant or global)
    const existing = await this.templateRepository.findOne({
      where: {
        code: createDto.code,
        tenantId: tenantId || IsNull(),
      } as FindOptionsWhere<EmailTemplate>,
    });

    if (existing) {
      throw new ConflictException(`Template con codice "${createDto.code}" già esistente`);
    }

    const template = this.templateRepository.create({
      ...createDto,
      tenantId: tenantId || null,
      createdBy: userId,
      updatedBy: userId,
    });

    return this.templateRepository.save(template);
  }

  async findAll(options?: {
    tenantId?: string;
    includeGlobal?: boolean;
    isActive?: boolean;
    code?: string;
  }): Promise<EmailTemplate[]> {
    const queryBuilder = this.templateRepository.createQueryBuilder('template');

    if (options?.tenantId) {
      if (options.includeGlobal !== false) {
        queryBuilder.andWhere(
          '(template.tenantId = :tenantId OR template.tenantId IS NULL)',
          { tenantId: options.tenantId },
        );
      } else {
        queryBuilder.andWhere('template.tenantId = :tenantId', {
          tenantId: options.tenantId,
        });
      }
    } else {
      // Only global templates
      queryBuilder.andWhere('template.tenantId IS NULL');
    }

    if (options?.isActive !== undefined) {
      queryBuilder.andWhere('template.isActive = :isActive', {
        isActive: options.isActive,
      });
    }

    if (options?.code) {
      queryBuilder.andWhere('template.code = :code', { code: options.code });
    }

    return queryBuilder
      .orderBy('template.code', 'ASC')
      .addOrderBy('template.tenantId', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['tenant'],
    });

    if (!template) {
      throw new NotFoundException('Template email non trovato');
    }

    return template;
  }

  async findByCode(code: string, tenantId?: string): Promise<EmailTemplate> {
    // First try to find tenant-specific template
    if (tenantId) {
      const tenantTemplate = await this.templateRepository.findOne({
        where: { code, tenantId, isActive: true },
      });
      if (tenantTemplate) {
        return tenantTemplate;
      }
    }

    // Fallback to global template
    const globalTemplate = await this.templateRepository.findOne({
      where: { code, tenantId: IsNull(), isActive: true } as FindOptionsWhere<EmailTemplate>,
    });

    if (!globalTemplate) {
      throw new NotFoundException(`Template con codice "${code}" non trovato`);
    }

    return globalTemplate;
  }

  async update(
    id: string,
    updateDto: UpdateEmailTemplateDto,
    userId: string,
  ): Promise<EmailTemplate> {
    const template = await this.findById(id);

    Object.assign(template, updateDto, { updatedBy: userId });
    return this.templateRepository.save(template);
  }

  async delete(id: string): Promise<void> {
    const template = await this.findById(id);
    await this.templateRepository.softDelete(template.id);
  }

  /**
   * Get all available template variables with descriptions
   */
  getAvailableVariables(): { category: string; variables: { name: string; description: string }[] }[] {
    return [
      {
        category: 'Cliente',
        variables: [
          { name: '{{client_full_name}}', description: 'Nome completo cliente' },
          { name: '{{client_first_name}}', description: 'Nome' },
          { name: '{{client_last_name}}', description: 'Cognome' },
          { name: '{{client_email}}', description: 'Email cliente' },
          { name: '{{client_phone}}', description: 'Telefono cliente' },
          { name: '{{client_address}}', description: 'Indirizzo completo' },
        ],
      },
      {
        category: 'Preventivo',
        variables: [
          { name: '{{quote_number}}', description: 'Numero preventivo' },
          { name: '{{quote_date}}', description: 'Data creazione preventivo' },
          { name: '{{quote_valid_until}}', description: 'Data validità preventivo' },
          { name: '{{check_in_date}}', description: 'Data check-in' },
          { name: '{{check_out_date}}', description: 'Data check-out' },
          { name: '{{number_of_nights}}', description: 'Numero notti' },
          { name: '{{number_of_cats}}', description: 'Numero gatti' },
          { name: '{{cat_names}}', description: 'Nomi dei gatti' },
          { name: '{{total_amount}}', description: 'Totale preventivo' },
          { name: '{{total_discounts}}', description: 'Totale sconti' },
        ],
      },
      {
        category: 'Appuntamento',
        variables: [
          { name: '{{appointment_type}}', description: 'Tipo (Check-in/Check-out)' },
          { name: '{{appointment_date}}', description: 'Data appuntamento' },
          { name: '{{appointment_start_time}}', description: 'Ora inizio' },
          { name: '{{appointment_end_time}}', description: 'Ora fine' },
          { name: '{{appointment_notes}}', description: 'Note appuntamento' },
          { name: '{{booking_number}}', description: 'Numero prenotazione' },
        ],
      },
      {
        category: 'Pensione',
        variables: [
          { name: '{{hotel_name}}', description: 'Nome pensione' },
          { name: '{{hotel_address}}', description: 'Indirizzo pensione' },
          { name: '{{hotel_phone}}', description: 'Telefono pensione' },
          { name: '{{hotel_email}}', description: 'Email pensione' },
        ],
      },
      {
        category: 'Sistema',
        variables: [
          { name: '{{current_date}}', description: 'Data corrente' },
          { name: '{{current_year}}', description: 'Anno corrente' },
        ],
      },
    ];
  }
}
