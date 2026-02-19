import { IsNotEmpty, IsString, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class AssignTenantDto {
  @IsUUID('4', { message: 'Tenant ID non valido' })
  @IsNotEmpty({ message: 'Tenant ID obbligatorio' })
  tenantId: string;

  @IsUUID('4', { message: 'Role ID non valido' })
  @IsNotEmpty({ message: 'Role ID obbligatorio' })
  roleId: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
