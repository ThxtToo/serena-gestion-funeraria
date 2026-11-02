
# Serena — Modelo conceptual de datos

**Versión:** 0.2  
**Estado:** Autenticación implementada; las demás entidades siguen siendo conceptuales  
**Base de datos prevista:** PostgreSQL  
**Acceso a datos previsto:** Drizzle ORM

## 1. Objetivo

Definir las entidades principales de Serena, sus responsabilidades y las relaciones necesarias para implementar los requisitos funcionales.

Este documento describe el diseño conceptual del dominio. Las tablas de autenticación, roles, sesiones y limitación de intentos ya están implementadas en PostgreSQL; las demás entidades siguen siendo propuestas.

## 2. Principios de diseño

- Cada entidad tendrá una clave primaria.
- Las relaciones deberán proteger la integridad referencial.
- Los datos persistentes estarán almacenados en PostgreSQL.
- Las operaciones sensibles deberán validarse en el backend.
- Se conservará el historial de movimientos de inventario.
- Los datos de demostración serán ficticios.
- Las contraseñas nunca se almacenarán en texto plano.
- Los registros de auditoría no incluirán secretos ni información innecesaria.
- Los datos personales se limitarán a lo necesario para el alcance académico.

## 3. Entidades propuestas

### 3.1 User — Usuario

Representa a una persona autorizada para acceder al panel privado de Serena.

Campos conceptuales:
- `id`: identificador único (UUID).
- `fullName`: nombre completo del usuario.
- `email`: correo electrónico utilizado para iniciar sesión.
- `passwordHash`: hash scrypt de la contraseña con sal aleatoria.
- `roleId`: referencia al rol asignado.
- `isActive`: indica si la cuenta está habilitada.
- `mustChangePassword`: indica si debe cambiar la contraseña en el próximo acceso.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de última actualización.
- `lastLoginAt`: fecha del último inicio de sesión, si existe.

Restricciones:
- El correo electrónico será único.
- El correo se normalizará sin espacios y en minúsculas.
- Cada usuario tendrá exactamente un rol.
- Las contraseñas nunca se almacenarán en texto plano.
- Los usuarios desactivados no podrán iniciar sesión.
- Desactivar una cuenta no eliminará sus registros históricos.
- Al desactivar una cuenta se revocarán todas sus sesiones activas.
- Al cambiar la contraseña se revocarán las demás sesiones activas del usuario.

### 3.2 Role — Rol

Representa el perfil de autorización de un usuario.

Campos conceptuales:
- `id`: nombre único del rol (`administrador` o `empleado`).
- `description`: descripción de sus responsabilidades.

Roles iniciales:
- `administrador`: puede gestionar usuarios, recursos, inventario, servicios ofrecidos, canales de atención y las demás operaciones administrativas autorizadas.
- `empleado`: puede consultar y ejecutar únicamente las operaciones habilitadas para su rol, como la gestión operativa de recursos y los movimientos de inventario autorizados.

Restricciones:
- Cada usuario tendrá exactamente un rol.
- Un mismo rol podrá estar asignado a varios usuarios.
- Los permisos serán reglas fijas definidas en el backend para cada rol.
- No se implementará inicialmente una tabla de permisos configurables.
- El backend comprobará la autorización en cada operación privada; ocultar controles en la interfaz no sustituye esta validación.
- Solo el administrador podrá crear cuentas de empleados.
- Solo el administrador podrá crear, modificar, activar o desactivar servicios ofrecidos y canales de atención.
- Los empleados no podrán modificar el catálogo de servicios ni los canales de atención.
- No habrá registro público de usuarios.

### 3.3 Session — Sesión

Representa una sesión autenticada de un usuario en el panel privado de Serena.

Campos conceptuales:
- `id`: identificador único.
- `userId`: referencia al usuario propietario de la sesión.
- `tokenHash`: hash seguro del token de sesión.
- `createdAt`: fecha de creación.
- `lastActivityAt`: fecha de última actividad.
- `expiresAt`: fecha límite de expiración.
- `revokedAt`: fecha de revocación de la sesión; será nula mientras no haya sido revocada.

