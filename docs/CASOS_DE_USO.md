
# Serena — Casos de uso del sistema

**Versión:** 0.1  
**Estado:** Borrador académico  
**Proyecto:** Sistema Inteligente de Gestión Funeraria

## 1. Objetivo

Describir las interacciones principales entre los usuarios y Serena. Estos casos de uso servirán como base para el diseño, la implementación y las pruebas.

## 2. Actores

- **Visitante:** consulta información pública y solicita orientación.
- **Cliente solicitante:** inicia una solicitud y consulta su estado mediante un mecanismo autorizado.
- **Empleado:** gestiona solicitudes y recursos según sus permisos.
- **Administrador:** administra usuarios, roles, recursos y configuraciones autorizadas.
- **Agente de IA:** interpreta consultas y solicita operaciones a través de herramientas autorizadas.
- **Sistema externo de IA:** proveedor utilizado para generar respuestas del agente.

El sistema externo de IA no tiene autorización independiente para consultar o modificar directamente la base de datos.

## 3. CU-01 — Consultar información de la funeraria

**Actor principal:** Visitante.

**Objetivo:** Obtener información general sobre los servicios y canales de contacto.

**Precondiciones:**
- El sistema está disponible.
- La información pública ha sido configurada.

**Flujo principal:**
1. El visitante abre el portal público.
2. Serena presenta los servicios y la información disponible.
3. El visitante selecciona el servicio o canal de contacto que desea consultar.
4. Serena muestra la información correspondiente.

**Flujos alternativos:**
- Si falta información de contacto, el sistema indica que ese dato no está configurado.
- Si ocurre un error, se muestra un mensaje comprensible.

**Postcondición:** El visitante ha consultado la información pública.

**Criterios de aceptación:**
- La información se presenta en español.
- No se muestran datos privados.
- Los canales de contacto no se inventan.

## 4. CU-02 — Consultar al agente de IA

**Actor principal:** Visitante o cliente solicitante.

**Objetivo:** Recibir orientación sobre los servicios y las funciones disponibles.

**Precondiciones:**
- El agente está configurado y disponible.
- El usuario puede acceder al canal de conversación.

**Flujo principal:**
1. El usuario escribe una pregunta.
2. Serena envía la consulta al backend.
3. El backend gestiona la interacción con el proveedor de IA.
4. Si se necesita consultar datos operativos, el agente solicita una herramienta autorizada.
5. El backend valida la operación y devuelve el resultado.
6. El agente formula una respuesta basada en la información disponible.
7. Serena presenta la respuesta.

**Flujos alternativos:**
- Si faltan datos, el agente solicita la información necesaria.
- Si el proveedor no está disponible, Serena informa del problema.
- Si la herramienta falla, el agente no afirma que la operación tuvo éxito.
- Si la consulta requiere intervención humana, se ofrece el canal configurado.

**Postcondición:** El usuario recibe una respuesta o una explicación del motivo por el que no pudo resolverse su consulta.

**Criterios de aceptación:**
- El agente no inventa resultados operativos.
- Las herramientas se ejecutan desde el backend.
- Los errores se comunican correctamente.

## 5. CU-03 — Crear una solicitud de servicio

**Actor principal:** Cliente solicitante.

**Objetivo:** Registrar una solicitud y obtener una referencia.

**Precondiciones:**
- El sistema permite registrar solicitudes.
- El formulario y las reglas de validación están configurados.

**Flujo principal:**
1. El usuario selecciona la opción para solicitar un servicio.
2. Serena muestra los campos necesarios.
3. El usuario completa los datos obligatorios.
4. El backend valida los datos y las reglas de negocio.
5. El sistema registra la solicitud.
6. Serena devuelve la referencia y el estado inicial.

**Flujos alternativos:**
- Si faltan datos, se solicitan los campos pendientes.
- Si los datos son inválidos, se explica cómo corregirlos.
- Si el registro falla, se informa del error sin mostrar una confirmación falsa.
- Si se detecta un posible reintento, el backend aplica el mecanismo de prevención de duplicados.

