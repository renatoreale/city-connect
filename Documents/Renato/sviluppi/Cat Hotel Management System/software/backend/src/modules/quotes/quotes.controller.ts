import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { QuotesService } from './quotes.service';
import {
  CreateQuoteDto,
  UpdateQuoteDto,
  AddLineItemDto,
  UpdateLineItemDto,
  UpdateStatusDto,
} from './dto';
import { SendQuoteEmailDto, PreviewEmailDto } from '../email/dto';
import { EmailService } from '../email/email.service';
import { QuoteStatus } from './entities/quote.entity';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { RoleType } from '../../common/constants/roles.constant';

@Controller('api/v1/quotes')
@UseGuards(JwtAuthGuard, RolesGuard, TenantGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly emailService: EmailService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async create(
    @Body() createQuoteDto: CreateQuoteDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    createQuoteDto.tenantId = tenantId;
    return this.quotesService.create(tenantId, createQuoteDto, user.id);
  }

  @Get()
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findAll(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: QuoteStatus,
    @Query('clientId') clientId?: string,
    @Query('search') search?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.quotesService.findAll(tenantId, {
      status,
      clientId,
      search,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.findById(id, tenantId);
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateQuoteDto: UpdateQuoteDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.update(id, tenantId, updateQuoteDto, user.id);
  }

  @Delete(':id')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    await this.quotesService.delete(id, tenantId);
    return { message: 'Preventivo eliminato' };
  }

  @Post(':id/recalculate')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async recalculate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.recalculate(id, tenantId, user.id);
  }

  @Patch(':id/status')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UpdateStatusDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.updateStatus(id, tenantId, statusDto, user.id);
  }

  @Post(':id/line-items')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async addLineItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() addLineItemDto: AddLineItemDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.addLineItem(id, tenantId, addLineItemDto, user.id);
  }

  @Patch(':id/line-items/:lineId')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async updateLineItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @Body() updateLineItemDto: UpdateLineItemDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.updateLineItem(id, lineId, tenantId, updateLineItemDto, user.id);
  }

  @Delete(':id/line-items/:lineId')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER)
  async removeLineItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lineId', ParseUUIDPipe) lineId: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.removeLineItem(id, lineId, tenantId, user.id);
  }

  // ============ PDF Endpoints ============

  @Get(':id/pdf')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async downloadPdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
    @Res() res: Response,
  ) {
    const quote = await this.quotesService.findById(id, tenantId);

    if (!quote.pdfPath || !fs.existsSync(quote.pdfPath)) {
      throw new NotFoundException('PDF non trovato. Generare il PDF prima del download.');
    }

    const filename = `Preventivo_${quote.quoteNumber}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(quote.pdfPath);
    fileStream.pipe(res);
  }

  @Post(':id/generate-pdf')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async generatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    return this.quotesService.generatePdf(id, tenantId, user.id);
  }

  // ============ Email Endpoints ============

  @Post(':id/preview-email')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async previewEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() previewDto: PreviewEmailDto,
    @CurrentTenant() tenantId: string,
  ) {
    const quote = await this.quotesService.findById(id, tenantId);
    return this.emailService.previewQuoteEmail(
      quote,
      tenantId,
      previewDto.templateCode || 'QUOTE_SEND',
    );
  }

  @Post(':id/send-email')
  @Roles(RoleType.ADMIN, RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE)
  async sendEmail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() sendDto: SendQuoteEmailDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenantId: string,
  ) {
    // Generate PDF if not exists
    let quote = await this.quotesService.findById(id, tenantId);
    if (!quote.pdfPath || !fs.existsSync(quote.pdfPath)) {
      quote = await this.quotesService.generatePdf(id, tenantId, user.id);
    }

    // Send email
    const emailLog = await this.emailService.sendQuoteEmail(
      quote,
      tenantId,
      sendDto,
      user.id,
    );

    // Update quote status to SENT if it was DRAFT
    if (quote.status === QuoteStatus.DRAFT) {
      await this.quotesService.updateStatus(id, tenantId, { status: QuoteStatus.SENT }, user.id);
    }

    return emailLog;
  }

  @Get(':id/email-logs')
  @Roles(RoleType.ADMIN, RoleType.CEO, RoleType.TITOLARE, RoleType.MANAGER)
  async getEmailLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentTenant() tenantId: string,
  ) {
    // Verify quote exists and belongs to tenant
    await this.quotesService.findById(id, tenantId);
    return this.emailService.findLogsByQuote(id);
  }
}