Restricciones:
- Las sesiones se almacenarán en PostgreSQL.
- El token original no se almacenará en la base de datos.
- `tokenHash` almacenará el SHA-256 del token aleatorio de sesión.
- La duración máxima inicial será de 8 horas.
- Las sesiones expirarán después de 30 minutos de inactividad.
- Al cerrar sesión se revocará la sesión correspondiente.
- Al desactivar un usuario se revocarán todas sus sesiones activas.
- Al cambiar la contraseña se revocarán las demás sesiones activas.
- Las sesiones expiradas o revocadas no permitirán acceder al panel privado.

### 3.4 ServiceOffering — Servicio ofrecido

Representa un servicio funerario que la organización ofrece y puede publicar en el portal público.

Campos conceptuales:
- `id`: identificador único.
- `name`: nombre del servicio.
- `description`: descripción del servicio.
- `category`: categoría del servicio, cuando corresponda.
- `isActive`: indica si el servicio está activo y disponible para consulta pública.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de última actualización.

Reglas:
- El nombre y la descripción serán obligatorios.
- Solo el administrador podrá crear, modificar, activar o desactivar servicios.
- Los empleados no podrán modificar esta información.
- El portal público y el agente Serena solo consultarán servicios activos.
- Desactivar un servicio no eliminará su registro histórico.
- La consulta pública no permitirá modificar esta entidad.

### 3.5 ContactChannel — Canal de atención

Representa un medio de contacto que la organización pone a disposición de las personas.

Campos conceptuales:
- `id`: identificador único.
- `type`: tipo de canal, por ejemplo teléfono, WhatsApp o correo electrónico.
- `label`: nombre visible del canal.
- `value`: dato de contacto correspondiente al canal.
- `instructions`: instrucciones de uso, cuando correspondan.
- `isActive`: indica si el canal está habilitado para consulta.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de última actualización.

Reglas:
- El tipo, nombre visible y dato de contacto serán obligatorios.
- Solo el administrador podrá crear, modificar, activar o desactivar canales.
- Los empleados no podrán modificar esta información.
- El portal público y el agente Serena solo consultarán canales activos.
- Los canales desactivados no se mostrarán como opciones de contacto.
- Si no existen canales activos, el sistema informará que la atención humana no está configurada, sin inventar datos.
- La consulta pública no permitirá modificar esta entidad.

### 3.6 Resource — Recurso
Representa un recurso operativo que puede utilizarse para prestar un servicio.

Campos conceptuales:
- `id`: identificador único.
- `name`: nombre del recurso.
- `type`: tipo de recurso.
- `description`: descripción.
- `status`: estado operativo.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de actualización.

Ejemplos de tipos:
- Sala.
- Vehículo.
- Equipo.
- Otro recurso aprobado para el alcance.

Los tipos y estados definitivos deben validarse con las necesidades de la funeraria.

Reglas:
- Cada registro representa un recurso individual e identificable.
- Cada recurso tiene su propio estado operativo.
- Su disponibilidad depende de su estado operativo y de las asignaciones vigentes.
- Los recursos reutilizables que deban identificarse individualmente se registran aquí, no como existencias cuantificables.
- `name`, `type` y `status` serán obligatorios.
- `status` utilizará valores controlados.
- Un recurso no podrá asignarse si su estado operativo no permite su utilización.
- Los recursos con asignaciones o registros históricos asociados no se eliminarán físicamente; se gestionarán mediante su estado.

### 3.7 InventoryItem — Artículo de inventario

Representa un artículo cuya existencia se controla por cantidad.

Campos conceptuales:
- `id`: identificador único.
- `name`: nombre del artículo.
- `category`: categoría.
- `description`: descripción.
- `quantity`: existencia actual, según la unidad definida.
- `unit`: unidad de medida.
- `minimumQuantity`: nivel mínimo de referencia.
- `isActive`: indica si el artículo sigue en uso.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de actualización.

Ejemplos:
- Ataúdes o cofres.
- Urnas.
- Materiales.
- Equipos consumibles, si corresponde.

Reglas:
- La existencia se controla mediante cantidades y unidades de medida.
- Las entradas, salidas y ajustes deben registrarse mediante InventoryMovement.
- Los artículos consumibles se gestionan en esta entidad.
- Los bienes reutilizables e identificables individualmente se gestionan en Resource.
- `quantity` y `minimumQuantity` no podrán tener valores negativos.
- `unit` será obligatoria y consistente para cada artículo.
- Cada entrada, salida o ajuste actualizará las existencias y registrará su movimiento dentro de una misma transacción de base de datos.
- Las lecturas y actualizaciones de existencias deberán protegerse frente a operaciones concurrentes para evitar pérdidas de actualización y mantener la consistencia del inventario.

