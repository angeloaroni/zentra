# Plan: Mejoras a la sección Dividir Gastos

## Resumen

Dos mejoras principales:
1. **Invitación a no registrados**: Email + WhatsApp con link de registro referenciado al grupo
2. **Seleccionar quién paga**: Dropdown para elegir qué miembro pagó el gasto

---

## Mejora 1: Invitación a no registrados

### 1.1 Nuevo modelo Prisma (`apps/api/prisma/schema.prisma`)

```prisma
model PendingInvitation {
  id        String   @id @default(cuid())
  email     String
  groupId   String
  group     SplitGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  invitedBy String
  inviter   User     @relation(fields: [invitedBy], references: [id])
  token     String   @unique
  status    String   @default("pending") // pending, accepted, expired
  createdAt DateTime @default(now())
  expiresAt DateTime

  @@unique([email, groupId])
  @@index([token])
  @@index([email])
}
```

Agregar en `SplitGroup`:
```prisma
pendingInvitations PendingInvitation[]
```

Agregar en `User`:
```prisma
sentInvitations PendingInvitation[]
```

### 1.2 Nuevo método en EmailService (`apps/api/src/common/services/email.service.ts`)

Nuevo método público:
```typescript
async sendSplitInviteEmail(to: string, inviterName: string, groupName: string, inviteUrl: string): Promise<void>
```

Usar el mismo patrón que `sendPasswordResetEmail`: si `RESEND_API_KEY` está configurado envía email, si no loguea la URL en consola.

### 1.3 Importar EmailModule en SplitsModule (`apps/api/src/modules/splits/splits.module.ts`)

Agregar `EmailModule` a los imports del módulo para poder inyectar `EmailService`.

### 1.4 Modificar `inviteMember` en SplitsService (`apps/api/src/modules/splits/splits.service.ts`)

Flujo actual cuando el usuario no existe: lanza NotFoundException.

Nuevo flujo:
1. Si el usuario no existe:
   a. Verificar si ya hay una invitación pendiente para ese email+grupo
   b. Si ya existe y no expiró: error "Ya se envió una invitación a este email"
   c. Crear `PendingInvitation` con token único (crypto.randomUUID) y expiración de 7 días
   d. Enviar email con link: `{FRONTEND_URL}/login?invite={token}`
   e. Devolver mensaje: "Invitación enviada a {email}. Se unirá al grupo cuando se registre."
2. Si el usuario existe: flujo actual (añadir directamente)

### 1.5 Nuevos endpoints en SplitsController (`apps/api/src/modules/splits/splits.controller.ts`)

```
GET  /splits/invitations/:token     → Obtener datos de la invitación (público)
POST /splits/invitations/:token/accept → Aceptar invitación (requiere auth)
GET  /splits/groups/:id/invitations  → Listar invitaciones pendientes del grupo
DELETE /splits/invitations/:id       → Cancelar invitación pendiente
```

### 1.6 Nuevo DTO para invitaciones (`apps/api/src/modules/splits/dto/`)

- `accept-invitation.dto.ts`: No necesita body, solo el token en la URL

### 1.7 Modificar formulario de registro (`apps/web/src/app/login/page.tsx`)

- Leer parámetro `invite` de la URL con `useSearchParams()`
- Si existe, hacer fetch a `GET /splits/invitations/{token}` para obtener datos
- Mostrar banner: "Has sido invitado a unirte al grupo '{groupName}' en Zentra por {inviterName}"
- Después del registro exitoso, llamar a `POST /splits/invitations/{token}/accept`
- Redirigir al grupo en lugar de al onboarding

### 1.8 Interfaz de invitaciones pendientes en el grupo (`apps/web/src/app/dashboard/splits/[groupId]/page.tsx`)

En la pestaña "Miembros", debajo de la lista de miembros:
- Sección "Invitaciones pendientes" (solo visible para admins/creador)
- Cada invitación muestra: email, fecha de envío, estado, botón "Cancelar"
- Botón "Copiar enlace" para compartir manualmente
- Botón "Compartir por WhatsApp" que abre `wa.me` con mensaje pre-rellenado

### 1.9 Enlace de WhatsApp

Generar enlace:
```
https://wa.me/?text=Te%20he%20invitado%20a%20unirte%20al%20grupo%20'{groupName}'%20en%20Zentra.%20Regístrate%20aquí:%20{inviteUrl}
```

Mostrar botón con icono de WhatsApp después de crear la invitación exitosamente.

---

## Mejora 2: Seleccionar quién paga

### 2.1 Modificar CreateExpenseDto (`apps/api/src/modules/splits/dto/create-expense.dto.ts`)

Agregar campo opcional:
```typescript
@IsString()
@IsOptional()
paidById?: string
```

### 2.2 Modificar `createExpense` en SplitsService (`apps/api/src/modules/splits/splits.service.ts`)

Después de validar que el grupo existe y que el usuario es miembro:

