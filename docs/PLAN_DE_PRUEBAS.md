
# Plan de pruebas — Serena

**Versión:** 0.1  
**Estado:** Planificación  
**Tipo de proyecto:** Proyecto académico con datos ficticios

## 1. Objetivo

Definir las pruebas que permitirán verificar que Serena cumple los requisitos funcionales, de seguridad, persistencia y calidad establecidos en la documentación del proyecto.

Las pruebas se ejecutarán progresivamente. No se considerará terminado un módulo únicamente porque la interfaz se vea correcta.

## 2. Alcance

Se probarán los siguientes componentes:

- Interfaz pública y panel privado.
- Autenticación y control de roles.
- Gestión de solicitudes de servicios funerarios.
- Inventario, disponibilidad y asignación de recursos.
- Consultas de pólizas de demostración.
- Agente de IA y herramientas autorizadas.
- Persistencia en PostgreSQL.
- Validación de datos, manejo de errores y auditoría.

Todas las pruebas académicas utilizarán datos ficticios.

## 3. Tipos de pruebas

### 3.1. Pruebas unitarias

Verificarán funciones individuales, como validaciones, cálculos de disponibilidad, transiciones de estado y reglas de negocio.

### 3.2. Pruebas de API

Comprobarán que el backend recibe solicitudes válidas, rechaza datos incorrectos y devuelve respuestas consistentes.

### 3.3. Pruebas de integración

Verificarán la interacción entre el backend, PostgreSQL, la autenticación y las herramientas del agente.

### 3.4. Pruebas de interfaz

Comprobarán la navegación, los formularios, los mensajes de error y la visualización de los datos en español.

### 3.5. Pruebas de seguridad

Verificarán la protección de rutas privadas, los permisos por rol, la validación de entradas y el manejo seguro de secretos.

### 3.6. Pruebas de persistencia

Comprobarán que los registros guardados permanecen disponibles después de recargar la página y reiniciar el servidor, cuando corresponda.

### 3.7. Pruebas del agente de IA

Verificarán que el agente utiliza exclusivamente las herramientas autorizadas, respeta sus permisos y no afirma haber realizado operaciones que el backend no haya confirmado.

## 4. Casos de prueba iniciales

| ID | Caso | Resultado esperado |
|---|---|---|
| PT-01 | Consultar información pública | Se muestra información disponible sin exigir una cuenta innecesaria. |
| PT-02 | Acceder al panel sin autenticación | El backend rechaza el acceso a las rutas privadas. |
| PT-03 | Iniciar sesión con credenciales válidas | Se inicia una sesión válida y se aplican los permisos correspondientes. |
| PT-04 | Iniciar sesión con credenciales incorrectas | Se rechaza el acceso sin revelar información sensible. |
| PT-05 | Crear una solicitud válida | Se guarda la solicitud y se genera una referencia única. |
| PT-06 | Enviar una solicitud con campos obligatorios vacíos | Se rechaza o se solicitan los datos faltantes, sin crear un registro inválido. |
| PT-07 | Consultar una solicitud existente | Se devuelve únicamente la información permitida para ese usuario o contexto. |
| PT-08 | Consultar una referencia inexistente | Se informa que no se encontró la solicitud, sin exponer datos de otras personas. |
| PT-09 | Consultar disponibilidad de un recurso | La respuesta refleja los registros actuales y las reglas de asignación. |
| PT-10 | Intentar asignar un recurso no disponible | El backend rechaza la asignación conflictiva. |
| PT-11 | Registrar un movimiento de inventario válido | Se actualiza la existencia correspondiente y queda un registro del movimiento. |
| PT-12 | Registrar una salida superior a la existencia disponible | La operación se rechaza y no deja cantidades inconsistentes. |
| PT-13 | Consultar una póliza ficticia existente | Se devuelve únicamente la información de demostración autorizada. |
| PT-14 | Consultar una póliza ficticia inexistente | Se informa que no hay coincidencia, sin inventar cobertura. |
| PT-15 | Solicitar al agente una operación permitida | El agente invoca la herramienta adecuada y comunica el resultado confirmado por el backend. |
| PT-16 | Pedir al agente una operación no autorizada | La operación no se ejecuta y se explica la limitación. |
| PT-17 | Simular un fallo de la API de IA | Se informa del fallo de manera controlada y se evita afirmar que la operación se completó. |
| PT-18 | Recargar la aplicación después de guardar datos | Los datos persisten y se recuperan desde PostgreSQL. |
| PT-19 | Reiniciar el servidor después de guardar datos | Los registros continúan disponibles tras recuperar la conexión. |
| PT-20 | Intentar acceder a una función con un rol sin permiso | El backend deniega la operación, aunque se intente llamar directamente a la API. |
| PT-21 | Enviar entradas malformadas | El backend valida los datos y responde con un error controlado. |
| PT-22 | Verificar los secretos del proyecto | No hay claves privadas en el repositorio ni en el código del frontend. |

## 5. Registro de resultados

Cada prueba ejecutada debe documentarse con estos datos:

- Identificador de la prueba.
- Fecha de ejecución.
- Versión o commit evaluado.
- Datos de prueba utilizados, sin información personal real.
- Resultado esperado.
- Resultado obtenido.
- Estado: pendiente, aprobada o fallida.
- Evidencia o descripción del error.
- Corrección aplicada, si corresponde.

Una prueba no se marcará como aprobada sin haberse ejecutado.

## 6. Criterios de aceptación

Un módulo podrá considerarse terminado cuando:

1. Sus casos de prueba relevantes se hayan ejecutado.
2. No existan fallos críticos conocidos.
3. Las validaciones se realicen en el backend, no únicamente en la interfaz.
4. Los cambios de datos se persistan correctamente cuando corresponda.
5. Los permisos se comprueben del lado del servidor.
6. Los errores se comuniquen sin revelar secretos ni información innecesaria.
7. La documentación se encuentre actualizada.
8. Los cambios estén guardados en GitHub mediante un commit identificable.

## 7. Herramientas propuestas

- Vitest para pruebas unitarias.
- Herramientas de pruebas HTTP para los endpoints de la API.
- PostgreSQL para verificar persistencia e integridad.
- Navegador para pruebas manuales de interfaz.
- Git y GitHub para identificar las versiones evaluadas.

La selección definitiva de herramientas se confirmará durante la configuración del proyecto.

## 8. Limitaciones

Este plan corresponde a una aplicación académica con datos ficticios. Superar estas pruebas no demuestra por sí solo que el sistema esté listo para operar con clientes reales ni que cumpla todas las obligaciones legales, de privacidad o seguridad aplicables.

Antes de una posible implementación real se requerirán revisiones adicionales, pruebas de seguridad y validación con la funeraria.
