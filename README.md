# Serena — Sistema Inteligente de Gestión Funeraria

## Descripción

Serena es un proyecto académico para diseñar e implementar un sistema inteligente de gestión funeraria, contextualizado para una funeraria en Venezuela.

El sistema busca organizar las solicitudes de servicio, el inventario, la disponibilidad de recursos y la atención inicial al cliente mediante un agente de inteligencia artificial.

## Objetivo

Desarrollar una versión funcional, segura y demostrable para la evaluación universitaria, utilizando datos ficticios durante el desarrollo y las pruebas.

## Alcance inicial

- Portal de información y solicitudes para clientes.
- Panel privado para el personal autorizado.
- Gestión de inventario y recursos.
- Registro, seguimiento y consulta de solicitudes.
- Consulta demostrativa de pólizas con datos ficticios.
- Agente de IA conectado a funciones controladas por el backend.
- Pruebas automatizadas y documentación técnica y de usuario.

## Tecnologías

- Frontend: React, TypeScript y Vite.
- Backend: Node.js, Express y TypeScript.
- Base de datos: PostgreSQL.
- ORM y migraciones: Drizzle ORM.
- Inteligencia artificial: API de Groq, utilizada exclusivamente desde el backend.
- Pruebas: `node:test` con `tsx`.
- Gestión del proyecto: pnpm workspaces.

La implementación se desarrollará progresivamente. La inclusión de una tecnología en esta lista no implica que todos los módulos correspondientes estén terminados.

## Seguridad

- No almacenar claves API ni credenciales en el repositorio.
- No utilizar información real de clientes o personas fallecidas en las pruebas.
- Proteger las funciones administrativas mediante autenticación y autorización del lado del servidor.
- Validar las operaciones antes de modificar datos.
- Mantener un archivo `.env.example` sin secretos reales.
- Evitar que el agente de IA acceda directamente a la base de datos.
- Registrar las operaciones relevantes sin exponer información sensible.

## Documentación

La carpeta `docs/` contiene la documentación del proyecto:

- `REQUISITOS.md`: requisitos funcionales y no funcionales.
- `ARQUITECTURA.md`: estructura y arquitectura del sistema.
- `ESTADO_DEL_PROYECTO.md`: avance y tareas pendientes.
- `DECISIONES_TECNICAS.md`: decisiones y criterios técnicos.
- `CONTRATO_DEL_AGENTE.md`: herramientas y restricciones del agente.
- `CASOS_DE_USO.md`: actores, flujos y criterios de aceptación.
- `MODELO_DATOS.md`: entidades, relaciones y restricciones.
- `PLAN_DE_PRUEBAS.md`: estrategia y escenarios de prueba.
- `METODOLOGIA.md`: organización y metodología de trabajo.

La documentación constituye una base de diseño académico y podrá ajustarse conforme se validen los requisitos y las reglas operativas.

## Estado actual

La infraestructura base y una API inicial están implementadas. También se han elaborado pruebas iniciales y documentación de requisitos, arquitectura, casos de uso, decisiones técnicas y modelo de datos.

Actualmente se está revisando y consolidando la documentación antes de continuar con la implementación de los módulos funcionales.

Las funcionalidades descritas en el alcance no deben considerarse terminadas por el hecho de estar documentadas.

## Desarrollo

El proyecto se implementa por fases. Cada módulo deberá contar con validaciones y pruebas antes de considerarse completado.

Las instrucciones específicas para trabajar en el repositorio se encuentran en `AGENTS.md`.