**Postcondición:** La solicitud queda registrada o el usuario recibe un mensaje indicando que no se pudo registrar.

**Criterios de aceptación:**
- Cada solicitud creada tiene un identificador único.
- El estado inicial es explícito.
- Crear la solicitud no confirma automáticamente el servicio.
- La operación no genera duplicados por reintentos controlados.

## 6. CU-04 — Consultar el estado de una solicitud

**Actor principal:** Cliente solicitante o empleado autorizado.

**Objetivo:** Conocer el estado actual de una solicitud.

**Precondiciones:**
- Existe una solicitud registrada o el usuario dispone de los datos necesarios para buscarla.
- Se ha establecido el mecanismo de autorización correspondiente.

**Flujo principal:**
1. El usuario inicia la consulta.
2. Proporciona la referencia y los datos de verificación requeridos.
3. El backend comprueba la autorización.
4. El sistema consulta el estado registrado.
5. Serena presenta la información permitida.

**Flujos alternativos:**
- Si no se encuentra la solicitud, se informa de forma controlada.
- Si el usuario no está autorizado, se deniega el acceso.
- Si ocurre un error, no se inventa un estado.

**Postcondición:** El usuario recibe el estado verificado o una respuesta controlada.

**Criterios de aceptación:**
- El usuario no puede consultar solicitudes ajenas sin autorización.
- El estado procede de la base de datos.
- No se exponen datos innecesarios.

## 7. CU-05 — Consultar la disponibilidad de un recurso

**Actor principal:** Empleado autorizado o usuario con acceso permitido.

**Objetivo:** Conocer si un recurso puede utilizarse en un período determinado.

**Precondiciones:**
- El recurso está registrado.
- El período de consulta es válido.

**Flujo principal:**
1. El usuario selecciona el tipo de recurso y el período.
2. El backend valida los datos.
3. El sistema consulta las asignaciones y reglas aplicables.
4. Serena muestra el resultado.

**Flujos alternativos:**
- Si el período es inválido, se solicita corregirlo.
- Si el recurso no existe, se informa de ello.
- Si el recurso está ocupado, se indica que no está disponible.
- Si ocurre un error, no se afirma que el recurso está libre.

**Postcondición:** Se devuelve el resultado de la consulta en el momento en que se realizó.

**Criterios de aceptación:**
- Se consideran las asignaciones existentes.
- Una consulta no reserva el recurso.
- La disponibilidad vuelve a comprobarse al ejecutar una asignación.

## 8. CU-06 — Registrar un movimiento de inventario

**Actor principal:** Empleado autorizado.

**Objetivo:** Registrar una entrada, salida o ajuste de inventario.

**Precondiciones:**
- El empleado está autenticado.
- Tiene permiso para gestionar inventario.
- El artículo existe.

**Flujo principal:**
1. El empleado selecciona el artículo.
2. Indica el tipo y la cantidad del movimiento.
3. El backend valida la operación.
4. El sistema registra el movimiento.
5. Se actualiza la existencia conforme a las reglas definidas.
6. Serena muestra el resultado.

**Flujos alternativos:**
- Si la cantidad es inválida, se rechaza la operación.
- Si una salida supera la existencia permitida, se rechaza cuando las reglas lo exijan.
- Si falla el registro, no se presenta como exitoso.
- Si el empleado carece de permiso, se deniega la operación.

**Postcondición:** El movimiento y la existencia quedan consistentes, o la operación falla sin dejar cambios parciales indebidos.

**Criterios de aceptación:**
- Cada movimiento queda registrado.
- Los cambios relacionados se realizan de forma consistente.
- Se conserva el historial de movimientos.

## 9. CU-07 — Gestionar recursos

**Actor principal:** Administrador o empleado con permiso específico.

**Objetivo:** Mantener el registro de los recursos operativos.

**Precondiciones:**
- El usuario está autenticado.
- Tiene permiso para la operación solicitada.