La forma de controlar artículos serializados o unidades individuales deberá definirse antes de implementar inventario avanzado.

### 3.8 InventoryMovement — Movimiento de inventario

Registra una entrada, salida o ajuste autorizado.

Campos conceptuales:
- `id`: identificador único.
- `inventoryItemId`: artículo relacionado.
- `type`: tipo de movimiento.
- `quantity`: cantidad del movimiento o existencia real establecida en un ajuste.
- `previousQuantity`: existencia registrada antes del movimiento.
- `newQuantity`: existencia resultante después del movimiento.
- `reason`: motivo.
- `performedByUserId`: usuario responsable.
- `createdAt`: fecha del movimiento.

Reglas:
- En las entradas, la cantidad del movimiento debe ser estrictamente mayor que cero.
- En las salidas, la cantidad debe ser estrictamente mayor que cero y no podrá superar las existencias disponibles.
- En los ajustes, la existencia real podrá ser igual o mayor que cero.
- El tipo de movimiento determina cómo se actualiza la existencia.
- Cada movimiento debe conservarse en el historial.
- El cambio de existencia y el registro del movimiento deben mantenerse consistentes dentro de una misma transacción.
- Las operaciones concurrentes sobre un mismo artículo deberán coordinarse para que las cantidades anteriores y posteriores de cada movimiento reflejen el orden efectivo de las actualizaciones.
- Los ajustes deben estar autorizados y justificados.
- En un ajuste, `quantity` representará la existencia real determinada mediante conteo.
- Cada ajuste conservará `previousQuantity` y `newQuantity` para mantener la trazabilidad.
- En entradas y salidas también se conservarán las existencias anterior y resultante.

### 3.9 Client — Cliente

Representa a una persona que solicita uno o varios servicios funerarios.

Campos conceptuales:
- `id`: identificador único.
- `fullName`: nombre completo.
- `contactPhone`: teléfono de contacto.
- `email`: correo electrónico, opcional.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de última actualización.

Restricciones:
- Puede estar asociado a varias solicitudes.
- `fullName` y `contactPhone` serán obligatorios.
- `email` será opcional.
- No necesita una cuenta ni contraseña para solicitar servicios.
- Solo se almacenarán los datos personales necesarios para gestionar el servicio.

### 3.10 ServiceRequest — Solicitud de servicio

Representa una solicitud iniciada por un cliente o registrada por personal autorizado.

Campos conceptuales:
- `id`: identificador interno.
- `referenceCode`: referencia pública o de consulta, con protección adecuada.
- `clientId`: referencia opcional al cliente registrado.
- `requesterName`: nombre de la persona que solicita el servicio, cuando no exista un cliente asociado.
- `requesterContact`: medio de contacto del solicitante, cuando no exista un cliente asociado.
- `serviceOfferingId`: referencia al servicio seleccionado del catálogo `ServiceOffering`.
- `status`: estado actual.
- `notes`: observaciones limitadas a lo necesario.
- `createdAt`: fecha de creación.
- `updatedAt`: fecha de actualización.


Reglas:
- `clientId` será opcional y podrá ser nulo cuando no exista una ficha permanente de cliente.
- Cuando exista un cliente asociado, se evitará duplicar innecesariamente sus datos en la solicitud.
- Cuando no exista un cliente registrado, se conservarán los datos mínimos de contacto del solicitante.
- La referencia será generada por el backend, única y difícil de adivinar si se utiliza para localizar solicitudes.
- Consultar una solicitud mediante su referencia no otorgará por sí solo acceso a información privada.
- La solicitud podrá registrarse sin una ficha permanente de cliente.
- Cada solicitud deberá estar asociada a un servicio existente mediante `serviceOfferingId`.
- Las solicitudes nuevas solo podrán seleccionar servicios activos.
- La desactivación de un servicio no eliminará ni modificará las solicitudes históricas asociadas.
- Una solicitud podrá vincularse posteriormente a una ficha de cliente mediante un proceso autorizado.
- La referencia no sustituye un mecanismo de autorización.
- El estado inicial debe ser explícito.
- Registrar una solicitud no implica confirmar el servicio.
- Los cambios de estado deben respetar las transiciones autorizadas.

