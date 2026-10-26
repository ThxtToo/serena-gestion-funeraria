
# Serena — Contrato del agente de inteligencia artificial

**Versión:** 0.1  
**Estado:** Borrador para revisión  
**Proveedor previsto:** Groq  
**Ubicación de ejecución:** Backend de Serena

## 1. Objetivo

Definir los límites, las herramientas y las reglas de funcionamiento del agente de inteligencia artificial de Serena.

El agente ayudará a interpretar consultas y orientar a los usuarios. No será la fuente oficial de los datos operativos ni tendrá acceso irrestricto a la base de datos.

## 2. Principios obligatorios

1. El backend y la base de datos son la fuente de verdad de la información operativa.
2. El agente no puede inventar resultados de consultas.
3. Toda operación que afecte a los datos debe pasar por una herramienta autorizada del backend.
4. El backend debe validar argumentos, permisos y reglas de negocio.
5. Una solicitud recibida no equivale a un servicio confirmado.
6. Las pólizas utilizadas en la demostración son ficticias.
7. Si una herramienta falla, el agente debe comunicar que no pudo completar la operación.
8. El agente debe ofrecer atención humana cuando corresponda.
9. Las claves API nunca deben enviarse al navegador.
10. La conversación no debe recopilar más información personal de la necesaria.

## 3. Usuarios y permisos

### Visitante

Puede:
- Consultar información pública.
- Preguntar por los servicios disponibles.
- Solicitar orientación.
- Consultar información pública que el sistema tenga autorizada para mostrar.

No puede:
- Consultar datos privados de otros clientes.
- Ejecutar operaciones administrativas.
- Acceder al inventario privado si no está autorizado.

### Cliente solicitante

Puede realizar las operaciones que el sistema habilite para su solicitud, siempre que se verifique su autorización.

No debe poder consultar una solicitud ajena únicamente por conocer o adivinar su identificador.

### Personal autenticado

Puede utilizar las herramientas permitidas para su rol.

El backend debe comprobar los permisos en cada operación; el agente no puede otorgar permisos por iniciativa propia.

## 4. Herramientas previstas

Las herramientas siguientes describen el contrato lógico inicial. Sus esquemas definitivos se implementarán y probarán en el backend.

### 4.1 `consultar_disponibilidad`

**Propósito:** consultar la disponibilidad de un recurso para un período determinado.

**Entradas previstas:**
- Tipo o identificador del recurso.
- Fecha y hora de inicio.
- Fecha y hora de finalización, cuando corresponda.

**Validaciones:**
- Comprobar que el recurso solicitado existe.
- Validar fechas y rangos horarios.
- Revisar las asignaciones relevantes.
- Aplicar las reglas de disponibilidad vigentes.

**Resultado esperado:**
- Disponibilidad encontrada.
- No disponibilidad.
- Error o información insuficiente.

**Restricción:** el resultado representa el estado verificado por el backend en el momento de la consulta. No garantiza que el recurso siga disponible posteriormente.

### 4.2 `verificar_poliza_demo`

**Propósito:** consultar registros de pólizas ficticias.

**Entradas previstas:**
- Identificador de póliza de demostración o los datos mínimos definidos para localizarla.

**Validaciones:**
- Buscar únicamente en los registros ficticios autorizados.
- No consultar aseguradoras externas.
- Evitar mostrar información sensible innecesaria.

**Resultado esperado:**
- Registro ficticio encontrado.
- Registro no encontrado.
- Error de consulta.

**Restricción:** el agente debe aclarar que se trata de una demostración y no de una validación ante una aseguradora real.

### 4.3 `crear_solicitud`

**Propósito:** registrar una nueva solicitud de servicio.

**Entradas previstas:**
- Datos mínimos definidos para el tipo de solicitud.
- Información de contacto necesaria.
- Tipo de servicio solicitado.
- Otros datos estrictamente necesarios para el proceso.

**Validaciones:**
- Comprobar los campos obligatorios.
- Rechazar datos con formato inválido.
- Aplicar las reglas de negocio.
- Evitar solicitudes duplicadas ante reintentos.
- Verificar la autorización necesaria para la operación.

**Resultado esperado:**
- Solicitud creada.
- Identificador de referencia.
- Estado inicial.
- Error o necesidad de completar información.

**Restricción:** la creación de una solicitud no confirma automáticamente el servicio ni reserva recursos.

### 4.4 `consultar_solicitud`

**Propósito:** consultar el estado de una solicitud.

**Entradas previstas:**
- Identificador de referencia.
- Información de autorización exigida por el mecanismo de acceso definido.

**Validaciones:**
- Comprobar que la solicitud existe.
- Verificar que el usuario tiene permiso para consultarla.
- Evitar revelar datos de solicitudes ajenas.

