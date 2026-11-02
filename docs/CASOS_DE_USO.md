
# Serena — Casos de uso del sistema

**Versión:** 0.1  
**Estado:** Borrador académico  
**Proyecto:** Sistema Inteligente de Gestión Funeraria

## 1. Objetivo

Describir las interacciones principales entre los usuarios y Serena. Estos casos de uso servirán como base para el diseño, la implementación y las pruebas.

## 2. Actores

- **Visitante:** consulta información pública y solicita orientación.
- **Cliente solicitante:** inicia una solicitud y consulta su estado mediante un mecanismo autorizado.
- **Empleado:** gestiona solicitudes y recursos únicamente mediante las operaciones permitidas por sus permisos.
- **Administrador:** administra cuentas de empleados, asigna roles existentes, gestiona recursos y configura servicios, canales de contacto y otras opciones administrativas autorizadas.
- **Agente de IA:** interpreta consultas y solicita operaciones a través de herramientas autorizadas por el backend.
- **Sistema externo de IA:** proveedor utilizado para generar respuestas del agente.

El sistema externo de IA no tiene autorización independiente para consultar o modificar directamente la base de datos. Los permisos de administrador y empleado son definidos por el backend y no se configuran mediante roles personalizados.

## 3. CU-01 — Consultar información de la funeraria

**Actor principal:** Visitante.

**Objetivo:** Obtener información general sobre los servicios disponibles y los canales de contacto habilitados.

**Precondiciones:**
- El sistema está disponible.
- El sistema puede consultar los servicios y canales de contacto configurados, aunque no existan registros activos.

**Flujo principal:**
1. El visitante abre el portal público.
2. El sistema consulta los servicios activos y los canales de contacto activos.
3. Serena presenta la información disponible.
4. El visitante selecciona el servicio o canal de contacto que desea consultar.
5. Serena muestra la información correspondiente.

**Flujos alternativos:**
- Si no existen servicios activos, el sistema informa que no hay servicios disponibles para consultar.
- Si no existen canales de contacto activos, el sistema indica que la atención humana no está configurada.
- Si ocurre un error, se muestra un mensaje comprensible.

**Postcondición:** El visitante ha consultado la información pública disponible.

**Criterios de aceptación:**
- La información se presenta en español.
- No se muestran datos privados.
- Solo se muestran servicios y canales de contacto activos.
- Los servicios y canales de contacto solo pueden ser administrados por un administrador.
- Los canales de contacto no se inventan ni se presentan datos que no estén configurados.

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
5. El backend valida la operación, sus argumentos y los permisos correspondientes antes de ejecutarla.
6. El backend devuelve el resultado de la operación al agente.
7. El agente formula una respuesta basada en la información disponible.
8. Serena presenta la respuesta al usuario.

**Flujos alternativos:**
- Si faltan datos, el agente solicita la información necesaria.
- Si el proveedor no está disponible, Serena informa del problema.
- Si la herramienta falla, el agente no afirma que la operación tuvo éxito.
- Si la consulta requiere intervención humana, se ofrece un canal de contacto configurado y activo.
- Si no existen canales de contacto activos, se informa que la atención humana no está configurada.

**Postcondición:** El usuario recibe una respuesta o una explicación del motivo por el que no pudo resolverse su consulta.

**Criterios de aceptación:**
- El agente no inventa resultados operativos.
- Las herramientas se ejecutan exclusivamente desde el backend.
- El agente no accede directamente a la base de datos.
- Solo se consultan servicios y canales de contacto activos.
- La atención humana se ofrece únicamente mediante canales configurados y activos.
- Los errores se comunican correctamente.
- Las operaciones realizadas mediante herramientas quedan registradas de forma segura, sin almacenar secretos.

## 5. CU-03 — Crear una solicitud de servicio

**Actor principal:** Cliente solicitante.

**Objetivo:** Registrar una solicitud para un servicio disponible y obtener una referencia.

**Precondiciones:**
- El sistema permite registrar solicitudes.
- Existe al menos un servicio activo.
- El formulario y las reglas de validación están configurados.

**Flujo principal:**
1. El usuario selecciona un servicio activo.
2. Serena muestra los campos necesarios para registrar la solicitud.
3. El usuario completa los datos obligatorios.
4. El backend valida los datos, comprueba que el servicio seleccionado esté activo y aplica las reglas de negocio.
5. El backend registra la solicitud vinculándola al servicio mediante `serviceOfferingId`.
6. El backend registra la operación de idempotencia de forma transaccional con la creación de la solicitud.
7. Serena devuelve la referencia y el estado inicial de la solicitud.

