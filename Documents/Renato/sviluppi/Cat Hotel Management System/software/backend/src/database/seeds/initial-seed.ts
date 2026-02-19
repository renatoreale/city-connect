import { DataSource, IsNull } from 'typeorm';
import { Role } from '../../modules/roles/entities/role.entity';
import { Permission } from '../../modules/roles/entities/permission.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Tenant } from '../../modules/tenants/entities/tenant.entity';
import { UserTenant } from '../../modules/users/entities/user-tenant.entity';
import { EmailTemplate } from '../../modules/email-templates/entities/email-template.entity';
import { RoleType, ROLE_HIERARCHY } from '../../common/constants/roles.constant';

export async function seedDatabase(dataSource: DataSource): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);
  const userRepository = dataSource.getRepository(User);
  const tenantRepository = dataSource.getRepository(Tenant);
  const userTenantRepository = dataSource.getRepository(UserTenant);

  console.log('Starting database seed...');

  // Create Permissions
  const permissionsData = [
    { code: 'users.read', name: 'Visualizza utenti', module: 'users' },
    { code: 'users.create', name: 'Crea utenti', module: 'users' },
    { code: 'users.update', name: 'Modifica utenti', module: 'users' },
    { code: 'users.delete', name: 'Elimina utenti', module: 'users' },
    { code: 'tenants.read', name: 'Visualizza tenant', module: 'tenants' },
    { code: 'tenants.create', name: 'Crea tenant', module: 'tenants' },
    { code: 'tenants.update', name: 'Modifica tenant', module: 'tenants' },
    { code: 'tenants.delete', name: 'Elimina tenant', module: 'tenants' },
    { code: 'audit.read', name: 'Visualizza audit log', module: 'audit' },
    { code: 'cats.read', name: 'Visualizza gatti', module: 'cats' },
    { code: 'cats.create', name: 'Crea gatti', module: 'cats' },
    { code: 'cats.update', name: 'Modifica gatti', module: 'cats' },
    { code: 'cats.delete', name: 'Elimina gatti', module: 'cats' },
    { code: 'bookings.read', name: 'Visualizza prenotazioni', module: 'bookings' },
    { code: 'bookings.create', name: 'Crea prenotazioni', module: 'bookings' },
    { code: 'bookings.update', name: 'Modifica prenotazioni', module: 'bookings' },
    { code: 'bookings.delete', name: 'Elimina prenotazioni', module: 'bookings' },
  ];

  const permissions: Permission[] = [];
  for (const pData of permissionsData) {
    let permission = await permissionRepository.findOne({ where: { code: pData.code } });
    if (!permission) {
      permission = permissionRepository.create(pData);
      permission = await permissionRepository.save(permission);
    }
    permissions.push(permission);
  }
  console.log(`Created ${permissions.length} permissions`);

  // Create Roles
  const rolesData = [
    {
      code: RoleType.ADMIN,
      name: 'Amministratore',
      description: 'Accesso completo a tutte le funzionalità',
      isGlobal: true,
      hierarchy: ROLE_HIERARCHY[RoleType.ADMIN],
      permissionCodes: permissionsData.map((p) => p.code),
    },
    {
      code: RoleType.CEO,
      name: 'CEO',
      description: 'Accesso globale in sola lettura',
      isGlobal: true,
      hierarchy: ROLE_HIERARCHY[RoleType.CEO],
      permissionCodes: permissionsData.filter((p) => p.code.endsWith('.read')).map((p) => p.code),
    },
    {
      code: RoleType.TITOLARE,
      name: 'Titolare',
      description: 'Gestione completa del proprio tenant',
      isGlobal: false,
      hierarchy: ROLE_HIERARCHY[RoleType.TITOLARE],
      permissionCodes: permissionsData.map((p) => p.code),
    },
    {
      code: RoleType.MANAGER,
      name: 'Manager',
      description: 'Operatività sul tenant senza eliminazioni',
      isGlobal: false,
      hierarchy: ROLE_HIERARCHY[RoleType.MANAGER],
      permissionCodes: permissionsData.filter((p) => !p.code.endsWith('.delete')).map((p) => p.code),
    },
    {
      code: RoleType.OPERATORE,
      name: 'Operatore',
      description: 'Solo lettura e compiti assegnati',
      isGlobal: false,
      hierarchy: ROLE_HIERARCHY[RoleType.OPERATORE],
      permissionCodes: [
        'cats.read',
        'cats.update',
        'bookings.read',
        'bookings.update',
      ],
    },
  ];

  const roles: Role[] = [];
  for (const rData of rolesData) {
    let role = await roleRepository.findOne({
      where: { code: rData.code },
      relations: ['permissions'],
    });

    if (!role) {
      role = roleRepository.create({
        code: rData.code,
        name: rData.name,
        description: rData.description,
        isGlobal: rData.isGlobal,
        hierarchy: rData.hierarchy,
      });
      role = await roleRepository.save(role);
    }

    role.permissions = permissions.filter((p) => rData.permissionCodes.includes(p.code));
    role = await roleRepository.save(role);
    roles.push(role);
  }
  console.log(`Created ${roles.length} roles`);

  // Create Admin User
  let adminUser = await userRepository.findOne({ where: { email: 'admin@cathotel.com' } });
  if (!adminUser) {
    adminUser = userRepository.create({
      email: 'admin@cathotel.com',
      password: 'Admin123!',
      firstName: 'Admin',
      lastName: 'Sistema',
      isGlobalUser: true,
      isActive: true,
    });
    adminUser = await userRepository.save(adminUser);
    console.log('Created admin user: admin@cathotel.com / Admin123!');
  }

  // Create Demo Tenant
  let demoTenant = await tenantRepository.findOne({ where: { code: 'DEMO001' } });
  if (!demoTenant) {
    demoTenant = tenantRepository.create({
      name: 'Cat Hotel Demo',
      code: 'DEMO001',
      address: 'Via dei Gatti 1',
      city: 'Milano',
      postalCode: '20100',
      province: 'MI',
      phone: '+39 02 12345678',
      email: 'demo@cathotel.com',
      isActive: true,
    });
    demoTenant = await tenantRepository.save(demoTenant);
    console.log('Created demo tenant: Cat Hotel Demo');
  }

  // Assign Admin to Demo Tenant
  const adminRole = roles.find((r) => r.code === RoleType.ADMIN);
  if (adminRole) {
    let userTenant = await userTenantRepository.findOne({
      where: { userId: adminUser.id, tenantId: demoTenant.id },
    });

    if (!userTenant) {
      userTenant = userTenantRepository.create({
        userId: adminUser.id,
        tenantId: demoTenant.id,
        roleId: adminRole.id,
        isActive: true,
      });
      await userTenantRepository.save(userTenant);
      console.log('Assigned admin to demo tenant');
    }
  }

  // Create Default Email Templates
  const emailTemplateRepository = dataSource.getRepository(EmailTemplate);

  const quoteSendTemplate = await emailTemplateRepository.findOne({
    where: { code: 'QUOTE_SEND', tenantId: IsNull() } as any,
  });

  if (!quoteSendTemplate) {
    const template = emailTemplateRepository.create({
      tenantId: null, // Global template
      code: 'QUOTE_SEND',
      name: 'Invio Preventivo',
      subject: 'Preventivo n. {{quote_number}} - {{hotel_name}}',
      bodyHtml: `<p>Gentile {{client_full_name}},</p>

<p>in allegato trova il preventivo n. <strong>{{quote_number}}</strong>
per il soggiorno dei suoi gatti presso {{hotel_name}}.</p>

<h3>Riepilogo</h3>
<ul>
  <li><strong>Check-in:</strong> {{check_in_date}}</li>
  <li><strong>Check-out:</strong> {{check_out_date}}</li>
  <li><strong>Durata:</strong> {{number_of_nights}} notti</li>
  <li><strong>Gatti:</strong> {{cat_names}}</li>
  <li><strong>Totale:</strong> €{{total_amount}}</li>
</ul>

<p>Il preventivo è valido fino al {{quote_valid_until}}.</p>

<p>Per confermare la prenotazione, la invitiamo a rispondere a questa email
o contattarci al numero {{hotel_phone}}.</p>

<p>Cordiali saluti,<br>
{{hotel_name}}</p>`,
      bodyText: `Gentile {{client_full_name}},

in allegato trova il preventivo n. {{quote_number}} per il soggiorno dei suoi gatti presso {{hotel_name}}.

Riepilogo:
- Check-in: {{check_in_date}}
- Check-out: {{check_out_date}}
- Durata: {{number_of_nights}} notti
- Gatti: {{cat_names}}
- Totale: €{{total_amount}}

Il preventivo è valido fino al {{quote_valid_until}}.

Per confermare la prenotazione, la invitiamo a rispondere a questa email o contattarci al numero {{hotel_phone}}.

Cordiali saluti,
{{hotel_name}}`,
      variables: [
        { name: '{{client_full_name}}', description: 'Nome completo cliente' },
        { name: '{{quote_number}}', description: 'Numero preventivo' },
        { name: '{{hotel_name}}', description: 'Nome pensione' },
        { name: '{{check_in_date}}', description: 'Data check-in' },
        { name: '{{check_out_date}}', description: 'Data check-out' },
        { name: '{{number_of_nights}}', description: 'Numero notti' },
        { name: '{{cat_names}}', description: 'Nomi gatti' },
        { name: '{{total_amount}}', description: 'Totale preventivo' },
        { name: '{{quote_valid_until}}', description: 'Data validità' },
        { name: '{{hotel_phone}}', description: 'Telefono pensione' },
      ],
      isActive: true,
    });
    await emailTemplateRepository.save(template);
    console.log('Created default email template: QUOTE_SEND');
  }

  // ─── Appointment Email Templates ─────────────────────────

  const appointmentTemplates = [
    {
      code: 'APPOINTMENT_CHECKIN_CONFIRMATION',
      name: 'Conferma Appuntamento Check-in',
      subject: 'Conferma appuntamento check-in - {{hotel_name}}',
      bodyHtml: `<p>Gentile {{client_full_name}},</p>

<p>confermiamo il suo appuntamento di <strong>check-in</strong> presso {{hotel_name}}.</p>

<h3>Dettagli appuntamento</h3>
<ul>
  <li><strong>Data:</strong> {{appointment_date}}</li>
  <li><strong>Orario:</strong> {{appointment_start_time}} - {{appointment_end_time}}</li>
  <li><strong>Prenotazione:</strong> {{booking_number}}</li>
</ul>

<p>La preghiamo di presentarsi all'orario indicato con la documentazione sanitaria dei gatti aggiornata.</p>

<p>Per eventuali modifiche, ci contatti al numero {{hotel_phone}} o all'indirizzo {{hotel_email}}.</p>

<p>Cordiali saluti,<br>
{{hotel_name}}</p>`,
      bodyText: `Gentile {{client_full_name}},

confermiamo il suo appuntamento di check-in presso {{hotel_name}}.

Dettagli appuntamento:
- Data: {{appointment_date}}
- Orario: {{appointment_start_time}} - {{appointment_end_time}}
- Prenotazione: {{booking_number}}

La preghiamo di presentarsi all'orario indicato con la documentazione sanitaria dei gatti aggiornata.

Per eventuali modifiche, ci contatti al numero {{hotel_phone}} o all'indirizzo {{hotel_email}}.

Cordiali saluti,
{{hotel_name}}`,
    },
    {
      code: 'APPOINTMENT_CHECKOUT_CONFIRMATION',
      name: 'Conferma Appuntamento Check-out',
      subject: 'Conferma appuntamento check-out - {{hotel_name}}',
      bodyHtml: `<p>Gentile {{client_full_name}},</p>

<p>confermiamo il suo appuntamento di <strong>check-out</strong> presso {{hotel_name}}.</p>

<h3>Dettagli appuntamento</h3>
<ul>
  <li><strong>Data:</strong> {{appointment_date}}</li>
  <li><strong>Orario:</strong> {{appointment_start_time}} - {{appointment_end_time}}</li>
  <li><strong>Prenotazione:</strong> {{booking_number}}</li>
</ul>

<p>Per eventuali modifiche, ci contatti al numero {{hotel_phone}} o all'indirizzo {{hotel_email}}.</p>

<p>Cordiali saluti,<br>
{{hotel_name}}</p>`,
      bodyText: `Gentile {{client_full_name}},

confermiamo il suo appuntamento di check-out presso {{hotel_name}}.

Dettagli appuntamento:
- Data: {{appointment_date}}
- Orario: {{appointment_start_time}} - {{appointment_end_time}}
- Prenotazione: {{booking_number}}

Per eventuali modifiche, ci contatti al numero {{hotel_phone}} o all'indirizzo {{hotel_email}}.

Cordiali saluti,
{{hotel_name}}`,
    },
    {
      code: 'APPOINTMENT_CHECKIN_REMINDER',
      name: 'Promemoria Check-in',
      subject: 'Promemoria: check-in domani - {{hotel_name}}',
      bodyHtml: `<p>Gentile {{client_full_name}},</p>

<p>le ricordiamo che domani è previsto il <strong>check-in</strong> presso {{hotel_name}}.</p>

<h3>Dettagli</h3>
<ul>
  <li><strong>Data:</strong> {{appointment_date}}</li>
  <li><strong>Orario:</strong> {{appointment_start_time}} - {{appointment_end_time}}</li>
  <li><strong>Prenotazione:</strong> {{booking_number}}</li>
</ul>

<p><strong>Cosa portare:</strong></p>
<ul>
  <li>Libretto sanitario aggiornato</li>
  <li>Certificato FIV/FeLV in corso di validità</li>
  <li>Cibo abituale (se necessario)</li>
</ul>

<p>Per eventuali modifiche dell'orario, ci contatti al numero {{hotel_phone}}.</p>

<p>A domani!<br>
{{hotel_name}}</p>`,
      bodyText: `Gentile {{client_full_name}},

le ricordiamo che domani è previsto il check-in presso {{hotel_name}}.

Dettagli:
- Data: {{appointment_date}}
- Orario: {{appointment_start_time}} - {{appointment_end_time}}
- Prenotazione: {{booking_number}}

Cosa portare:
- Libretto sanitario aggiornato
- Certificato FIV/FeLV in corso di validità
- Cibo abituale (se necessario)

Per eventuali modifiche dell'orario, ci contatti al numero {{hotel_phone}}.

A domani!
{{hotel_name}}`,
    },
    {
      code: 'APPOINTMENT_CHECKOUT_REMINDER',
      name: 'Promemoria Check-out',
      subject: 'Promemoria: check-out domani - {{hotel_name}}',
      bodyHtml: `<p>Gentile {{client_full_name}},</p>

<p>le ricordiamo che domani è previsto il <strong>check-out</strong> presso {{hotel_name}}.</p>

<h3>Dettagli</h3>
<ul>
  <li><strong>Data:</strong> {{appointment_date}}</li>
  <li><strong>Orario:</strong> {{appointment_start_time}} - {{appointment_end_time}}</li>
  <li><strong>Prenotazione:</strong> {{booking_number}}</li>
</ul>

<p>La preghiamo di presentarsi all'orario indicato per il ritiro.</p>

<p>Per eventuali modifiche, ci contatti al numero {{hotel_phone}}.</p>

<p>Cordiali saluti,<br>
{{hotel_name}}</p>`,
      bodyText: `Gentile {{client_full_name}},

le ricordiamo che domani è previsto il check-out presso {{hotel_name}}.

Dettagli:
- Data: {{appointment_date}}
- Orario: {{appointment_start_time}} - {{appointment_end_time}}
- Prenotazione: {{booking_number}}

La preghiamo di presentarsi all'orario indicato per il ritiro.

Per eventuali modifiche, ci contatti al numero {{hotel_phone}}.

Cordiali saluti,
{{hotel_name}}`,
    },
  ];

  const appointmentVariables = [
    { name: '{{client_full_name}}', description: 'Nome completo cliente' },
    { name: '{{appointment_date}}', description: 'Data appuntamento' },
    { name: '{{appointment_start_time}}', description: 'Ora inizio' },
    { name: '{{appointment_end_time}}', description: 'Ora fine' },
    { name: '{{booking_number}}', description: 'Numero prenotazione' },
    { name: '{{hotel_name}}', description: 'Nome pensione' },
    { name: '{{hotel_phone}}', description: 'Telefono pensione' },
    { name: '{{hotel_email}}', description: 'Email pensione' },
  ];

  for (const tplData of appointmentTemplates) {
    const exists = await emailTemplateRepository.findOne({
      where: { code: tplData.code, tenantId: IsNull() } as any,
    });

    if (!exists) {
      const template = emailTemplateRepository.create({
        tenantId: null,
        code: tplData.code,
        name: tplData.name,
        subject: tplData.subject,
        bodyHtml: tplData.bodyHtml,
        bodyText: tplData.bodyText,
        variables: appointmentVariables,
        isActive: true,
      });
      await emailTemplateRepository.save(template);
      console.log(`Created default email template: ${tplData.code}`);
    }
  }

  console.log('Database seed completed!');
}