### 3.11 ServiceRequestStatusHistory — Historial de estados de solicitudes

Registra cada cambio de estado de una solicitud para conservar su trazabilidad.

Campos conceptuales:
- `id`: identificador único del registro.
- `serviceRequestId`: solicitud a la que pertenece el cambio.
- `previousStatus`: estado anterior; será nulo en el registro inicial.
- `newStatus`: nuevo estado asignado.
- `changedByUserId`: usuario responsable del cambio; podrá ser nulo cuando el cambio corresponda al registro inicial automático de la solicitud.
- `reason`: motivo del cambio, obligatorio para rechazos y cancelaciones.
- `createdAt`: fecha y hora del cambio.

Reglas:
- Una solicitud podrá tener múltiples registros históricos.
- Cada registro pertenecerá a una sola solicitud.
- La creación de una solicitud generará un registro inicial con `previousStatus` nulo y `newStatus` igual a `pendiente`.
- Cada cambio de estado autorizado generará un nuevo registro.
- El historial no podrá modificarse ni eliminarse mediante operaciones normales de la aplicación ni mediante acciones administrativas ordinarias.
- Los cambios posteriores al registro inicial deberán identificar al usuario responsable y registrar la fecha y hora.
- `changedByUserId` será nulo exclusivamente en el registro inicial automático de la solicitud.
- La actualización del estado actual de `ServiceRequest` y la creación del registro histórico correspondiente se realizarán dentro de una misma transacción de PostgreSQL.
- El backend validará las transiciones permitidas antes de registrar cada cambio.
- El motivo será obligatorio para los rechazos y las cancelaciones.

### 3.12 IdempotencyRecord — Registro de idempotencia

Registra las claves utilizadas para reconocer reintentos de operaciones y evitar solicitudes duplicadas.

Campos conceptuales:
- `id`: identificador único.
- `idempotencyKey`: clave de idempotencia proporcionada para identificar la operación.
- `operation`: tipo de operación protegida.
- `requestFingerprint`: huella de los datos recibidos para comprobar que la operación repetida corresponde a la misma solicitud.
- `status`: estado del procesamiento.
- `serviceRequestId`: referencia a la solicitud creada, cuando corresponda.
- `createdAt`: fecha de creación del registro.
- `expiresAt`: fecha de expiración del registro.

Reglas:
- La combinación `(idempotencyKey, operation)` deberá ser única.
- Una repetición de la misma operación, con la misma clave y los mismos datos, no creará otra solicitud.
- Cuando la operación ya se haya completado, el backend devolverá el resultado original asociado.
- Reutilizar una clave con datos diferentes será rechazado.
- La creación del registro de idempotencia y de la solicitud se coordinará mediante una transacción de PostgreSQL.
- Los registros en procesamiento deberán gestionarse de forma segura ante fallos o solicitudes concurrentes.
- No se almacenarán contraseñas, credenciales ni datos sensibles innecesarios en esta entidad.
- Los registros expirados podrán eliminarse mediante una política de limpieza definida por el sistema.
- La expiración lógica de un registro no liberará por sí sola la restricción de unicidad; el backend deberá aplicar una política segura de reutilización o limpieza antes de aceptar nuevamente la misma combinación de clave y operación.

### 3.13 RequestVerification — Verificación de solicitud

Representa un mecanismo temporal de verificación para autorizar consultas sobre una solicitud de servicio.

Campos conceptuales:
- `id`: identificador único.
- `serviceRequestId`: solicitud que se desea consultar.
- `codeHash`: hash del código de verificación generado.
- `expiresAt`: fecha y hora de caducidad.
- `attemptCount`: cantidad de intentos realizados.
- `maxAttempts`: máximo de intentos permitidos.
- `usedAt`: fecha y hora de utilización; será nula mientras no se haya utilizado.
- `createdAt`: fecha de creación.

