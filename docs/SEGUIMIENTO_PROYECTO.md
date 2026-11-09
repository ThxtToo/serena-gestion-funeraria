# Seguimiento del proyecto Serena

**Proyecto:** Serena — Sistema inteligente de gestión funeraria  
**Estado general:** Desarrollo funcional e integración  
**Última actualización:** 1 de noviembre de 2026  
**Último hito publicado:** `cae1fa9`  
**Rama:** `main`

---

## 1. Objetivo del proyecto

Serena es un sistema académico y demostrativo para la gestión de servicios funerarios. Busca centralizar la atención de solicitudes, la administración de servicios, la operación interna y la consulta de información mediante una arquitectura web con capacidades de asistencia inteligente.

El proyecto utiliza datos ficticios y un contexto de demostración venezolano.

## 2. Arquitectura tecnológica

| Componente | Tecnología |
|---|---|
| Frontend | React, TypeScript y Vite |
| Backend | Node.js, Express y TypeScript |
| Base de datos | PostgreSQL |
| ORM | Drizzle ORM |
| Monorepo | pnpm workspaces |
| Contrato API | OpenAPI |
| Validación | Zod |
| Pruebas backend | `node:test` y `tsx` |
| IA prevista | Groq, integrada desde el backend |

El frontend principal está ubicado en `artifacts/serena-frontend`. El directorio `mockup-sandbox` no es la aplicación canónica.

## 3. Funcionalidades implementadas

### 3.1 Autenticación y control de acceso

**Estado:** Implementado y probado.

- Inicio de sesión de empleados.
- Inicio de sesión administrativo.
- Gestión de sesión.
- Cambio obligatorio de contraseña para empleados cuando corresponde.
- Protección de rutas privadas.
- Separación de permisos administrativos y de empleados.
- Middleware de autenticación y autorización.

### 3.2 Gestión de usuarios

**Estado:** Implementado en la estructura administrativa existente.

- Administración de usuarios.
- Control de roles.
- Restricción de operaciones administrativas a usuarios autorizados.

### 3.3 Catálogo de servicios funerarios

**Estado:** Implementado y probado manualmente.

- Consulta pública de servicios activos.
- Consulta administrativa de servicios activos e inactivos.
- Creación de servicios.
- Edición de nombre y descripción.
- Activación y desactivación.
- Prevención de nombres duplicados.
- Conservación de registros históricos.
- No se elimina físicamente un servicio que pueda estar relacionado con solicitudes anteriores.