**Flujos alternativos:**
- Si faltan datos, se solicitan los campos pendientes.
- Si los datos son inválidos, se explica cómo corregirlos.
- Si el servicio seleccionado no está activo, se solicita seleccionar otro servicio disponible.
- Si el registro falla, se informa del error sin mostrar una confirmación falsa.
- Si se recibe una clave de idempotencia ya utilizada con los mismos datos, se devuelve el resultado original sin crear otra solicitud.
- Si se recibe una clave de idempotencia ya utilizada con datos diferentes, se rechaza la operación.
- Si se detecta un reintento mientras la operación está en curso, el backend evita la creación de solicitudes duplicadas.

**Postcondición:** La solicitud queda registrada o el usuario recibe un mensaje indicando que no se pudo registrar.

**Criterios de aceptación:**
- Cada solicitud creada tiene un identificador único.
- Cada solicitud queda vinculada a un servicio mediante `serviceOfferingId`.
- Solo pueden crearse solicitudes para servicios activos.
- No es obligatorio crear un registro permanente de cliente para registrar una solicitud.
- El estado inicial es explícito.
- Crear la solicitud no confirma automáticamente el servicio ni genera una asignación de recursos.
- La creación de la solicitud y su registro de idempotencia se coordinan transaccionalmente.
- La operación no genera duplicados ante reintentos controlados.

## 6. CU-04 — Consultar el estado de una solicitud

**Actor principal:** Cliente solicitante o empleado autorizado.

**Objetivo:** Conocer el estado actual de una solicitud sin exponer información a personas no autorizadas.

**Precondiciones:**
- Para el flujo público, el cliente dispone de una referencia y puede completar el mecanismo de verificación requerido; la existencia de la solicitud se comprueba internamente sin revelarla.
- Para el flujo de empleado, este dispone de una cuenta autenticada con permisos suficientes.

**Flujo principal para el cliente solicitante:**
1. El cliente inicia la consulta pública.
2. Proporciona la referencia de la solicitud.
3. El backend procesa la referencia sin revelar si corresponde a una solicitud existente y, cuando procede, genera un código de verificación de un solo uso.
4. El sistema simula el envío del código mediante SMS.
5. El cliente introduce el código recibido.
6. El backend comprueba el hash del código, su vencimiento, el número de intentos y si ya fue utilizado.
7. Si la verificación es válida, el backend autoriza la consulta.
8. El sistema obtiene el estado registrado en la base de datos.
9. Serena presenta únicamente la información permitida.

**Flujo principal para el empleado autorizado:**
1. El empleado inicia sesión.
2. Busca la solicitud mediante su referencia.
3. El backend comprueba la autenticación y los permisos del empleado.
4. El sistema consulta la información autorizada.
5. Serena presenta el resultado permitido.

**Flujos alternativos:**
- Si la referencia no corresponde a una solicitud o no puede completarse la verificación, se devuelve una respuesta pública genérica que no revela si la solicitud existe.
- Si el código es incorrecto, se incrementa el contador de intentos.
- Si se alcanza el máximo de intentos permitidos, el código queda bloqueado.
- Si el código ha vencido o ya fue utilizado, se rechaza y no puede reutilizarse.
- Si el empleado no tiene permisos suficientes, se deniega el acceso.
- Si ocurre un error, no se inventa un estado.

**Postcondición:** El usuario recibe el estado verificado o una respuesta controlada. El código de verificación válido queda marcado como utilizado.

**Criterios de aceptación:**
- El cliente debe proporcionar la referencia y un código de verificación de un solo uso.
- El código tiene vencimiento y un límite de intentos.
- El código utilizado, vencido o bloqueado no puede reutilizarse.
- La base de datos almacena únicamente el hash del código.
- En el entorno de demostración académica, el envío por SMS es simulado y el código puede consultarse únicamente mediante un mecanismo controlado de demostración.
- El código no se expone en interfaces ni registros de producción.
- Los empleados consultan solicitudes mediante autenticación y permisos definidos por el backend.
- Las respuestas públicas y su comportamiento observable no permiten determinar si una referencia corresponde a una solicitud existente.
- La generación y validación de códigos aplica límites de frecuencia para reducir intentos automatizados.
- La comprobación del código y la actualización del contador de intentos se realizan de forma atómica para respetar el límite incluso ante solicitudes concurrentes.
- El estado procede de la base de datos.
- No se exponen datos innecesarios.

## 7. CU-05 — Consultar la disponibilidad de un recurso