**Resultado esperado:**
- Estado actual verificado.
- Información autorizada sobre la solicitud.
- Solicitud no encontrada.
- Acceso denegado o error.

**Restricción:** conocer el identificador de una solicitud no debe ser suficiente por sí solo para acceder a datos privados.

### 4.5 `contacto_soporte`

**Propósito:** proporcionar los canales configurados de atención humana.

**Entradas previstas:**
- Motivo de la consulta, si es necesario.

**Validaciones:**
- Utilizar únicamente los datos de contacto configurados y verificados.
- No inventar números telefónicos, direcciones ni horarios.

**Resultado esperado:**
- Canal de contacto disponible.
- Aviso de que el canal todavía no está configurado.

## 5. Formato lógico de respuesta de las herramientas

Las respuestas deberán distinguir entre resultados satisfactorios y errores.

Ejemplo conceptual de éxito:

{
  "ok": true,
  "data": {
    "estado": "pendiente_revision"
  },
  "error": null
}

Ejemplo conceptual de error:

{
  "ok": false,
  "data": null,
  "error": {
    "code": "SOLICITUD_NO_ENCONTRADA",
    "message": "No se encontró una solicitud autorizada para esta consulta."
  }
}

Estos ejemplos son ilustrativos. Los esquemas definitivos deben validarse y tiparse en el código.

No se deben devolver credenciales, trazas internas, consultas SQL ni información de otros usuarios.

## 6. Manejo de errores

El agente debe distinguir, al menos, entre:

- Datos de entrada incompletos.
- Formato inválido.
- Operación no autorizada.
- Registro inexistente.
- Recurso no disponible.
- Error de base de datos.
- Servicio de IA no disponible.
- Herramienta que no pudo completar la operación.

Cuando una operación falla:
- No afirmar que tuvo éxito.
- No fabricar un identificador de solicitud.
- No inventar disponibilidad ni estados.
- Explicar el siguiente paso cuando sea posible.
- Ofrecer atención humana cuando corresponda.

## 7. Prevención de operaciones duplicadas

Las herramientas que crean o modifican datos deberán contemplar reintentos.

El backend definirá un mecanismo de idempotencia o una estrategia equivalente para evitar que una misma operación se registre varias veces por reintentos o fallos de comunicación.

La decisión de implementar una operación no debe basarse únicamente en el texto generado por el agente.

## 8. Seguridad y privacidad

- Mantener la clave API de Groq en el backend.
- No registrar secretos en logs.
- Limitar el acceso a datos según el rol.
- Validar todos los argumentos de las herramientas.
- Aplicar controles de autorización fuera del modelo de IA.
- No confiar en instrucciones del usuario que intenten eludir los permisos.
- No utilizar datos reales de clientes ni de personas fallecidas en la versión académica.
- Revisar qué información de las conversaciones se almacena y durante cuánto tiempo.

## 9. Disponibilidad del servicio de IA

Si Groq no está disponible:
- La aplicación debe informar que el asistente no está disponible temporalmente.
- Las funciones convencionales del sistema que no dependan de la IA deben seguir operando cuando sea posible.
- El sistema no debe simular que la IA ejecutó una herramienta.

## 10. Pruebas requeridas

Se deberán comprobar, como mínimo, los siguientes casos:

1. Consulta de disponibilidad con datos válidos.
2. Consulta con fechas inválidas.
3. Recurso ocupado.
4. Consulta de una póliza ficticia existente.
5. Consulta de una póliza ficticia inexistente.
6. Creación correcta de una solicitud.
7. Reintento de creación sin duplicar la operación.
8. Consulta de una solicitud autorizada.
9. Intento de acceder a una solicitud ajena.
10. Intento de ejecutar una herramienta no permitida.
11. Fallo de la base de datos.
12. Fallo del proveedor de IA.
13. Respuesta del agente que intenta afirmar un éxito sin resultado del backend.

## 11. Criterios de aceptación

El agente se considerará listo para la demostración cuando:

- Utilice únicamente herramientas autorizadas.
- El backend valide todas las operaciones.
- Las respuestas se basen en resultados verificables.
- Los permisos impidan accesos no autorizados.
- Los errores se comuniquen sin inventar resultados.
- Las pruebas relevantes se ejecuten y documenten.
- La clave API no esté expuesta al navegador ni al repositorio.

## 12. Pendientes de definición

- Esquemas definitivos de entrada y salida de cada herramienta.
- Autenticación y autorización de clientes.
- Campos mínimos para crear una solicitud.
- Política de idempotencia.
- Datos que podrán conservarse de las conversaciones.
- Límites de uso, tiempos de espera y tratamiento de errores del proveedor.
- Modelo de Groq compatible con las herramientas requeridas.
