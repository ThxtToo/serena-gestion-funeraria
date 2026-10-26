
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
- Registro y consulta de solicitudes.
- Consulta demostrativa de pólizas con datos ficticios.
- Agente de IA conectado a funciones controladas por el backend.
- Pruebas y documentación técnica y de usuario.

## Tecnologías previstas

- Frontend: React, TypeScript y Vite.
- Backend: Node.js, Express y TypeScript.
- Base de datos: PostgreSQL.
- ORM y migraciones: Drizzle ORM.
- Inteligencia artificial: API de Groq, utilizada exclusivamente desde el backend.
- Pruebas: Vitest y pruebas de API.

Estas tecnologías son decisiones iniciales sujetas a validación antes de implementar el sistema.

## Seguridad

- No almacenar claves API en el repositorio.
- No utilizar información real de clientes o personas fallecidas en las pruebas.
- Proteger las funciones administrativas mediante autenticación y autorización del lado del servidor.
- Validar las operaciones antes de modificar datos.
- Mantener un archivo `.env.example` sin secretos reales.

## Documentación

La carpeta `docs/` contendrá los requisitos, la arquitectura, el estado del proyecto, las decisiones técnicas y el contrato del agente de IA.

## Estado actual

Fase de planificación y documentación. La implementación comenzará cuando se hayan revisado los requisitos y el diseño inicial.