**Actor principal:** Empleado autorizado o usuario con acceso permitido.

**Objetivo:** Conocer si un recurso puede utilizarse en un período determinado.

**Precondiciones:**
- El recurso está registrado.
- El período de consulta es válido.
- El usuario tiene autorización para consultar la disponibilidad.

**Flujo principal:**
1. El usuario selecciona el tipo de recurso, el recurso y el período que desea consultar.
2. El backend valida los datos y los permisos del usuario.
3. El sistema comprueba que el recurso esté habilitado para operar.
4. El sistema consulta las asignaciones existentes y sus períodos.
5. El backend identifica las asignaciones que se solapan con el período solicitado, excluyendo las canceladas.
6. El sistema determina la disponibilidad según las reglas operativas.
7. Serena muestra el resultado de la consulta.

**Flujos alternativos:**
- Si el período es inválido, se solicita corregirlo.
- Si el recurso no existe, se informa de ello.
- Si el recurso no está habilitado para operar, se indica que no está disponible.
- Si existe una asignación incompatible durante el período, se indica que el recurso está ocupado.
- Si ocurre un error, no se afirma que el recurso está libre.
- Si el usuario no tiene permisos suficientes, se deniega la consulta.

**Postcondición:** Se devuelve el resultado de la consulta correspondiente al momento en que se realizó. No se crea una reserva ni una asignación.

**Criterios de aceptación:**
- Solo se consideran recursos habilitados para operar.
- Se consideran las asignaciones que se solapan con el período consultado.
- Las asignaciones canceladas no bloquean la disponibilidad.
- La consulta no reserva ni asigna el recurso.
- La disponibilidad vuelve a comprobarse en el backend al crear una asignación.
- La comprobación de disponibilidad y la creación de una asignación deben protegerse frente a operaciones concurrentes, de modo que no puedan confirmarse asignaciones incompatibles para un mismo recurso.
- Los errores o resultados no disponibles no se presentan como confirmaciones de disponibilidad.
- El acceso se valida mediante los permisos definidos por el backend.

## 8. CU-06 — Registrar un movimiento de inventario

**Actor principal:** Empleado autorizado.

**Objetivo:** Registrar una entrada, salida o ajuste de inventario y mantener actualizadas las existencias.

**Precondiciones:**
- El empleado está autenticado.
- Tiene permiso para gestionar inventario.
- El artículo existe y puede recibir el tipo de movimiento solicitado.

**Flujo principal:**
1. El empleado selecciona el artículo.
2. Indica el tipo y la cantidad del movimiento.
3. El backend valida la operación, los permisos y las reglas de inventario.
4. El backend obtiene y protege la lectura de la cantidad existente frente a actualizaciones concurrentes.
5. El sistema calcula la nueva cantidad conforme al tipo de movimiento.
6. El backend registra el movimiento con la cantidad anterior, la cantidad nueva, el responsable y la fecha de creación.
7. El backend actualiza la existencia del artículo.
8. El registro del movimiento y la actualización de la existencia se ejecutan dentro de una misma transacción.
9. Serena muestra el resultado confirmado por el backend.

**Flujos alternativos:**
- Si la cantidad es inválida, se rechaza la operación.
- Si una salida supera las existencias disponibles, el backend rechaza la operación.
- Si el artículo no existe o no puede recibir el movimiento, se rechaza la operación.
- Si el empleado carece de permiso, se deniega la operación.
- Si falla el registro del movimiento o la actualización de la existencia, se revierte la transacción completa.
- Si ocurre un error, Serena no presenta la operación como exitosa.

**Postcondición:** El movimiento y la existencia quedan consistentes y registrados, o la operación falla sin dejar cambios parciales.

**Criterios de aceptación:**
- Cada movimiento queda registrado en el historial.
- Cada movimiento conserva la cantidad anterior y la cantidad posterior.
- El responsable y la fecha de creación se obtienen y registran desde el backend.
- El registro del movimiento y la actualización de la existencia se realizan en una misma transacción.
- Las actualizaciones concurrentes deben protegerse para evitar pérdidas de actualización y mantener la consistencia de las cantidades y los movimientos.
- Si alguna operación falla, no se conservan cambios parciales.
- Las existencias reflejan los movimientos confirmados.
- El backend valida los permisos antes de modificar el inventario.
- Las salidas no pueden superar las existencias disponibles ni producir cantidades negativas.

## 9. CU-07 — Gestionar recursos

**Actor principal:** Administrador o empleado, según los permisos definidos por el backend.

