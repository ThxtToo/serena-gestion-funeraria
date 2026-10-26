
# Serena — Requisitos del sistema

**Documento:** Requisitos funcionales y no funcionales  
**Versión:** 0.1  
**Estado:** Borrador para revisión académica  
**Contexto:** Sistema de gestión funeraria para Venezuela

## 1. Propósito

Definir las funciones y restricciones iniciales de Serena. Este documento orientará el diseño, la implementación y las pruebas del sistema.

Los requisitos deben validarse con las necesidades de la funeraria y las instrucciones del profesor antes de considerarse definitivos.

## 2. Alcance de la primera versión

La primera versión será un prototipo funcional para evaluación universitaria. Utilizará datos ficticios y permitirá demostrar la gestión básica de solicitudes, recursos e inventario, además de la interacción con un agente de inteligencia artificial.

No se considera autorizada para gestionar operaciones reales hasta completar una evaluación independiente de seguridad, privacidad, continuidad operativa y requisitos legales aplicables.

## 3. Actores

- **Visitante:** consulta información pública y puede iniciar una solicitud.
- **Cliente solicitante:** proporciona los datos necesarios para una solicitud ficticia y consulta su estado mediante los mecanismos autorizados.
- **Empleado:** consulta y gestiona las solicitudes según sus permisos.
- **Administrador:** gestiona usuarios, roles, recursos, inventario y configuraciones autorizadas.
- **Agente de IA:** interpreta preguntas y solicita operaciones a través de herramientas controladas por el backend.
- **Responsable del sistema:** verifica el funcionamiento, la seguridad y la integridad de los datos.

Los permisos definitivos deberán revisarse antes de implementar la autenticación.

## 4. Requisitos funcionales

### RF-01. Información pública

El sistema debe mostrar información general de la funeraria, sus servicios y los medios de contacto configurados.

### RF-02. Asistente conversacional

El sistema debe ofrecer un agente de IA que responda preguntas dentro del alcance autorizado y comunique cuándo necesita intervención humana.

### RF-03. Registro de solicitudes

El sistema debe permitir registrar una solicitud de servicio y asignarle un identificador único.

### RF-04. Consulta de solicitudes

El sistema debe permitir consultar el estado de una solicitud mediante un mecanismo de identificación y autorización apropiado.

### RF-05. Estados de solicitud

El sistema debe distinguir, como mínimo, entre solicitud recibida, pendiente de revisión, aprobada, rechazada y cancelada. Los estados definitivos y sus transiciones deben validarse antes de implementar.

### RF-06. Disponibilidad de recursos

El sistema debe permitir consultar la disponibilidad de los recursos necesarios para un servicio, considerando las asignaciones y los períodos correspondientes.

### RF-07. Gestión de inventario

El personal autorizado debe poder consultar los artículos de inventario y sus cantidades registradas.

### RF-08. Movimientos de inventario

El sistema debe registrar entradas, salidas y ajustes autorizados de inventario, conservando un historial de movimientos.

### RF-09. Gestión de recursos

El personal autorizado debe poder administrar los recursos operativos definidos para el proyecto, como salas, vehículos y equipos.

### RF-10. Asignación de recursos

El sistema debe permitir asignar recursos a una solicitud cuando las reglas de disponibilidad lo permitan y evitar conflictos de asignación.

### RF-11. Consulta demostrativa de pólizas

El sistema debe permitir consultar pólizas ficticias para demostrar el flujo de verificación. No debe afirmar que ha consultado una aseguradora real.

### RF-12. Herramientas del agente

El agente debe utilizar únicamente herramientas explícitamente autorizadas, como consultar disponibilidad, verificar una póliza de demostración, crear una solicitud y consultar su estado.

### RF-13. Autenticación y roles

El sistema debe autenticar al personal y aplicar los permisos correspondientes en el backend.

### RF-14. Auditoría

El sistema debe registrar las operaciones administrativas y sensibles que se definan como auditables, evitando guardar contraseñas, claves API u otros secretos.