Reglas:
- El código se generará en el backend y se almacenará únicamente mediante su hash.
- El código original no se almacenará en PostgreSQL ni se incluirá en registros de producción.
- Cada código estará asociado a una solicitud concreta.
- La política de generación deberá impedir que existan varios códigos vigentes y utilizables simultáneamente para una misma solicitud.
- El código tendrá una vigencia limitada y un máximo de intentos.
- Al alcanzar el límite de intentos, el código dejará de ser válido.
- Un código expirado o utilizado no permitirá nuevas consultas.
- La verificación se realizará en el backend antes de mostrar información de la solicitud.
- El envío por SMS será simulado en la versión académica.
- En el entorno de demostración se permitirá consultar el código generado para probar el flujo; esta posibilidad no estará disponible en producción.
- La generación y utilización de códigos deberán evitar reutilizaciones.
- La comprobación del código, el incremento de `attemptCount` y la actualización de `usedAt` deberán ejecutarse de forma atómica para impedir que solicitudes concurrentes excedan el límite de intentos o reutilicen un código.
- Los intentos fallidos deberán incrementar `attemptCount` de forma atómica; los intentos posteriores al límite no deberán permitir validar el código.
- Una verificación válida solo podrá autorizar una consulta y el código deberá quedar marcado como utilizado en la misma operación atómica.

### 3.14 ResourceAssignment — Asignación de recurso

Relaciona una solicitud con un recurso durante un período.

Campos conceptuales:
- `id`: identificador único.
- `serviceRequestId`: solicitud relacionada.
- `resourceId`: recurso asignado.
- `startAt`: inicio del período.
- `endAt`: final del período.
- `status`: estado de la asignación.
- `assignedByUserId`: usuario que realizó la asignación, cuando corresponda.
- `createdAt`: fecha de creación.

Reglas:
- El período debe ser válido: `startAt` deberá ser anterior a `endAt`.
- Se debe comprobar en el backend que el estado operativo del recurso permita su utilización.
- No se permitirán asignaciones activas del mismo recurso cuyos períodos se superpongan.
- La disponibilidad deberá comprobarse y la asignación registrarse mediante operaciones protegidas frente a solicitudes concurrentes en PostgreSQL.
- Las asignaciones canceladas conservarán su registro histórico y no bloquearán el recurso cuando la cancelación implique su liberación.
- La cancelación de una asignación no deberá eliminar el registro ni su trazabilidad.

### 3.15 Insurer — Aseguradora de demostración

Representa una aseguradora ficticia utilizada para la demostración.

Campos conceptuales:
- `id`: identificador único.
- `name`: nombre ficticio.
- `isDemoData`: indicador de registro de demostración.

No representa una integración con una aseguradora real.

### 3.16 DemoPolicy — Póliza ficticia

Representa una póliza ficticia para demostrar una consulta.

Campos conceptuales:
- `id`: identificador único.
- `policyCode`: código ficticio de la póliza.
- `insurerId`: aseguradora ficticia relacionada.
- `demoStatus`: estado ficticio de demostración.
- `isDemoData`: indicador de datos ficticios.

Reglas:
- `policyCode` deberá ser único entre las pólizas de demostración.
- `insurerId` deberá referenciar una aseguradora existente.
- `demoStatus` utilizará valores controlados definidos por el sistema, no texto libre.
- Los registros deberán identificarse claramente como datos ficticios.
- Las consultas de estas pólizas tendrán fines exclusivamente demostrativos y no constituirán una validación real de cobertura ni una aprobación de servicios por parte de una aseguradora.
- La respuesta solo debe incluir los campos necesarios.

### 3.17 AuditEvent — Evento de auditoría

Registra operaciones relevantes para revisión y trazabilidad del sistema.

Campos conceptuales:
- `id`: identificador único.
- `userId`: usuario relacionado, si corresponde.
- `action`: tipo de operación.
- `entityType`: tipo de entidad afectada.
- `entityId`: identificador del registro afectado, cuando corresponda.
- `createdAt`: fecha y hora del evento.
- `details`: información limitada y segura sobre la operación.
- `result`: resultado de la operación, indicando si fue exitosa o fallida.

Reglas:
- Los registros se conservarán durante toda la vida útil del sistema, sin eliminación automática.
- El acceso de consulta estará restringido al administrador.
- Los registros no podrán modificarse ni eliminarse mediante operaciones normales de la aplicación ni mediante acciones administrativas ordinarias.
- No se registrarán contraseñas, claves API, tokens ni credenciales.
- `details` contendrá únicamente información necesaria para la auditoría y evitará datos personales innecesarios.
- Cada evento registrará el resultado de la operación.

