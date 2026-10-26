
# Serena — Arquitectura técnica

**Versión:** 0.1  
**Estado:** Propuesta inicial para revisión  
**Tipo de sistema:** Aplicación web con backend y base de datos relacional

## 1. Objetivo

Definir una arquitectura sencilla, mantenible y adecuada para desarrollar Serena como proyecto académico.

La solución debe separar la interfaz de usuario, las reglas de negocio, la persistencia de datos y la integración con inteligencia artificial.

Se prioriza la claridad del código, la facilidad de prueba y la posibilidad de continuar el desarrollo en distintos entornos.

## 2. Arquitectura general

La arquitectura propuesta consta de cuatro componentes principales:

1. Frontend web.
2. Backend y API.
3. Base de datos PostgreSQL.
4. Servicio de inteligencia artificial mediante Groq.

El navegador se comunica con el backend. El backend valida las solicitudes, aplica las reglas de negocio y accede a la base de datos cuando corresponde.

El backend también se comunica con Groq cuando necesita generar una respuesta del agente de IA.

El navegador nunca debe comunicarse directamente con PostgreSQL ni recibir la clave API de Groq.

## 3. Tecnologías propuestas

### Frontend

- React.
- TypeScript.
- Vite.
- Interfaz en español y diseño adaptable a distintos tamaños de pantalla.

Responsabilidades:

- Mostrar el portal público.
- Mostrar el panel privado del personal.
- Recoger y validar los datos de los formularios.
- Mostrar estados, errores y confirmaciones devueltos por el backend.
- Presentar la conversación con el agente de IA.

La interfaz no será responsable de autorizar operaciones sensibles.

### Backend

- Node.js.
- Express.
- TypeScript.

Responsabilidades:

- Exponer la API del sistema.
- Validar datos de entrada.
- Autenticar usuarios y comprobar sus permisos.
- Aplicar las reglas de negocio.
- Ejecutar operaciones de base de datos.
- Controlar la disponibilidad y asignación de recursos.
- Gestionar las herramientas autorizadas del agente de IA.
- Registrar operaciones relevantes y manejar errores.

### Base de datos

- PostgreSQL.
- Drizzle ORM y migraciones.

Responsabilidades:

- Almacenar usuarios y roles.
- Almacenar recursos e inventario.
- Registrar movimientos de inventario.
- Registrar solicitudes y asignaciones.
- Almacenar pólizas ficticias de demostración.
- Registrar los eventos de auditoría necesarios.

El esquema definitivo se documentará y revisará antes de crear las migraciones.

### Inteligencia artificial

- API de Groq.
- Acceso exclusivamente desde el backend.

Responsabilidades:

- Interpretar preguntas en lenguaje natural.
- Generar respuestas basadas en información disponible.
- Solicitar el uso de herramientas autorizadas cuando corresponda.

La IA no será la fuente oficial de los estados de las solicitudes, el inventario, la disponibilidad ni las pólizas. Esos datos procederán del backend y de la base de datos.

## 4. Flujo de una operación

Ejemplo: un cliente solicita información sobre la disponibilidad de un recurso.

1. El cliente escribe su consulta en la interfaz.
2. El frontend envía la solicitud al backend.
3. El backend valida la entrada y determina qué operación está permitida.
4. Si se utiliza el agente de IA, este puede solicitar una herramienta autorizada.
5. El backend valida los argumentos y ejecuta la operación de consulta.
6. La base de datos devuelve los registros pertinentes.
7. El backend devuelve el resultado al agente o al frontend, según el flujo.
8. La interfaz presenta el resultado real y comunica cualquier limitación.

Una consulta no debe convertirse automáticamente en una reserva confirmada.

## 5. Organización propuesta del código

La siguiente estructura es una referencia para la futura implementación. No significa que estos archivos ya existan.

- `frontend/`
  - `src/`
    - `components/`
    - `pages/`
    - `services/`
    - `types/`

