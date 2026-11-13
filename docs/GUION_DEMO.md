# Serena — Guion de demostración

**Duración prevista:** 6 a 8 minutos.
**Datos:** todos ficticios, cargados con `seed-demo`.

## Antes de empezar

1. `pnpm --filter @workspace/db push`
2. `pnpm --filter @workspace/api-server seed-demo`
3. Tener `GROQ_API_KEY` en el `.env` del backend (si falta, el asistente avisa que no está configurado; no inventa).
4. Abrir la aplicación y entrar como `admin@serena.demo` / `SerenaDemo2026!`.

## 1. Portal público (1 min)

- Ir a `/solicitar-servicio`.
- Elegir un servicio, escribir nombre y teléfono, enviar.
- Anotar el código `SER-...` que aparece.
- Mensaje clave: **la solicitud queda pendiente, no confirma el servicio**.

## 2. Consulta por código (30 s)

- Volver al inicio y consultar el código.
- Se ve el estado actual sin exponer datos de contacto.

## 3. Revisión y estados (1,5 min)

- Entrar con la cuenta de administración → **Solicitudes**.
- Abrir la solicitud recién creada.
- Mostrar el historial: el primer registro es automático.
- Pasar a **En revisión**; luego **Confirmar**.
- Intentar un salto inválido (por ejemplo, confirmar una pendiente): el sistema lo rechaza.
- Rechazar o cancelar sin motivo: se exige el motivo y queda en el historial.

## 4. Inventario (1 min)

- **Inventario** → abrir un artículo → **Movimientos**.
- Registrar una salida de 1 unidad.
- Mostrar que la existencia baja y el movimiento guarda cantidad anterior y resultante.
- Intentar una salida mayor a la existencia: se rechaza.
- Mencionar el bloqueo de fila: dos salidas simultáneas no dejan números negativos.

## 5. Recursos y asignaciones (1 min)

- **Recursos** → mostrar sala, vehículo y equipo con su estado.
- Volver a la solicitud → **Recursos asignados** → asignar una sala con un período.
- Intentar asignar la misma sala en un período que se superpone: se rechaza.
- Cancelar la asignación: queda registrada como cancelada y la sala vuelve a estar libre.

## 6. Asistente (1,5 min)

- **Asistente** → probar:
  - «¿Hay alguna sala libre mañana a las 3 de la tarde?» (usa la herramienta de disponibilidad)
  - «Consulta la póliza de demostración DEMO-0001» (responde que es ficticia)
  - «Quiero hablar con una persona» (responde con el canal configurado o avisa que no lo está)
- Mostrar las etiquetas de herramientas usadas.
- Mensaje clave: el asistente **no consulta la base de datos directamente** y **no inventa** resultados; si no puede, lo dice.

## 7. Cierre (30 s)

- Recalcar: datos ficticios, sin integración con aseguradoras reales, solicitud ≠ servicio confirmado.
- Mencionar lo que queda como trabajo futuro: canales de atención configurables, auditoría visible, permisos finos por empleado.

## Plan B si falla la red o el asistente

- El sistema funciona sin la clave de Groq: el módulo del asistente responde 503 con un mensaje controlado.
- Si falla la base de datos durante la demo, mostrar las pruebas en GitHub Actions como evidencia de verificación.