```typescript
// Validar paidById si se proporciona
let paidById = userId
if (dto.paidById) {
  const isPayerMember = group.members.some((m) => m.userId === dto.paidById)
  if (!isPayerMember) {
    throw new BadRequestException('El miembro seleccionado como pagador debe pertenecer al grupo')
  }
  paidById = dto.paidById
}

// Usar paidById en lugar de userId hardcodeado
const expense = await this.prisma.sharedExpense.create({
  data: {
    groupId: dto.groupId,
    paidById: paidById,  // ← Cambiar de userId a paidById
    // ... resto igual
  },
})
```

### 2.3 Agregar dropdown en el formulario del frontend

En `apps/web/src/app/dashboard/splits/[groupId]/page.tsx`:

- Agregar estado: `paidBy: string` al `expenseForm` (default: user.id)
- Nuevo campo "¿Quién pagó?" antes de "Tipo de división"
- Dropdown con todos los miembros del grupo
- Mostrar avatar + nombre de cada miembro
- Por defecto: usuario actual

### 2.4 Actualizar payload del frontend

En la función que envía el gasto al backend:
```typescript
const payload = {
  // ... campos existentes
  paidById: expenseForm.paidBy || undefined,
}
```

### 2.5 Modificar lógica de notificaciones

En `createExpense`, las notificaciones se envían a todos los miembros excepto al pagador. Actualizar para usar `paidById` en lugar de `userId`:

```typescript
const otherMembers = group.members.filter((m) => m.userId !== paidById)
```

---

## Archivos a modificar

### Backend
| Archivo | Cambio |
|---------|--------|
| `apps/api/prisma/schema.prisma` | Nuevo modelo `PendingInvitation`, relaciones en `SplitGroup` y `User` |
| `apps/api/src/common/services/email.service.ts` | Nuevo método `sendSplitInviteEmail()` |
| `apps/api/src/common/common.module.ts` | Exportar `EmailModule` si no lo hace ya |
| `apps/api/src/modules/splits/splits.module.ts` | Importar `CommonModule` o `EmailModule` |
| `apps/api/src/modules/splits/splits.service.ts` | Modificar `inviteMember`, modificar `createExpense`, nuevos métodos de invitación |
| `apps/api/src/modules/splits/splits.controller.ts` | Nuevos endpoints de invitación |
| `apps/api/src/modules/splits/dto/create-expense.dto.ts` | Agregar `paidById` opcional |
| `apps/api/src/modules/splits/dto/index.ts` | Exportar nuevos DTOs |

### Frontend
| Archivo | Cambio |
|---------|--------|
| `apps/web/src/app/dashboard/splits/[groupId]/page.tsx` | Selector de pagador, UI invitaciones pendientes, botón WhatsApp |
| `apps/web/src/app/login/page.tsx` | Leer token de invitación de URL, aceptar después del registro |

---

## Flujo de usuario: Invitación a no registrado

1. Usuario A crea grupo "Viaje Barcelona"
2. Usuario A hace clic en "Invitar miembro"
3. Escribe email de usuario B (no registrado)
4. Backend crea `PendingInvitation` y envía email
5. Frontend muestra: "Invitación enviada a usuario@email.com"
6. Aparecen botones: "Copiar enlace" y "Compartir por WhatsApp"
7. Usuario A copia el enlace o comparte por WhatsApp
8. Usuario B recibe el email/mensaje con link: `https://zentra-web-one.vercel.app/login?invite=TOKEN`
9. Usuario B hace clic, ve el formulario de registro con banner: "Te han invitado al grupo 'Viaje Barcelona'"
10. Usuario B se registra
11. Backend acepta automáticamente la invitación y añade a B al grupo
12. Usuario B es redirigido al grupo

---

## Flujo de usuario: Seleccionar quién paga

1. Usuario A abre el grupo y hace clic en "Nuevo gasto"
2. Aparece el formulario con campo "¿Quién pagó?" (dropdown)
3. Por defecto muestra a Usuario A (usuario actual)
4. Usuario A puede cambiar a cualquier miembro del grupo
5. Rellena el resto del formulario normalmente
6. Al enviar, el gasto se atribuye al miembro seleccionado
7. En la lista de gastos aparece: "[Miembro seleccionado] pagó"

---

## Expiración de invitaciones

- **7 días** desde la creación
- Al aceptar una invitación expirada: error "Esta invitación ha expirado"
- En el listado de invitaciones pendientes, mostrar "Expira en X días" o "Expirada"
- Job periódico (cada hora) para marcar invitaciones expiradas como `status: "expired"`

---

## Orden de implementación

1. Schema Prisma (PendingInvitation + paidById en CreateExpenseDto)
2. Backend: EmailService.sendSplitInviteEmail()
3. Backend: Modificar inviteMember para manejar no registrados
4. Backend: Nuevos endpoints de invitación
5. Backend: Modificar createExpense para paidById
6. Frontend: Selector de pagador en formulario de gasto
7. Frontend: UI invitaciones pendientes + botón WhatsApp
8. Frontend: Modificar /login para aceptar invitaciones
9. Pruebas end-to-end