### RF-15. Atención humana

El sistema debe mostrar un canal de contacto humano configurable para solicitudes que requieran revisión o asistencia adicional.

## 5. Requisitos no funcionales

### RNF-01. Seguridad

Las operaciones privadas deben protegerse mediante autenticación, autorización, validación del lado del servidor y manejo seguro de secretos.

### RNF-02. Persistencia

Los datos deben almacenarse en una base de datos persistente y conservarse después de reiniciar la aplicación.

### RNF-03. Integridad

La aplicación debe validar las reglas de negocio y evitar duplicados, asignaciones incompatibles y movimientos de inventario inválidos.

### RNF-04. Usabilidad

La interfaz debe estar en español, presentar mensajes comprensibles y facilitar el uso por personas con conocimientos técnicos limitados.

### RNF-05. Mantenibilidad

El código debe estar organizado por responsabilidades y contar con documentación suficiente para facilitar su revisión y continuidad.

### RNF-06. Pruebas

Las funciones críticas deben contar con pruebas verificables, incluidos casos exitosos, errores y accesos no autorizados.

### RNF-07. Portabilidad

El proyecto debe poder ejecutarse en un entorno documentado sin depender innecesariamente de servicios exclusivos de una plataforma.

### RNF-08. Privacidad

La versión académica debe utilizar datos ficticios y evitar la recopilación de información personal real que no sea necesaria.

### RNF-09. Trazabilidad

Los requisitos deben relacionarse con casos de uso, implementación y pruebas para demostrar qué se desarrolló y cómo se verificó.

### RNF-10. Recuperación de errores

La aplicación debe manejar fallos de base de datos, servicios externos y herramientas de IA sin presentar operaciones fallidas como exitosas.

## 6. Reglas de negocio

- RB-01. Registrar una solicitud no significa que el servicio esté confirmado.
- RB-02. La confirmación requiere cumplir las reglas de negocio y las autorizaciones definidas.
- RB-03. No asignar un recurso a dos servicios incompatibles en el mismo período.
- RB-04. Los movimientos de inventario deben estar autorizados y registrados.
- RB-05. Las consultas de pólizas de la versión académica utilizarán únicamente registros ficticios.
- RB-06. El agente de IA no puede inventar disponibilidad, estados, pólizas ni resultados de operaciones.
- RB-07. Las operaciones sensibles deben validarse en el backend aunque se originen desde la interfaz o el agente.
- RB-08. Las claves API y contraseñas nunca deben almacenarse en el repositorio.
- RB-09. Los datos ficticios deben identificarse claramente como datos de demostración.
- RB-10. La atención humana debe seguir disponible cuando el agente no pueda resolver una consulta.

## 7. Criterios generales de aceptación

Se considerará que una función está verificada cuando:

1. Cumpla su requisito documentado.
2. Se pueda demostrar mediante un caso de prueba reproducible.
3. Maneje correctamente los errores previsibles.
4. Respete los permisos y las reglas de negocio.
5. Persista los datos cuando corresponda.
6. Su resultado no dependa de afirmaciones no verificadas del agente de IA.

## 8. Fuera del alcance inicial

- Integración real con aseguradoras.
- Procesamiento de pagos reales.
- Uso de datos reales de clientes o personas fallecidas.
- Despliegue para operaciones funerarias reales.
- Infraestructura distribuida compleja o arquitectura de microservicios.
- Garantías de cumplimiento legal o certificaciones de seguridad no verificadas.

## 9. Pendientes de validación

- Servicios exactos que ofrece la funeraria.
- Recursos que deben controlarse y sus reglas de disponibilidad.
- Datos mínimos necesarios para registrar una solicitud.
- Estados y responsables del proceso de atención.
- Roles definitivos del personal.
- Requisitos específicos del profesor y entregables de la asignatura.
- Canal de contacto humano que se utilizará en la demostración.
- Requisitos legales y de privacidad aplicables si el sistema llegara a utilizarse en operaciones reales.
