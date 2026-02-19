export enum RoleType {
  ADMIN = 'admin',
  CEO = 'ceo',
  TITOLARE = 'titolare',
  MANAGER = 'manager',
  OPERATORE = 'operatore',
}

export const GLOBAL_ROLES = [RoleType.ADMIN, RoleType.CEO];
export const TENANT_ROLES = [RoleType.TITOLARE, RoleType.MANAGER, RoleType.OPERATORE];

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [RoleType.ADMIN]: 100,
  [RoleType.CEO]: 90,
  [RoleType.TITOLARE]: 70,
  [RoleType.MANAGER]: 50,
  [RoleType.OPERATORE]: 30,
};
