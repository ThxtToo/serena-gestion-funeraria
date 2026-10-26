
# Serena — Estado del proyecto

**Versión del documento:** 0.1  
**Última actualización:** 2026-10-26  
**Fase actual:** Planificación y documentación  
**Estado general:** En preparación  
**Objetivo inmediato:** Completar y revisar la documentación antes de programar.

## 1. Descripción breve

Serena es un sistema inteligente de gestión funeraria concebido como proyecto académico, contextualizado para una funeraria en Venezuela.

La primera versión debe ser funcional, demostrable, documentada y desarrollada con datos ficticios. El uso operativo real queda fuera del alcance inicial.

## 2. Fuente oficial

El repositorio de GitHub `serena-gestion-funeraria` es la fuente oficial del proyecto.

Antes de iniciar una sesión de trabajo, revisar:

1. `README.md`
2. `AGENTS.md`
3. `docs/ESTADO_DEL_PROYECTO.md`
4. El documento de requisitos o diseño relacionado con la tarea.

No asumir que el código existe o funciona si todavía no se ha implementado y verificado.

## 3. Documentación prevista

- [x] `README.md` — creado en GitHub.
- [x] `AGENTS.md` — creado en GitHub.
- [x] `docs/REQUISITOS.md` — creado en GitHub.
- [x] `docs/ARQUITECTURA.md` — creado en GitHub.
- [ ] `docs/DECISIONES_TECNICAS.md` — pendiente.
- [ ] `docs/CONTRATO_DEL_AGENTE.md` — pendiente.
- [ ] Documento de casos de uso detallados.
- [ ] Modelo entidad-relación.
- [ ] Plan de pruebas.
- [ ] Manual técnico.
- [ ] Manual de usuario.
- [ ] Informe y presentación académica.

Las casillas marcadas reflejan los commits confirmados por el responsable del proyecto. No representan una auditoría independiente del contenido.

## 4. Alcance previsto de la primera versión

1. Portal público de información.
2. Panel privado para personal autorizado.
3. Registro y consulta de solicitudes.
4. Gestión de inventario y movimientos.
5. Gestión y asignación de recursos.
6. Consulta demostrativa de pólizas ficticias.
7. Agente de IA con herramientas controladas por el backend.
8. Atención humana mediante un contacto configurable.
9. Pruebas y documentación.

## 5. Tecnologías propuestas

- React, TypeScript y Vite para el frontend.
- Node.js, Express y TypeScript para el backend.
- PostgreSQL para persistencia.
- Drizzle ORM para el acceso a datos y las migraciones.
- Groq para el agente de IA.
- Vitest y pruebas de API para verificación.

Estas tecnologías son propuestas iniciales y deberán confirmarse antes de iniciar la implementación.

## 6. Restricciones importantes

- Utilizar datos ficticios en desarrollo y demostraciones.
- No incluir claves API ni credenciales en GitHub.
- No exponer la clave de Groq al navegador.
- No permitir que la IA ejecute consultas SQL arbitrarias.
- Validar en el backend las operaciones sensibles.
- No tratar una solicitud como una reserva confirmada automáticamente.
- No declarar una función terminada sin pruebas o verificación apropiada.
- No afirmar que el sistema está listo para operaciones reales.

## 7. Metodología de trabajo

Se propone utilizar una fase inicial de análisis y diseño, seguida de iteraciones pequeñas de implementación.

Cada tarea debe incluir:

1. Objetivo y criterios de aceptación.
2. Cambios limitados y comprensibles.
3. Pruebas pertinentes.
4. Actualización de documentación.
5. Commit descriptivo.
6. Registro de pendientes y siguiente paso.

## 8. Situación actual

La documentación base está en construcción. Todavía no se ha confirmado la existencia de una aplicación funcional ni de una base de datos configurada.

No comenzar la implementación completa hasta revisar los requisitos, las decisiones técnicas, los casos de uso, el modelo de datos y el contrato del agente.

## 9. Próximos pasos

1. Crear `docs/DECISIONES_TECNICAS.md`.
2. Crear `docs/CONTRATO_DEL_AGENTE.md`.
3. Detallar los casos de uso.
4. Diseñar el modelo entidad-relación.
5. Preparar el plan de pruebas.
6. Revisar las instrucciones y entregables de la asignatura.
7. Aprobar el diseño inicial y preparar el entorno de desarrollo.

## 10. Registro de cambios

- 2026-10-26: estado inicial de documentación registrado.
- Las futuras actualizaciones deben describir cambios verificables y tareas completadas.
