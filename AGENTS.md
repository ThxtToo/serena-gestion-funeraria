
# AGENTS.md — Instrucciones para trabajar en Serena

## 1. Contexto del proyecto

Serena es un sistema inteligente de gestión funeraria desarrollado inicialmente como proyecto académico, contextualizado para una funeraria en Venezuela.

El objetivo inmediato es construir una versión funcional, estable, demostrable y documentada para la evaluación universitaria. No se debe asumir que el sistema está listo para operar con clientes reales.

## 2. Fuente de verdad

- El repositorio de GitHub es la fuente oficial del proyecto.
- Antes de modificar archivos, revisar el README.md y la documentación vigente de docs/.
- Consultar docs/ESTADO_DEL_PROYECTO.md para conocer el avance y la siguiente tarea.
- Si una instrucción contradice una decisión documentada, señalar el conflicto antes de continuar.
- No asumir que una función está implementada sin revisar el código y sus pruebas.
- No inventar decisiones, requisitos ni resultados de pruebas.

## 3. Forma de trabajo

- Avanzar por fases y tareas pequeñas, verificables.
- Antes de programar una funcionalidad, aclarar su objetivo y criterios de aceptación.
- Evitar generar grandes cantidades de código sin revisión.
- No reemplazar archivos completos cuando basta un cambio localizado.
- Explicar brevemente qué se modificó, por qué y cómo verificarlo.
- Ejecutar las pruebas pertinentes después de cada cambio.
- Actualizar la documentación y el estado del proyecto cuando corresponda.
- Separar claramente las funciones planificadas de las implementadas y verificadas.
- Si falta información esencial, preguntar antes de asumir.

## 4. Tecnologías previstas

La propuesta inicial contempla:

- Frontend: React, TypeScript y Vite.
- Backend: Node.js, Express y TypeScript.
- Base de datos: PostgreSQL.
- ORM y migraciones: Drizzle ORM.
- Inteligencia artificial: Groq, exclusivamente desde el backend.
- Pruebas: Vitest y pruebas de API.

Estas tecnologías son la propuesta inicial. Antes de implementarlas, verificar que sean compatibles con el entorno de desarrollo elegido y documentar cualquier cambio.

## 5. Arquitectura y datos

- Mantener separadas la interfaz, la lógica de negocio y el acceso a datos.
- La persistencia debe utilizar una base de datos real, no únicamente variables en memoria o almacenamiento del navegador.
- Validar los datos en el backend.
- Aplicar restricciones de integridad en la base de datos cuando corresponda.
- Gestionar los cambios del esquema mediante migraciones.
- No conectar la interfaz directamente con la base de datos.
- No permitir que el agente de IA ejecute consultas SQL arbitrarias.

## 6. Seguridad

- Nunca incluir claves API, contraseñas, tokens ni credenciales en el código, documentación pública o commits.
- Utilizar variables de entorno y secretos configurados en el entorno de ejecución.
- Mantener `.env.example` con nombres de variables y valores de ejemplo no sensibles.
- No subir archivos `.env` con credenciales reales.
- Proteger las rutas privadas mediante autenticación y autorización en el servidor.
- Validar permisos en cada operación sensible.
- Evitar revelar información privada en respuestas, registros y mensajes de error.
- Registrar las operaciones relevantes sin almacenar secretos ni datos personales innecesarios.
- No afirmar que el sistema cumple una norma legal o de seguridad sin evidencia verificable.

## 7. Datos de prueba

- Utilizar exclusivamente datos ficticios durante el desarrollo y la demostración académica.
- No importar datos reales de clientes, familiares, personas fallecidas, pólizas o empleados.
- Identificar claramente las pólizas y los registros de demostración.
- No presentar resultados ficticios como consultas realizadas a aseguradoras reales.

## 8. Agente de inteligencia artificial

- El agente puede interpretar solicitudes y utilizar únicamente las herramientas autorizadas.
- Las operaciones deben ejecutarse mediante funciones del backend con validación de argumentos y permisos.
- La IA no puede confirmar una reserva, disponibilidad, póliza o transacción sin una respuesta verificable del sistema.
- Diferenciar entre una solicitud recibida, una solicitud pendiente y un servicio confirmado.
- Prevenir duplicados en operaciones que creen registros.
- Si una operación falla, comunicar el fallo sin afirmar que tuvo éxito.
- Mantener disponible una vía de atención humana configurable.
- No exponer claves API al navegador.

## 9. Calidad y pruebas

- Escribir pruebas para las reglas de negocio y las operaciones críticas.
- Comprobar los casos de error y los permisos, no solo el flujo exitoso.
- Verificar que los datos persistan después de recargar la página y reiniciar el servidor cuando corresponda.
- No afirmar que las pruebas pasan si no se ejecutaron.
- No ocultar errores, omitir validaciones ni desactivar pruebas para aparentar que una tarea está terminada.

## 10. Git y colaboración

- Realizar cambios pequeños y con una finalidad clara.
- Utilizar mensajes de commit descriptivos.
- No sobrescribir cambios de otros colaboradores sin revisarlos.
- No incluir archivos generados, dependencias instaladas, credenciales ni archivos temporales innecesarios.
- Revisar el diff antes de confirmar cambios importantes.
- Mantener el repositorio comprensible para personas con experiencia inicial en programación.

## 11. Criterio de finalización de una tarea

Una tarea se considera terminada cuando:

1. Cumple los criterios de aceptación acordados.
2. El código o documento está guardado en el repositorio.
3. Se ejecutaron las verificaciones pertinentes y se informaron sus resultados.
4. No se introdujeron secretos ni datos reales sensibles.
5. Se actualizó la documentación relacionada.
6. Se indicó cualquier limitación o trabajo pendiente.

## 12. Comunicación

Explicar los pasos en español, con instrucciones concretas y ordenadas.

Evitar cambios masivos y términos técnicos sin explicación cuando no sean necesarios.

Al finalizar cada tarea, informar:
- Qué se hizo.
- Qué archivos cambiaron.
- Qué verificaciones se realizaron.
- Qué falta.
- Cuál es el siguiente paso recomendado.
