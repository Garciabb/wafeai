# 🧠 WAFE — Contexto del Proyecto (Copia esto en cualquier chat)

## ¿Qué es WAFE?

WAFE es una agencia de inteligencia artificial enfocada en automatizar procesos críticos para empresas con alto margen. El primer producto es un **agente de WhatsApp con IA** para clínicas y consultorios médicos/odontológicos, que reduce citas perdidas (no-shows) y automatiza el agendamiento.

---

## Producto actual: Agente de WhatsApp para Clínicas

### Qué hace:
- Responde mensajes de WhatsApp de pacientes con IA (Claude API)
- Agenda, confirma y reagenda citas automáticamente
- Manda recordatorios 24h antes de cada cita
- Se conecta con Google Calendar para sincronizar disponibilidad
- Tiene un panel de control web donde el dueño puede:
  - Ver conversaciones en tiempo real
  - Tomar control manual (modo humano) y volver a modo IA con un botón
  - Editar el contexto, tono y reglas del agente sin tocar código
  - Ver métricas: citas confirmadas, no-shows evitados, mensajes respondidos

### Stack técnico:
- **Backend:** Python + FastAPI
- **IA:** Claude API (Anthropic) — modelo claude-sonnet-4-20250514
- **WhatsApp:** Twilio o Meta WhatsApp Business API
- **Calendario:** Google Calendar API
- **Base de datos:** Supabase (o SQLite para MVP)
- **Panel de control:** React (frontend web)
- **Entorno de desarrollo:** Antygraviti + Claude Code

---

## Fase actual: MVP

### Prioridad de desarrollo (en orden):
1. Chatbot básico con contexto configurable que responda por WhatsApp
2. Conexión con Google Calendar (ver disponibilidad y crear citas)
3. Panel web: ver conversaciones + toggle humano/IA
4. Recordatorios automáticos 24h antes
5. Editor de contexto/reglas desde el panel (sin tocar código)
6. Métricas básicas

### Lo que NO se construye todavía (post-MVP):
- Multi-clínica / multi-tenant
- Pagos integrados
- App móvil
- Integración con sistemas de historia clínica

---

## Modelo de negocio

| Concepto | Detalle |
|---|---|
| Setup / implementación | $500–800 USD (pago único) |
| Mantenimiento mensual | $150–200 USD/mes |
| Cliente objetivo | Clínicas y consultorios odontológicos en Colombia/LATAM |
| Problema que resuelve | Un no-show en odontología = $150k–300k COP perdidos |

---

## Contexto del founder

- Nombre de la agencia: **WAFE**
- Puede construir: agentes con código, Python, APIs, LLMs
- Herramienta principal: **Antygraviti + Claude Code**
- Ubicación: Colombia
- Urgencia: necesita primeros ingresos este mes
- Estrategia: conseguir 1 cliente piloto gratis → caso de éxito → escalar

---

## Reglas para este proyecto

1. **Primero vender, luego construir** — no sobre-ingeniería antes de tener cliente confirmado
2. **Un solo producto, un solo nicho** — clínicas odontológicas/médicas, nada más por ahora
3. **Hablar de resultados, no de tecnología** — "menos citas perdidas", no "LLMs y APIs"
4. **MVP en semanas, no meses** — funcional > perfecto
5. **El panel de control es el diferenciador** — que el cliente pueda controlarlo sin ayuda técnica

---

## Arquitectura del sistema (referencia)

```
Paciente (WhatsApp)
        ↓
  Twilio / Meta API
        ↓
  Backend Python (FastAPI)
        ↓
   Claude API (cerebro del agente)
        ↓
  Google Calendar API
        ↓
  Base de datos (Supabase)
        ↓
  Panel Web React (para el dueño de la clínica)
```

---

## Prompt base del agente (editable desde el panel)

```
Eres un asistente de agendamiento para [NOMBRE_CLINICA].
Tu rol es ayudar a los pacientes a agendar, confirmar o cancelar citas de manera amable y eficiente.

REGLAS:
- Responde siempre en español, tono amable y profesional
- Solo agenda en los horarios disponibles en el calendario
- Si el paciente quiere cancelar, ofrece reagendar antes de confirmar la cancelación
- Nunca inventes horarios disponibles — consulta siempre el calendario real
- Si no puedes resolver algo, informa que un humano se comunicará pronto
- No discutas temas médicos o de diagnóstico

INFORMACIÓN DE LA CLÍNICA:
- Nombre: [NOMBRE_CLINICA]
- Dirección: [DIRECCIÓN]
- Horario de atención: [HORARIO]
- Servicios: [LISTA_DE_SERVICIOS]
```

---

## Estado actual del proyecto

- [ ] MVP del agente de WhatsApp (en construcción)
- [ ] Panel de control React
- [ ] Conexión Google Calendar
- [ ] Cliente piloto conseguido
- [ ] Primer caso de éxito documentado
- [ ] Primeros clientes pagos

---

*Última actualización: Mayo 2026 | Proyecto activo*