**Objetivo:** Mantener el registro de los recursos operativos y controlar su disponibilidad.

**Precondiciones:**
- El usuario está autenticado.
- El usuario tiene permisos para la operación solicitada.
- El recurso existe, si se trata de una consulta o modificación.

**Flujo principal:**
1. El usuario abre el módulo de recursos.
2. El backend valida la autenticación y los permisos correspondientes.
3. El sistema presenta los recursos que el usuario está autorizado a consultar.
4. El administrador crea o modifica recursos y gestiona su estado operativo.
5. El empleado realiza únicamente las operaciones sobre recursos que sus permisos le permitan.
6. El backend valida los datos y las reglas operativas antes de guardar los cambios.
7. Serena presenta el resultado confirmado por el backend.

**Flujos alternativos:**
- Si faltan campos obligatorios o los datos son inválidos, la operación se rechaza.
- Si el usuario no tiene permiso para la operación, se deniega el acceso.
- Si el recurso tiene asignaciones activas, se impide su eliminación o deshabilitación cuando estas acciones puedan invalidarlas.
- Si se intenta modificar un recurso de forma incompatible con una asignación vigente, el backend rechaza la operación.
- Si ocurre un error, Serena no presenta el cambio como exitoso.

**Postcondición:** El recurso queda registrado o actualizado conforme a las reglas operativas, o la operación se rechaza sin dejar cambios indebidos.

**Criterios de aceptación:**
- El backend valida los permisos en cada operación privada.
- El administrador puede gestionar los recursos y sus estados operativos.
- El empleado solo puede ejecutar las operaciones expresamente autorizadas para su rol.
- No se permite eliminar ni deshabilitar un recurso cuando ello invalide asignaciones activas.
- Las modificaciones respetan las asignaciones y los períodos de uso vigentes.
- Los cambios quedan registrados de acuerdo con las reglas de auditoría.
- No se presentan operaciones fallidas como exitosas.

## 10. CU-08 — Consultar una póliza ficticia

**Actor principal:** Cliente solicitante o empleado autorizado, según los permisos definidos por el backend.

**Objetivo:** Demostrar el flujo de consulta de pólizas mediante registros ficticios, sin integrar una aseguradora real.

**Precondiciones:**
- La herramienta de consulta está habilitada y puede consultar el catálogo ficticio, aunque no existan registros.
- El usuario cumple las condiciones de acceso establecidas para la consulta.

**Flujo principal:**
1. El usuario solicita una consulta de póliza.
2. Serena solicita los datos mínimos necesarios.
3. El backend valida los datos y los permisos correspondientes.
4. El backend consulta exclusivamente los registros ficticios almacenados para la demostración.
5. Serena presenta el resultado e indica claramente que se trata de información ficticia de demostración.

**Flujos alternativos:**
- Si no existe el registro ficticio, se informa de ello sin inventar información.
- Si los datos de entrada son inválidos, se solicita corregirlos.
- Si el usuario no tiene autorización, se deniega la consulta.
- Si la herramienta o la base de datos no están disponibles, se informa del error sin presentar un resultado como válido.
- Si el resultado es ambiguo o incompleto, se comunica esa limitación.

**Postcondición:** Se presenta un resultado ficticio verificable o una respuesta controlada que indica que no fue posible completar la consulta.

**Criterios de aceptación:**
- Solo se consultan registros ficticios de demostración.
- No existe integración con aseguradoras reales en esta etapa.
- El backend valida los datos y los permisos antes de ejecutar la consulta.
- El agente no inventa pólizas, coberturas ni resultados.
- La respuesta aclara que la consulta es una demostración académica.
- El resultado no constituye una validación oficial de cobertura ni una autorización de pago.
- Los errores se comunican sin generar confirmaciones falsas.
- Las consultas realizadas mediante herramientas quedan registradas de forma segura, sin almacenar secretos ni datos innecesarios.

## 11. CU-09 — Administrar usuarios y roles

**Actor principal:** Administrador autorizado.

**Objetivo:** Gestionar las cuentas del personal y asignar los roles definidos por el sistema.

**Precondiciones:**
- El administrador está autenticado.
- Su cuenta tiene permisos administrativos.
- Los roles disponibles están definidos por el backend.

**Flujo principal:**
1. El administrador abre el módulo de usuarios.
2. El backend valida su autenticación y sus permisos.
3. El sistema presenta las cuentas que el administrador está autorizado a consultar.
4. El administrador crea una cuenta de empleado o modifica los datos permitidos de una cuenta existente.
5. El administrador asigna uno de los roles existentes: `administrador` o `empleado`.
6. El backend valida los datos, las reglas de seguridad y los permisos de la operación.
7. El sistema guarda los cambios.
8. Serena confirma la operación únicamente después de que el backend la complete correctamente.