**Flujo principal:**
1. El usuario abre el módulo de recursos.
2. Consulta los registros existentes.
3. Crea o modifica un recurso permitido.
4. El backend valida los datos y las reglas.
5. Serena muestra el resultado.

**Flujos alternativos:**
- Si faltan campos obligatorios, la operación se rechaza.
- Si el recurso tiene asignaciones activas, se aplican las restricciones correspondientes.
- Si el usuario no tiene permiso, se deniega la operación.

**Postcondición:** El registro se crea o modifica correctamente, o la operación se rechaza de forma controlada.

## 10. CU-08 — Consultar una póliza ficticia

**Actor principal:** Cliente solicitante o empleado autorizado, según los permisos definidos.

**Objetivo:** Demostrar el flujo de consulta de pólizas sin integrar una aseguradora real.

**Precondiciones:**
- Existen registros ficticios de demostración.
- La herramienta está habilitada.

**Flujo principal:**
1. El usuario solicita una consulta.
2. Serena solicita los datos mínimos necesarios.
3. El backend consulta los registros ficticios.
4. Serena presenta el resultado y aclara que es una demostración.

**Flujos alternativos:**
- Si no existe el registro, se informa de ello.
- Si la entrada es inválida, se solicita corregirla.
- Si ocurre un error, no se inventa un resultado.

**Postcondición:** Se presenta un resultado ficticio verificable o un mensaje de error.

## 11. CU-09 — Administrar usuarios y roles

**Actor principal:** Administrador autorizado.

**Objetivo:** Gestionar las cuentas y los permisos del personal.

**Precondiciones:**
- El administrador está autenticado.
- Su cuenta tiene permisos administrativos.

**Flujo principal:**
1. El administrador abre el módulo de usuarios.
2. Consulta las cuentas autorizadas.
3. Crea una cuenta o modifica un rol permitido.
4. El backend valida los permisos y los datos.
5. Serena confirma la operación únicamente después de completarla.

**Flujos alternativos:**
- Si el usuario no está autorizado, se deniega la operación.
- Si los datos son inválidos, se rechaza el cambio.
- Si el cambio falla, no se afirma que fue aplicado.

**Postcondición:** La cuenta se crea o modifica de acuerdo con los permisos y las reglas del sistema.

## 12. CU-10 — Consultar atención humana

**Actor principal:** Visitante o cliente solicitante.

**Objetivo:** Obtener un canal de atención humana cuando sea necesario.

**Precondiciones:**
- Se ha configurado un canal de contacto o el sistema puede informar que todavía no existe.

**Flujo principal:**
1. El usuario solicita hablar con una persona.
2. Serena consulta los datos de contacto configurados.
3. Presenta el canal disponible y las instrucciones correspondientes.

**Flujos alternativos:**
- Si no existe un canal configurado, lo comunica sin inventar datos.
- Si el agente no está disponible, presenta la alternativa humana cuando esté configurada.

**Postcondición:** El usuario recibe información de contacto verificada o conoce la limitación existente.

## 13. Relaciones entre casos de uso

- CU-02 puede utilizar CU-05, CU-08, CU-03, CU-04 o CU-10 mediante herramientas autorizadas.
- CU-03 registra solicitudes, pero no implica automáticamente una asignación confirmada.
- CU-05 consulta disponibilidad, pero no modifica reservas.
- CU-06 registra movimientos de inventario.
- CU-07 administra recursos según los permisos.
- CU-09 administra cuentas y roles.
- Todas las operaciones privadas deben aplicar autenticación y autorización en el backend.

## 14. Pendientes de validación

- Campos definitivos de una solicitud.
- Estados y transiciones permitidas.
- Método de autorización para consultar solicitudes.
- Roles definitivos y permisos detallados.
- Reglas para cancelar solicitudes y liberar recursos.
- Reglas para ajustar inventario.
- Procedimiento para confirmar un servicio.
- Requisitos específicos de la asignatura.
