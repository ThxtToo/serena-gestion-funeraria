
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


## 8. Estado de la documentación académica

### 8.1. Documentos preparados

Los siguientes documentos tienen una primera versión documentada en el repositorio:

- [x] `README.md`: presentación general del proyecto.
- [x] `AGENTS.md`: instrucciones de trabajo para asistentes de IA.
- [x] `docs/REQUISITOS.md`: requisitos funcionales y no funcionales.
- [x] `docs/ARQUITECTURA.md`: arquitectura técnica propuesta.
- [x] `docs/DECISIONES_TECNICAS.md`: registro de decisiones técnicas.
- [x] `docs/CONTRATO_DEL_AGENTE.md`: contrato de herramientas del agente de IA.
- [x] `docs/CASOS_DE_USO.md`: casos de uso principales.
- [x] `docs/MODELO_DATOS.md`: modelo conceptual de datos.
- [x] `docs/PLAN_DE_PRUEBAS.md`: plan inicial de pruebas.
- [x] `docs/METODOLOGIA.md`: metodología de trabajo propuesta.

**Nota:** las casillas indican que los documentos fueron preparados y guardados en el repositorio según el registro de trabajo. No significan que todos los requisitos hayan sido validados por la funeraria o el profesor.

### 8.2. Validaciones pendientes

- [ ] Contrastar la metodología con las instrucciones exactas del profesor.
- [ ] Confirmar los requisitos con la organización, si se dispone de acceso a ella.
- [ ] Revisar los casos de uso y sus reglas de negocio.
- [ ] Validar el modelo de datos antes de crear las tablas definitivas.
- [ ] Elegir y documentar el mecanismo de autenticación.
- [ ] Confirmar la configuración de desarrollo y ejecución.
- [ ] Definir los criterios de aceptación de la entrega académica.

### 8.3. Estado de implementación

**Estado actual:** planificación y documentación inicial.

La aplicación no debe considerarse implementada únicamente porque se hayan preparado sus documentos. Cada módulo se marcará como completado después de desarrollarlo, ejecutarlo y verificar sus pruebas.

### 8.4. Próximo hito

Revisar los documentos existentes y contrastarlos con las instrucciones de la asignatura. Después, preparar la estructura inicial del repositorio de código y configurar el entorno de desarrollo, sin integrar todavía todas las funcionalidades de Serena.
