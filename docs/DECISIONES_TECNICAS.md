
# Serena — Registro de decisiones técnicas

**Versión:** 0.1  
**Estado:** Inicial  
**Propósito:** Registrar las decisiones de diseño, sus motivos y los asuntos pendientes.

## Cómo utilizar este documento

Cada decisión debe indicar su estado:

- **Aceptada:** acordada para el proyecto.
- **Propuesta:** recomendada, pero pendiente de confirmación.
- **Pendiente:** requiere información o una decisión.
- **Reemplazada:** dejó de aplicarse y tiene una decisión posterior que la sustituye.

Las IA y los colaboradores no deben modificar una decisión aceptada sin explicar el motivo, las consecuencias y las alternativas consideradas.

## DT-001 — GitHub como fuente oficial

**Estado:** Aceptada.

**Decisión:** Utilizar el repositorio de GitHub `serena-gestion-funeraria` como fuente oficial del código y la documentación.

**Motivo:** Permitir el seguimiento de cambios, la colaboración y la continuidad del trabajo entre distintas herramientas de IA.

**Consecuencia:** Los cambios importantes deben quedar registrados mediante commits. No debe dependerse exclusivamente del historial de conversación de una IA.

## DT-002 — Desarrollo por fases

**Estado:** Aceptada.

**Decisión:** Completar progresivamente la planificación, el diseño, la implementación, las pruebas y la documentación.

**Motivo:** Reducir errores y evitar la generación de grandes cantidades de código sin revisión.

**Consecuencia:** Cada fase debe tener entregables verificables antes de avanzar.

## DT-003 — Enfoque académico

**Estado:** Aceptada.

**Decisión:** Priorizar una versión funcional, estable y demostrable para la evaluación universitaria.

**Motivo:** Mantener el alcance acorde con el tiempo, los recursos y la experiencia de programación disponibles.

**Consecuencia:** No introducir infraestructura compleja ni funcionalidades comerciales que no sean necesarias para demostrar los requisitos.

## DT-004 — Datos ficticios

**Estado:** Aceptada.

**Decisión:** Utilizar datos ficticios durante el desarrollo y las demostraciones.

**Motivo:** Evitar exponer información personal o confidencial.

**Consecuencia:** Las consultas demostrativas de pólizas y demás registros deben identificarse como ficticios.

## DT-005 — Tecnologías del frontend

**Estado:** Propuesta.

**Decisión propuesta:** React, TypeScript y Vite.

**Motivo:** Proporcionar una interfaz web organizada y una base de desarrollo mantenible.

**Pendiente:** Confirmar la configuración final y comprobar su compatibilidad con el entorno seleccionado.

## DT-006 — Tecnologías del backend

**Estado:** Propuesta.

**Decisión propuesta:** Node.js, Express y TypeScript.

**Motivo:** Centralizar las reglas de negocio, la API, la autenticación y las operaciones del agente.

**Pendiente:** Definir la estructura final de módulos y la estrategia de autenticación.

## DT-007 — Base de datos

**Estado:** Propuesta.

**Decisión propuesta:** PostgreSQL con Drizzle ORM y migraciones.

**Motivo:** Contar con persistencia relacional, integridad de datos y cambios de esquema controlados.

**Pendiente:** Diseñar el modelo entidad-relación antes de crear las tablas.

## DT-008 — Proveedor de inteligencia artificial

**Estado:** Propuesta.

**Decisión propuesta:** Utilizar Groq para el agente conversacional.

**Motivo:** Integrar capacidades de lenguaje natural sin desarrollar un modelo propio.

**Condiciones:**
- Las llamadas se realizarán desde el backend.
- La clave se guardará como secreto del entorno.
- No se subirá la clave al repositorio.
- Las operaciones de negocio dependerán del backend, no de las afirmaciones del modelo.

**Pendiente:** Seleccionar y verificar un modelo disponible, su compatibilidad con el uso de herramientas y los límites aplicables.

## DT-009 — Agente con herramientas controladas

**Estado:** Aceptada como principio de diseño.

**Decisión:** El agente podrá solicitar herramientas expresamente autorizadas, pero no tendrá acceso directo e irrestricto a la base de datos.

**Motivo:** Mantener el control sobre las operaciones y validar las solicitudes antes de ejecutarlas.

**Consecuencia:** Cada herramienta necesitará argumentos definidos, validación, permisos y resultados documentados.

## DT-010 — Separación entre solicitud y confirmación

**Estado:** Aceptada.

**Decisión:** Registrar una solicitud no implica confirmar el servicio ni reservar automáticamente todos los recursos.

**Motivo:** Evitar que una respuesta del agente o un formulario genere compromisos operativos no verificados.

**Consecuencia:** El backend debe comprobar las reglas de negocio y aplicar el proceso de autorización correspondiente.

## DT-011 — Seguridad de credenciales

**Estado:** Aceptada.

**Decisión:** Mantener las claves, contraseñas y tokens fuera del código y de los commits.

**Motivo:** Reducir el riesgo de acceso no autorizado.

**Consecuencia:** Utilizar variables de entorno, secretos del entorno de desarrollo y un archivo `.env.example` sin credenciales reales.

## DT-012 — Pruebas antes de dar por terminada una función

**Estado:** Aceptada.

**Decisión:** Verificar las funciones mediante pruebas apropiadas antes de marcarlas como terminadas.

**Motivo:** Evitar confundir código generado con código que realmente funciona.

**Consecuencia:** Registrar las pruebas ejecutadas, sus resultados y cualquier limitación pendiente.

## DT-013 — Plataforma de desarrollo

**Estado:** Pendiente.

**Decisión por tomar:** Confirmar el uso de Replit como entorno principal y definir cómo se ejecutarán las pruebas y se configurarán los secretos.

**Criterio:** El proyecto debe seguir siendo portable y mantener a GitHub como fuente oficial.

## DT-014 — Autenticación y sesiones

**Estado:** Pendiente.

**Decisión por tomar:** Seleccionar el mecanismo de autenticación, gestión de sesiones, protección de contraseñas y control de roles.

**Criterio:** Priorizar una solución apropiada para una aplicación web con un panel privado y operaciones sensibles.

## DT-015 — Estrategia de despliegue

**Estado:** Pendiente.

**Decisión por tomar:** Definir cómo se ejecutará y demostrará la aplicación en el entorno académico.

**Criterio:** Minimizar la complejidad y evitar gastos o servicios innecesarios.

## Regla para futuras decisiones

Toda decisión técnica nueva que afecte a la arquitectura, la seguridad, los datos o el alcance debe registrar:

1. El problema que se necesita resolver.
2. Las alternativas consideradas.
3. La opción elegida y sus motivos.
4. Las consecuencias y los riesgos.
5. El estado de la decisión.