- `backend/`
  - `src/`
    - `routes/`
    - `controllers/`
    - `services/`
    - `repositories/`
    - `middleware/`
    - `agent/`
    - `db/`
    - `types/`

- `docs/`
  - `REQUISITOS.md`
  - `ARQUITECTURA.md`
  - `ESTADO_DEL_PROYECTO.md`
  - `DECISIONES_TECNICAS.md`
  - `CONTRATO_DEL_AGENTE.md`

- `tests/`

La estructura final podrá ajustarse si una alternativa más sencilla resulta mejor para el alcance académico.

## 6. Seguridad

- La clave de Groq se almacenará como variable de entorno del backend.
- Las credenciales no se incluirán en GitHub.
- Las rutas privadas exigirán autenticación y autorización.
- El backend validará cada operación sensible.
- Los errores no expondrán credenciales ni detalles internos innecesarios.
- Las operaciones que modifiquen datos deberán contemplar duplicados y fallos parciales.
- Se utilizarán datos ficticios durante el desarrollo y la demostración.

## 7. Persistencia y consistencia

PostgreSQL será la fuente de verdad de los datos persistentes.

Las operaciones críticas deberán diseñarse para evitar estados inconsistentes. Por ejemplo:

- La asignación de un recurso debe comprobar su disponibilidad en el servidor.
- Los movimientos de inventario deben conservar su historial.
- La creación de solicitudes debe evitar registros duplicados cuando se reintenta una operación.
- Los cambios relacionados que deban ser atómicos se realizarán mediante transacciones cuando corresponda.

La disponibilidad debe comprobarse en el momento de ejecutar la operación, no únicamente cuando se muestra información en pantalla.

## 8. Integración del agente

El agente utilizará un conjunto limitado de herramientas definidas en el backend.

Ejemplos de herramientas previstas:

- `consultar_disponibilidad`
- `verificar_poliza_demo`
- `crear_solicitud`
- `consultar_solicitud`
- `contacto_soporte`

Cada herramienta tendrá argumentos definidos, validación, permisos y resultados documentados.

No se permitirá ejecutar consultas SQL arbitrarias ni realizar operaciones administrativas sin autorización.

## 9. Pruebas

Se prevén los siguientes niveles de prueba:

- Pruebas unitarias de las reglas de negocio.
- Pruebas de API para las rutas y los permisos.
- Pruebas de integración con PostgreSQL.
- Pruebas de persistencia tras reiniciar el servidor.
- Pruebas del agente con respuestas válidas, errores y herramientas no autorizadas.
- Pruebas manuales de los principales flujos de usuario.

Las pruebas deberán ejecutarse y registrarse antes de declarar una funcionalidad terminada.

## 10. Entorno de desarrollo y despliegue

El proyecto debe poder desarrollarse en un entorno como Replit y mantenerse versionado en GitHub.

La lógica principal no debe depender de funciones exclusivas de Replit.

Las variables de entorno necesarias deberán documentarse mediante un archivo `.env.example` sin valores secretos.

La configuración real de desarrollo y despliegue se decidirá después de verificar los servicios disponibles.

## 11. Decisiones pendientes

- Confirmar la estructura definitiva del repositorio.
- Seleccionar el método de autenticación.
- Definir las entidades y relaciones de la base de datos.
- Definir el contrato de las herramientas del agente.
- Elegir el método de gestión de sesiones y permisos.
- Determinar las necesidades de registros y auditoría.
- Establecer la estrategia de pruebas y los criterios de aceptación.

## 12. Criterio de aceptación de la arquitectura

La arquitectura se considerará suficientemente definida para iniciar la implementación cuando:

1. Se hayan validado los requisitos principales.
2. Se haya revisado el modelo de datos.
3. Se hayan documentado las responsabilidades de cada componente.
4. Se hayan definido los controles de acceso.
5. Se haya acordado el contrato del agente.
6. Se haya seleccionado una estrategia de pruebas.