### 3.18 AgentToolLog — Registro de herramientas del agente

Registra las ejecuciones de herramientas del agente para facilitar la depuración y la trazabilidad técnica. Es independiente de `AuditEvent`, que registra operaciones relevantes del sistema.

Campos conceptuales:
- `id`: identificador único de la ejecución.
- `toolName`: nombre de la herramienta ejecutada.
- `userId`: usuario que originó la ejecución, cuando pueda identificarse; opcional.
- `serviceRequestId`: solicitud de servicio relacionada, cuando corresponda; opcional.
- `requestId`: identificador de correlación técnica, cuando corresponda; no sustituye a `serviceRequestId`.
- `status`: resultado de la ejecución.
- `createdAt`: fecha y hora de ejecución.
- `safeErrorCode`: código de error seguro, si ocurre un fallo.

Reglas:
- No registrar contraseñas, claves API, tokens ni credenciales.
- No almacenar conversaciones completas ni argumentos sensibles de las herramientas por defecto.
- Conservar únicamente la información necesaria para depuración y trazabilidad.
- Representar los errores mediante códigos seguros, sin exponer detalles internos sensibles.
- Controlar el acceso a estos registros y su volumen.

### 3.19 AuthLoginAttempt — Control de intentos de autenticación

Almacena únicamente los contadores necesarios para limitar intentos de inicio de sesión.

Campos implementados:
- `keyHash`: HMAC de un identificador de correo o dirección IP; no conserva el dato original.
- `failureCount`: intentos fallidos dentro de la ventana.
- `windowStartedAt`: inicio de la ventana de 15 minutos.
- `blockedUntil`: fin del bloqueo temporal, si se alcanzó el límite.
- `updatedAt`: fecha del último intento registrado.

Reglas del modelo:
- Se permiten hasta cinco fallos por identificador o dirección IP antes de bloquear nuevos intentos durante 15 minutos.
- Las claves HMAC utilizan `SESSION_SECRET`.
- Los registros antiguos se eliminan después de 24 horas.

## 4. Relaciones principales

- Un rol puede estar asociado a muchos usuarios.
- Cada usuario tendrá exactamente un rol.
- Un usuario puede tener muchas sesiones.
- Cada sesión pertenece a un único usuario.
- Un cliente puede estar asociado a muchas solicitudes.
- Una solicitud puede estar vinculada a cero o un cliente mediante `clientId`.
- Una solicitud puede registrarse sin una ficha permanente de cliente.
- Un servicio ofrecido puede estar asociado a muchas solicitudes.
- Cada solicitud deberá referenciar un único servicio ofrecido mediante `serviceOfferingId`.
- Un servicio ofrecido puede estar inactivo y conservar sus solicitudes históricas.
- Los canales de atención se administran de forma independiente y no requieren una relación obligatoria con otras entidades.
- Una solicitud puede tener muchos registros históricos de estado.
- Cada registro histórico pertenece a una única solicitud.
- Un usuario puede realizar muchos cambios de estado en solicitudes.
- El usuario responsable de un registro histórico puede ser nulo cuando se trate del registro inicial automático.
- Una solicitud puede tener cero o un registro de idempotencia asociado a su creación.
- Cada registro de idempotencia puede estar asociado a cero o una solicitud, porque puede existir mientras la operación todavía se procesa o si no llega a completarse.
- Una solicitud puede tener muchos registros de verificación a lo largo del tiempo.
- Cada registro de verificación pertenece a una única solicitud.
- Un artículo de inventario puede tener muchos movimientos.
- Un usuario autorizado puede realizar muchos movimientos de inventario.
- Una solicitud puede tener varias asignaciones a recursos.
- Un recurso puede aparecer en muchas asignaciones a lo largo del tiempo.
- Una aseguradora ficticia puede tener muchas pólizas ficticias.
- Un usuario puede estar relacionado con muchos eventos de auditoría.
- Un usuario puede originar muchas ejecuciones registradas en `AgentToolLog`.
- Cada registro de `AgentToolLog` puede estar asociado a cero o un usuario.
- Una solicitud de servicio puede estar relacionada con muchos registros de `AgentToolLog`.
- Cada registro de `AgentToolLog` puede estar asociado a cero o una solicitud de servicio.
- `requestId` es un identificador de correlación técnica y no representa una relación entre entidades.

