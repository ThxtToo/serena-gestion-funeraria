
# Metodología de desarrollo — Serena

**Versión:** 0.1  
**Estado:** Propuesta pendiente de validación con las indicaciones del profesor.

## 1. Introducción

El desarrollo de Serena combinará una fase inicial de planificación y análisis con ciclos iterativos de implementación y pruebas.

Se propone utilizar elementos de la metodología Cascada para estructurar el levantamiento de información, los requisitos y el diseño, y elementos de Scrum para organizar la construcción progresiva del software.

Esta combinación busca mantener la documentación académica ordenada y, al mismo tiempo, permitir verificar cada módulo antes de continuar con el siguiente.

## 2. Metodología Cascada: planificación y análisis

Durante la fase inicial se realizarán las siguientes actividades:

### 2.1. Recopilación de datos

Se identificarán los datos que el sistema necesita gestionar, entre ellos:

- Solicitudes de servicios funerarios.
- Recursos e inventario.
- Usuarios, roles y permisos.
- Asignaciones y disponibilidad.
- Registros de auditoría.
- Datos ficticios para las demostraciones.

El modelo de datos se ajustará después de validar los procesos reales de la organización.

### 2.2. Observación

Se estudiarán, cuando sea posible, los procedimientos generales de una funeraria relacionados con la recepción de solicitudes, la administración de recursos y la coordinación de servicios.

La observación deberá documentar los procesos, las excepciones y las necesidades operativas pertinentes para el sistema.

### 2.3. Entrevista

Se propone realizar entrevistas con personal autorizado de la funeraria para validar:

- Los procesos actuales.
- Los problemas que se desean resolver.
- Los requisitos funcionales y no funcionales.
- Los roles y responsabilidades.
- Las reglas de disponibilidad y asignación.
- Las necesidades de información y reportes.

Si las entrevistas todavía no se han realizado, sus resultados no se presentarán como hechos confirmados. Se documentarán como actividades pendientes.

### 2.4. Análisis y diseño

Con la información recopilada se elaborarán y revisarán:

- Requisitos del sistema.
- Historias de usuario y casos de uso.
- Diagramas UML.
- Modelo entidad-relación.
- Arquitectura técnica.
- Diseño de interfaces.
- Plan de pruebas.

Los documentos se actualizarán cuando se aprueben cambios en los requisitos.

## 3. Metodología ágil: desarrollo iterativo

La implementación se organizará en incrementos pequeños y verificables. Cada incremento tendrá un objetivo, tareas definidas y criterios de aceptación.

### 3.1. Planificación

Se priorizarán los requisitos según su importancia, dependencias y viabilidad dentro del tiempo disponible.

### 3.2. Requerimientos

Antes de desarrollar un módulo se revisarán sus requisitos, reglas de negocio, permisos y criterios de aceptación.

### 3.3. Programas y herramientas

Se propone utilizar:

- React, TypeScript y Vite para el frontend.
- Node.js, Express y TypeScript para el backend.
- PostgreSQL para la persistencia de datos.
- Drizzle ORM y migraciones para gestionar el esquema de la base de datos.
- Groq para las funciones de inteligencia artificial mediante el backend.
- Vitest para pruebas automatizadas.
- Git y GitHub para control de versiones y documentación.
- Replit como entorno de desarrollo, sujeto a la configuración final.

Estas tecnologías constituyen una propuesta técnica y podrán ajustarse mediante decisiones documentadas.

### 3.4. Configuraciones

Se documentarán las configuraciones necesarias para ejecutar y verificar la aplicación, incluyendo:

- Variables de entorno.
- Configuración de base de datos.
- Migraciones.
- Autenticación y autorización.
- Integración con servicios externos.
- Ejecución de pruebas.
- Procedimiento de inicio y recuperación del sistema.

Las claves y credenciales se almacenarán fuera del código fuente y del repositorio.

### 3.5. Red y seguridad

Se definirán los controles de acceso, la comunicación entre frontend y backend, la validación de solicitudes, la protección de secretos y el registro de eventos relevantes.

Las rutas privadas deberán validar permisos en el servidor. Ocultar una opción en la interfaz no se considerará suficiente para proteger una operación.

### 3.6. Bioseguridad

La bioseguridad se tratará como un aspecto del contexto operativo de la funeraria cuando resulte aplicable a los procesos observados o entrevistados.

No se asumirá que la aplicación sustituye protocolos sanitarios, formación del personal ni procedimientos físicos de bioseguridad. Los requisitos concretos deberán validarse con la organización y con las indicaciones académicas correspondientes.

## 4. Incrementos propuestos

El orden podrá ajustarse según las dependencias técnicas.

1. Preparación del repositorio, estructura del proyecto y configuración del entorno.
2. Configuración del backend y conexión con PostgreSQL.
3. Autenticación, roles y permisos.
4. Modelo de datos y gestión inicial de recursos.
5. Solicitudes de servicios y consulta de estado.
6. Inventario, movimientos y asignaciones.
7. Portal público y asistencia mediante inteligencia artificial.
8. Consultas de pólizas ficticias y contacto con personal.
9. Pruebas integrales, correcciones y documentación final.

Cada incremento deberá contar con pruebas y evidencias antes de considerarse completado.

## 5. Control de versiones y colaboración

GitHub será la fuente principal del código y la documentación.

Los cambios se guardarán mediante commits descriptivos. Si participan varios integrantes, se definirán responsabilidades, se revisarán los cambios y se evitará modificar simultáneamente los mismos componentes sin coordinación.

Las decisiones técnicas relevantes se registrarán en `docs/DECISIONES_TECNICAS.md`.

## 6. Criterios para dar por terminado un incremento

Un incremento estará terminado cuando:

- Cumpla sus criterios de aceptación.
- Supere las pruebas pertinentes.
- No presente errores críticos conocidos.
- Respete las reglas de seguridad aplicables.
- Tenga su documentación actualizada.
- Se encuentre guardado en GitHub.

## 7. Limitaciones y validación académica

La metodología descrita es una propuesta de trabajo. Antes de presentarla como definitiva, deberá compararse con las instrucciones exactas del profesor, especialmente con los nombres de las etapas y las actividades obligatorias.

La documentación distinguirá entre actividades propuestas, actividades realizadas y resultados comprobados. No se afirmará que hubo observaciones, entrevistas, pruebas o validaciones que no se hayan llevado a cabo.