**Flujos alternativos:**
- Si el administrador no está autorizado, se deniega la operación.
- Si los datos son inválidos o incompletos, se rechaza el cambio.
- Si se intenta asignar un rol inexistente, se rechaza la operación.
- Si se intenta crear un rol o configurar permisos personalizados, la operación no está permitida.
- Si el cambio falla, no se afirma que fue aplicado.
- Si ocurre un error, se informa sin exponer información sensible.

**Postcondición:** La cuenta se crea o modifica con un rol existente y conforme a las reglas de seguridad del sistema, o la operación se rechaza sin cambios indebidos.

**Criterios de aceptación:**
- Solo un administrador autorizado puede crear cuentas de empleados y administrar usuarios.
- No existe registro público de cuentas del personal.
- Solo se pueden asignar los roles fijos `administrador` y `empleado`.
- Los permisos de cada rol están definidos por el backend.
- No se permite crear roles ni configurar permisos personalizados.
- El backend valida los permisos en cada operación administrativa.
- Las operaciones administrativas relevantes quedan registradas en la auditoría.
- Las credenciales y los datos sensibles no se exponen en respuestas ni registros.
- Serena solo confirma operaciones completadas correctamente.

## 12. CU-10 — Consultar atención humana

**Actor principal:** Visitante o cliente solicitante.

**Objetivo:** Obtener un canal de atención humana cuando sea necesario.

**Precondiciones:**
- El sistema puede consultar los canales de contacto configurados.
- Puede haber canales activos o ninguno disponible.

**Flujo principal:**
1. El usuario solicita hablar con una persona.
2. Serena consulta los canales de contacto activos.
3. El backend devuelve únicamente los canales habilitados.
4. Serena presenta el canal disponible y las instrucciones correspondientes.

**Flujos alternativos:**
- Si no existe ningún canal activo, se informa que la atención humana no está configurada.
- Si el agente no está disponible, se presenta una alternativa humana únicamente cuando exista un canal activo.
- Si ocurre un error al consultar los canales, no se inventan datos de contacto.

**Postcondición:** El usuario recibe información de contacto verificada o conoce la limitación existente.

**Criterios de aceptación:**
- Solo se presentan canales de contacto activos y configurados.
- Los canales de contacto solo pueden ser creados, modificados, activados o desactivados por un administrador.
- Si no hay canales activos, el sistema informa que la atención humana no está configurada.
- Serena no inventa teléfonos, correos electrónicos, direcciones ni otros datos de contacto.
- El backend controla el acceso a la administración de canales de contacto.
- Los errores de consulta se comunican sin presentar información no verificada.

## 13. Relaciones entre casos de uso

- CU-02 utiliza herramientas autorizadas a través del backend para consultar disponibilidad, verificar pólizas ficticias, crear o consultar solicitudes y ofrecer atención humana.
- CU-02 solo consulta servicios y canales de contacto activos. El agente no accede directamente a la base de datos.
- CU-03 registra solicitudes vinculadas a un servicio activo, pero no implica automáticamente una asignación ni una confirmación del servicio.
- CU-03 utiliza idempotencia para evitar solicitudes duplicadas ante reintentos.
- CU-04 permite consultar solicitudes públicamente mediante referencia y código de verificación de un solo uso.
- CU-05 consulta disponibilidad, pero no crea reservas ni asignaciones.
- CU-06 registra movimientos y actualiza las cantidades del inventario de forma transaccional.
- CU-07 administra recursos según los permisos definidos por el backend.
- CU-09 permite administrar cuentas y asignar roles existentes.
- CU-01 y CU-10 muestran únicamente servicios y canales de contacto activos.
- Todas las operaciones privadas deben validar autenticación y permisos en el backend.

## 14. Pendientes de validación

- Campos adicionales definitivos de una solicitud y datos que deben conservarse.
- Estados de las solicitudes y transiciones permitidas.
- Reglas para cancelar solicitudes y liberar recursos.
- Reglas para confirmar un servicio y cuándo se considera confirmado.
- Tipos, estados y reglas operativas de los recursos.
- Categorías, unidades y reglas para ajustar inventario.
- Reglas para desactivar recursos con asignaciones activas.
- Políticas de privacidad, conservación y eliminación de datos.
- Requisitos específicos de la asignatura y validación del flujo con personal funerario.