## 5. Diagrama conceptual

El siguiente diagrama representa las relaciones principales. Es conceptual y debe revisarse antes de implementar las tablas.

```mermaid
erDiagram
    ROLE ||--o{ USER : asigna
    USER ||--o{ SESSION : mantiene
    CLIENT o|--o{ SERVICE_REQUEST : vincula
    SERVICE_OFFERING ||--o{ SERVICE_REQUEST : identifica
    SERVICE_REQUEST ||--o{ SERVICE_REQUEST_STATUS_HISTORY : registra
    USER o|--o{ SERVICE_REQUEST_STATUS_HISTORY : realiza
    USER ||--o{ INVENTORY_MOVEMENT : realiza
    INVENTORY_ITEM ||--o{ INVENTORY_MOVEMENT : registra
    SERVICE_REQUEST ||--o{ RESOURCE_ASSIGNMENT : solicita
    USER o|--o{ RESOURCE_ASSIGNMENT : realiza
    RESOURCE ||--o{ RESOURCE_ASSIGNMENT : recibe
    SERVICE_REQUEST o|--o| IDEMPOTENCY_RECORD : protege
    SERVICE_REQUEST ||--o{ REQUEST_VERIFICATION : verifica
    USER ||--o{ AUDIT_EVENT : genera
    USER o|--o{ AGENT_TOOL_LOG : origina
    SERVICE_REQUEST o|--o{ AGENT_TOOL_LOG : relaciona
    INSURER ||--o{ DEMO_POLICY : contiene

    SERVICE_OFFERING {
        string id PK
        string name
        string description
        string category
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    CONTACT_CHANNEL {
        string id PK
        string type
        string label
        string value
        string instructions
        boolean isActive
        timestamp createdAt
        timestamp updatedAt
    }

    IDEMPOTENCY_RECORD {
        string id PK
        string idempotencyKey
        string operation
        string requestFingerprint
        string status
        string serviceRequestId FK
        timestamp createdAt
        timestamp expiresAt
    }

    REQUEST_VERIFICATION {
        string id PK
        string serviceRequestId FK
        string codeHash
        timestamp expiresAt
        integer attemptCount
        integer maxAttempts
        timestamp usedAt
        timestamp createdAt
    }

    AUTH_LOGIN_ATTEMPT {
        string keyHash PK
        integer failureCount
        timestamp windowStartedAt
        timestamp blockedUntil
        timestamp updatedAt
    }
```

## 6. Decisiones pendientes

- Confirmar con el personal funerario los tipos, estados y reglas operativas de los recursos.
- Validar las unidades de medida, categorías y tipos de artículos de inventario.
- Confirmar las reglas de privacidad, conservación y tratamiento de datos personales aplicables al contexto académico.
- Validar con el personal funerario el flujo operativo de solicitudes, asignaciones y movimientos de inventario.
- Revisar el modelo contra los casos de uso y los requisitos académicos antes de definir el esquema físico.

## 7. Criterios de aceptación

El modelo estará listo para implementarse cuando:

1. Las entidades cubran los requisitos y casos de uso aprobados.
2. Las relaciones, cardinalidades y restricciones estén definidas.
3. Los roles `administrador` y `empleado` tengan permisos definidos en el backend.
4. Los servicios ofrecidos y canales de atención sean administrables por el administrador y consultables públicamente solo cuando estén activos.
5. Cada solicitud referencie un servicio ofrecido, conservando el historial cuando este se desactive.
6. La creación de solicitudes contemple idempotencia y evite duplicados ante reintentos.
7. La verificación de solicitudes utilice códigos de un solo uso, con hash, vencimiento y límite de intentos.
8. Las solicitudes puedan registrarse con o sin ficha permanente de cliente.
9. Las asignaciones respeten la disponibilidad y las reglas de los recursos.
10. Los movimientos de inventario conserven cantidades anteriores y posteriores.
11. La autenticación, las sesiones y la protección contra intentos repetidos estén contempladas.
12. Los registros de auditoría y herramientas del agente permitan trazabilidad sin almacenar secretos.
13. Las reglas de privacidad y protección de datos estén documentadas.
14. El modelo pueda traducirse a tablas y migraciones sin ambigüedades importantes.