Rutas principales:

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/service-offerings` | Público |
| GET | `/admin/service-offerings` | Administrador |
| POST | `/admin/service-offerings` | Administrador |
| PATCH | `/admin/service-offerings/:serviceOfferingId` | Administrador |

### 3.4 Solicitud pública de servicios

**Estado:** Implementado y probado manualmente.

- Formulario público en `/solicitar-servicio`.
- No requiere iniciar sesión.
- Consulta el catálogo de servicios activos.
- Captura datos de contacto y detalles de la solicitud.
- Valida que el servicio seleccionado siga activo.
- Genera una referencia para la solicitud.
- Registra la solicitud con estado inicial pendiente.
- Conserva el nombre del servicio como referencia histórica.

**Criterio funcional importante:** enviar una solicitud no significa que el servicio funerario haya sido confirmado. La solicitud debe ser revisada por el personal autorizado.

### 3.5 Consulta de solicitudes por referencia

**Estado:** Existe funcionalidad de consulta y validación en el backend. Su integración y presentación completa en la interfaz deberán revisarse dentro de la siguiente etapa de seguimiento de solicitudes.

## 4. Validaciones realizadas

En el último ciclo de integración se verificó:

- Pruebas del backend: 16 aprobadas, 0 fallidas.
- Typecheck del frontend: correcto.
- Compilación de producción del frontend: correcta.
- `git diff --check`: sin errores.
- Prueba manual del formulario público.
- Prueba manual de creación y edición de servicios.
- Prueba manual de desactivación de servicios.
- Verificación de que los servicios desactivados dejan de aparecer en el formulario público.
- Verificación de que los servicios desactivados permanecen visibles en la administración.

Estos resultados corresponden al ciclo de trabajo que culminó en el commit `cae1fa9`.

## 5. Próximas etapas

### Etapa 1 — Administración y seguimiento de solicitudes

**Estado:** Pendiente.  
**Prioridad:** Alta.

Objetivos:

- Listar solicitudes recibidas.
- Buscar por referencia, nombre o teléfono.
- Filtrar por estado y fecha.
- Consultar el detalle de cada solicitud.
- Permitir que personal autorizado revise y actualice el estado.
- Registrar quién realizó cada cambio y cuándo.
- Diferenciar claramente una solicitud recibida de un servicio confirmado.

**Criterio de cierre:** el personal administrativo puede consultar y dar seguimiento a una solicitud desde su recepción hasta su resolución, con trazabilidad de los cambios.

### Etapa 2 — Gestión operativa de servicios funerarios

**Estado:** Pendiente.

Objetivos:

- Convertir una solicitud aceptada en un servicio operativo.
- Registrar información del servicio confirmado.
- Gestionar fechas, horarios y ubicación.
- Asignar personal responsable.
- Dar seguimiento a las etapas del servicio.
- Mantener relación entre la solicitud original y el servicio operativo.

**Criterio de cierre:** una solicitud aceptada puede convertirse en un servicio gestionable y consultable por el personal autorizado.

### Etapa 3 — Inventario y recursos

**Estado:** Pendiente.

Objetivos:

- Definir los recursos que controla Serena.
- Registrar existencias.
- Gestionar entradas y salidas.
- Asociar consumos o asignaciones a servicios cuando corresponda.
- Mantener trazabilidad de movimientos.

**Criterio de cierre:** el sistema puede consultar existencias y registrar movimientos de recursos con historial.

### Etapa 4 — Información de políticas y procedimientos

**Estado:** Pendiente.

Objetivos:

- Organizar información de políticas y procedimientos.
- Definir fuentes y responsables de actualización.
- Permitir consultas desde la aplicación.
- Mostrar la fuente o fecha de actualización de la información.
- Evitar presentar información desactualizada como vigente.

**Criterio de cierre:** el usuario puede consultar información organizada y el sistema identifica su procedencia.

### Etapa 5 — Agente de inteligencia artificial con Groq

**Estado:** Planificado.

Objetivos:

- Integrar Groq exclusivamente desde el backend.
- Definir las funciones que el agente puede ejecutar.
- Respetar los permisos del usuario autenticado.
- Limitar las operaciones disponibles mediante herramientas controladas.
- Evitar acceso irrestricto a la base de datos.
- Proteger las credenciales y no exponerlas en el frontend.
- Registrar las operaciones relevantes del agente.

**Criterio de cierre:** el agente puede asistir en consultas y tareas autorizadas sin saltarse las reglas de seguridad del sistema.

### Etapa 6 — Reportes, seguridad y preparación de demostración

**Estado:** Pendiente.

Objetivos:

- Crear reportes administrativos y operativos.
- Ampliar las pruebas automatizadas.
- Revisar permisos y validaciones.
- Verificar manejo de errores.
- Revisar protección de datos y registros.
- Documentar instalación, configuración y uso.
- Preparar escenarios de demostración con datos ficticios.

**Criterio de cierre:** Serena puede ejecutarse y demostrarse con un flujo coherente, documentación suficiente y validaciones reproducibles.

## 6. Orden de trabajo acordado

Las etapas se abordarán en este orden:

1. Seguimiento administrativo de solicitudes.
2. Gestión operativa de servicios funerarios.
3. Inventario y recursos.
4. Políticas y procedimientos.
5. Agente inteligente con Groq.
6. Reportes, seguridad y preparación de demostración.

El orden podrá ajustarse si una dependencia técnica lo exige. Cualquier cambio importante deberá quedar documentado.

## 7. Método de trabajo por etapa

Cada etapa seguirá este proceso:

1. Revisar el estado actual del código y la base de datos.
2. Definir el alcance y los criterios de aceptación.
3. Diseñar los cambios de datos, API e interfaz.
4. Implementar en incrementos pequeños.
5. Ejecutar pruebas automatizadas.
6. Realizar pruebas manuales de los flujos principales.
7. Actualizar la documentación.
8. Revisar los cambios de Git.
9. Crear un commit cuando el usuario lo autorice.
10. Publicar los cambios cuando el usuario lo autorice.

No se considerará terminada una etapa únicamente porque la interfaz esté construida: también deberá verificarse el comportamiento del backend, los permisos y la persistencia de datos.

## 8. Bitácora de hitos

| Hito | Resultado | Referencia |
|---|---|---|
| Autenticación y control de acceso | Implementados y probados | Historial Git |
| Catálogo de servicios | Implementado y probado | `cae1fa9` |
| Solicitud pública de servicios | Implementada y probada | `cae1fa9` |
| Validación y compilación | Correctas en el último ciclo | `cae1fa9` |
| Seguimiento administrativo de solicitudes | Próximo trabajo | Pendiente |

## 9. Reglas para mantener este documento

- Actualizar este archivo al cerrar cada etapa.
- Distinguir siempre entre implementado, probado y pendiente.
- Registrar el commit que contiene cada hito.
- No marcar una funcionalidad como terminada si solo está diseñada.
- Registrar las decisiones que cambien el alcance o el orden de trabajo.
- Mantener los datos de demostración ficticios.
- No incluir contraseñas, tokens, claves API ni contenido de archivos `.env`.

---

**Estado de referencia:** Serena cuenta con autenticación, control de acceso, catálogo administrativo de servicios y recepción pública de solicitudes. El siguiente objetivo funcional es construir el seguimiento administrativo de esas solicitudes.
