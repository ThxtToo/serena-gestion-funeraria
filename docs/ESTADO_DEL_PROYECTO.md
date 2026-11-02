# Serena — Estado del proyecto

**Versión del documento:** 0.2
**Última actualización:** 2026-11-01
**Fase actual:** Consolidación documental y preparación de implementación
**Estado general:** Infraestructura base implementada; documentación en revisión
**Objetivo inmediato:** Cerrar la revisión documental y preparar la siguiente fase de desarrollo.

## 1. Descripción del proyecto

Serena es un sistema inteligente de gestión funeraria concebido como proyecto académico, contextualizado para una funeraria en Venezuela.

La primera versión debe ser funcional, demostrable, documentada y desarrollada con datos ficticios. El uso operativo real queda fuera del alcance inicial.

El sistema busca organizar las solicitudes de servicio, el inventario, la disponibilidad de recursos y la atención inicial al cliente mediante un agente de inteligencia artificial controlado por el backend.

## 2. Fuente oficial y organización del trabajo

El repositorio de GitHub `serena-gestion-funeraria` es la fuente oficial del proyecto.

Antes de iniciar una sesión de trabajo se deben revisar:

1. `README.md`
2. `AGENTS.md`
3. `docs/ESTADO_DEL_PROYECTO.md`
4. El documento de requisitos o diseño relacionado con la tarea.

No se considerará que una funcionalidad está implementada o verificada únicamente porque aparezca en la documentación.

Los cambios deben realizarse de manera incremental, con pruebas pertinentes y actualización de la documentación.

## 3. Documentación del proyecto

Los siguientes documentos cuentan con una primera versión en el repositorio:

- [x] `README.md`: presentación general del proyecto.
- [x] `AGENTS.md`: instrucciones de trabajo para asistentes de IA.
- [x] `docs/REQUISITOS.md`: requisitos funcionales y no funcionales.
- [x] `docs/ARQUITECTURA.md`: arquitectura técnica propuesta.
- [x] `docs/ESTADO_DEL_PROYECTO.md`: seguimiento del avance.
- [x] `docs/DECISIONES_TECNICAS.md`: registro de decisiones técnicas.
- [x] `docs/CONTRATO_DEL_AGENTE.md`: herramientas y restricciones del agente.
- [x] `docs/CASOS_DE_USO.md`: actores, flujos y criterios de aceptación.
- [x] `docs/MODELO_DATOS.md`: entidades, relaciones y restricciones.
- [x] `docs/PLAN_DE_PRUEBAS.md`: estrategia y escenarios de prueba.
- [x] `docs/METODOLOGIA.md`: metodología de trabajo.

Las casillas indican que existe una primera versión de cada documento. No significan que todos los requisitos estén aprobados o validados por el profesor o por personal funerario.

## 4. Estado de implementación

### 4.1. Infraestructura y backend

- [x] Estructura base del proyecto.
- [x] Configuración inicial del entorno de desarrollo.
- [x] Infraestructura base de frontend y backend.
- [x] API inicial.
- [x] Pruebas iniciales de API.
- [x] Autenticación propia.
- [x] Gestión de sesiones.
- [x] Administración de cuentas.

Los elementos marcados como implementados corresponden al estado registrado del proyecto. Su funcionamiento deberá volver a comprobarse cuando se realicen cambios que puedan afectarlos.

### 4.2. Módulos funcionales pendientes

- [ ] Portal público integrado con el backend.
- [ ] Registro y seguimiento completo de solicitudes.
- [ ] Catálogo administrable de servicios funerarios.
- [ ] Administración de canales de atención.
- [ ] Gestión completa de usuarios, roles y permisos.
- [ ] Gestión de recursos y asignaciones.
- [ ] Gestión de inventario y movimientos.
- [ ] Verificación de solicitudes mediante códigos temporales.
- [ ] Consulta demostrativa de pólizas ficticias.
- [ ] Agente de IA integrado con herramientas controladas por el backend.
- [ ] Panel privado con las vistas correspondientes a cada rol.

La documentación de estos módulos no implica que estén implementados.

## 5. Tecnologías del proyecto

- Frontend: React, TypeScript y Vite.
- Backend: Node.js, Express y TypeScript.
- Base de datos: PostgreSQL.
- ORM y migraciones: Drizzle ORM.
- Inteligencia artificial: API de Groq, utilizada exclusivamente desde el backend.
- Pruebas: `node:test` con `tsx`.
- Gestión de paquetes: pnpm workspaces.

La implementación deberá respetar las decisiones técnicas documentadas y sus posibles modificaciones deberán registrarse.

## 6. Restricciones y criterios generales

- Utilizar datos ficticios durante el desarrollo y las demostraciones.
- No incluir claves API ni credenciales en GitHub.
- No exponer la clave de Groq al navegador.
- No permitir que el agente ejecute consultas SQL arbitrarias.
- El agente no tendrá acceso directo a la base de datos.
- El backend validará autenticación, permisos, datos y disponibilidad antes de ejecutar operaciones privadas.
- Los empleados solo podrán realizar operaciones para las que tengan autorización.
- Una solicitud registrada no se considerará automáticamente confirmada.
- Las operaciones de inventario y asignación deberán proteger la integridad de los datos ante concurrencia.
- No declarar una funcionalidad terminada sin pruebas o verificación apropiada.
- No considerar el sistema preparado para operaciones funerarias reales.

## 7. Validaciones pendientes

- [ ] Contrastar los requisitos con las instrucciones exactas del profesor.
- [ ] Validar los casos de uso y las reglas de negocio.
- [ ] Confirmar las reglas operativas con personal funerario, si se dispone de acceso.
- [ ] Validar el modelo conceptual antes de definir el esquema físico.
- [ ] Confirmar los tipos, estados y reglas de los recursos.
- [ ] Validar categorías y unidades del inventario.
- [ ] Revisar las políticas de privacidad y conservación de datos.
- [ ] Confirmar los criterios de aceptación de la entrega académica.
- [ ] Verificar la configuración completa del entorno de desarrollo y ejecución.

La documentación actual constituye una base de diseño académico y conserva decisiones pendientes de validación.

## 8. Próximos hitos

1. Finalizar la revisión y consolidación de la documentación.
2. Revisar la arquitectura y el modelo de datos frente a los requisitos y casos de uso.
3. Cerrar y ampliar las pruebas automatizadas de la API.
4. Definir y preparar el esquema físico de PostgreSQL y sus migraciones.
5. Completar la autorización de operaciones según los roles y permisos.
6. Implementar progresivamente los módulos de solicitudes, recursos e inventario.
7. Integrar el portal público y el panel privado.
8. Incorporar el agente de IA y sus herramientas controladas por el backend.
9. Ejecutar pruebas de integración, seguridad y aceptación.
10. Preparar los manuales, evidencias y entregables académicos.

Cada hito deberá considerarse completado únicamente cuando sus criterios de aceptación se hayan verificado.

## 9. Metodología de trabajo

Cada tarea deberá incluir:

1. Objetivo y criterios de aceptación.
2. Cambios limitados y comprensibles.
3. Pruebas pertinentes.
4. Actualización de documentación.
5. Verificación del estado del repositorio.
6. Commit descriptivo cuando el responsable lo autorice.
7. Registro de pendientes y siguiente paso.

No se realizarán commits ni publicaciones remotas sin autorización expresa.

## 10. Registro de cambios

- 2026-10-26: registro inicial del estado de documentación e implementación.
- 2026-11-01: consolidación del estado del proyecto, actualización de los documentos preparados y reorganización de los hitos pendientes.
