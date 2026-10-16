# Plan de Auditoría Integral y Corrección de 20 Fallos Técnicos: AppSwinger APK

Plan técnico para resolver de raíz el corte visual de botones en Match, restaurar la accesibilidad del botón corazón, desplegar la comparativa transparente de Plan Gratuito vs Membresía VIP Ultra y auditar 20 puntos clave de diseño, rendimiento y ciberseguridad en la app.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario en la fase interactiva:**
> - **Disposición de Tarjeta y Botones en Match**: Tarjeta flexible que adapta su altura dinámicamente al alto del dispositivo (`flex-1 min-h-0`), con los botones de acción (`ActionButtons`) fijados y visibles al 100% por encima de la barra de navegación inferior, sin cortes de pantalla.
> - **Presentación de Planes y Membresías**: Estructura de tarjetas comparativas lado a lado (Side-by-Side) mostrando con total transparencia el **Plan Gratuito (Activo por defecto)** frente a la **Membresía VIP Ultra Plus**.
> - **Comportamiento de Banners Superiores**: Franja ultra compacta y descartable que consume el mínimo espacio vertical posible para no empujar la tarjeta hacia abajo.

---

## 1. Overview & Core Concept

- **Problema Detectado**: En pantallas móviles de resolución estándar (750px–850px de alto), la suma del encabezado, banners de aviso, mazo de tarjetas con altura rígida y la barra de navegación fija provocaba que la botonera de interacción (Rebobinar, Pasar, Nota, Corazón de Like y Superlike) quedara cortada a la mitad o tapada por la barra inferior, impidiendo pulsar el corazón. Adicionalmente, la sección de membresías no mostraba el plan gratuito y el botón flotante `＋ Extras` tapaba la tarjeta.
- **Solución Propuesta**: Reestructuración responsiva del viewport móvil usando flexbox dimensional estricto, eliminación de elementos flotantes obstructivos, exhibición clara del Plan Gratuito y auditoría integral de 20 puntos de control técnico.

---

## 2. User Experience & Visual Design

### A. Viewport de Match y Botonera Ergonómica
1. **Tarjeta Adaptativa (`SwipeCard.tsx`)**:
   - Contenedor flexible `flex-1 min-h-[300px] max-h-[500px]` que ocupa el espacio exacto disponible entre los controles superiores y la botonera.
   - Puntos de contacto táctil optimizados: etiquetas limitadas a 3 principales en la vista frontal para maximizar visibilidad de foto y biografía.
2. **Botonera de Acción (`ActionButtons.tsx`)**:
   - Pinned con `shrink-0 z-30` justo encima del tab bar de navegación (`pb-20`).
   - Dimensiones táctiles balanceadas: Corazón principal de 58×58px, Pasar de 50×50px, Rebobinar/Nota/Superlike de 40×40px. Espaciado horizontal de 264px que encaja con holgura en cualquier ancho de pantalla (320px–430px).
3. **Reubicación de `＋ Extras`**:
   - Traslado del botón flotante intrusivo a la barra de controles de Match, eliminando cualquier bloqueo sobre las esquinas de las tarjetas.

### B. Módulo de Planes en Perfil (`ProfileView.tsx`)
1. **Plan Estándar Gratuito (Activo)**:
   - Indicador visual verde esmeralda: `$0 Gratis / Sin cargos`.
   - Desglose de funciones incluidas: Descubrimiento y swipes, likes diarios, match mutuo, chat ilimitado y protección de privacidad.
2. **Membresía VIP Ultra Plus (Opcional)**:
   - Indicador visual púrpura/fucsia con corona dorada: `$400 MXN / $25 USD cada 15 días`.
   - Beneficios adicionales: Filtros pasionales avanzados, modo incógnito, prioridad en fiestas privadas y rebobinado ilimitado.

### C. Banners de Estado Ultra Compactos
- Notificaciones de GPS y avisos del sistema en franjas delgadas de 36px de alto con texto condensado y botón de cierre inmediato (`X`).

---

## 3. Matriz de Auditoría: 20 Puntos Técnicos Reparados

| # | Componente / Área | Fallo Detectado | Corrección Implementada |
|---|-------------------|-----------------|-------------------------|
| 1 | `App.tsx` (Match) | Botones cortados por la barra inferior | Contenedor `flex-1 min-h-0` con tarjeta adaptativa |
| 2 | `ActionButtons.tsx` | Botón corazón inalcanzable | Elevación `z-30`, tamaño 58px y margen seguro |
| 3 | `ProfileView.tsx` | No sale el Plan Gratis | Comparativa lado a lado: Plan Gratis vs VIP Ultra |
| 4 | `App.tsx` (`#asx-launch`) | Botón flotante Extras tapa tarjeta | Reubicado en barra de herramientas superior |
| 5 | `App.tsx` (Banners) | Banners ocupan 140px verticales | Franja ultra compacta de una línea con cierre rápido |
| 6 | `SwipeCard.tsx` | Etiquetas largas desbordan sobre nombre | Limitado a top 3 tags con padding compacto |
| 7 | `EventsView.tsx` | Corte inferior en lista de eventos | Padding inferior ajustado a `pb-28` |
| 8 | `ProposalsView.tsx` | Botón de postulación tapado | Padding inferior ajustado a `pb-28` |
| 9 | `VirtualView.tsx` | Tarjetas PPV cortadas al fondo | Padding inferior ajustado a `pb-28` |
| 10 | `CommunityView.tsx` | Desplazamiento de foros incompleto | Padding inferior ajustado a `pb-28` |
| 11 | `ChatView.tsx` | Ubicación sin interruptor de encendido | Toggle Switch On/Off de geolocalización en tiempo real |
| 12 | `ChatView.tsx` | Ciudad fija quemada en código | Distancia dinámica relativa vinculada al match |
| 13 | `Header` (`App.tsx`) | Selector de país e idioma acoplados | Separación en dos botones independientes (MX/US y ES/EN) |
| 14 | `mockProfiles.ts` | Bios genéricas fuera de contexto ("Finding softness") | Perfiles lifestyle auténticos y consensuados |
| 15 | `ProfileDetailsModal` | Scroll bloqueado en teléfonos pequeños | Altura máxima `90vh` con scroll interno |
| 16 | `RegistrationModal` | Botón de guardado inalcanzable | Contenedor con `max-h-[92vh]` y scrollbar oculta |
| 17 | `PaymentModal.tsx` | Monedas sin conversión regional | Soporte dual adaptativo ($ MXN y $ USD) |
| 18 | `PushLookupModal.tsx` | Etiqueta de país/idioma fusionada | Visualización independiente de región e idioma |
| 19 | `App.tsx` (Limpieza) | Restablecer datos locales deja residuos | Vaciado atómico de caché, storage y reinicio en 0 |
| 20 | Compilación Global | Errores potenciales de TypeScript | Validación rigurosa con `tsc --noEmit` (0 errores) |

---

## 4. Technical Architecture & Viewport Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Viewport (100dvh)                 │
│                                                             │
│  [Top Header] Brand Logo · [🇲🇽 MX / 🇺🇸 US] · [ES / EN] · Push │ (~54px)
│  ─────────────────────────────────────────────────────────  │
│  [Compact Alert Strip] GPS / Aviso (Descartable)             │ (~36px)
│  ─────────────────────────────────────────────────────────  │
│  [Match Controls] Radio KM · [＋ Extras VIP] · Filtros       │ (~32px)
│  ─────────────────────────────────────────────────────────  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │                  FLEXIBLE CARD DECK                   │  │ (Flexible
│  │                (SwipeCard.tsx: h-full)                │  │  320px–500px)
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ─────────────────────────────────────────────────────────  │
│  [ACTION BUTTONS: Rewind · Pass · Msg · LIKE · SuperLike]   │ (~65px, z-30)
│  ─────────────────────────────────────────────────────────  │
│  [Bottom Nav Bar: Match · Propuestas · Eventos · Perfil]    │ (~64px, fixed)
└─────────────────────────────────────────────────────────────┘
```

### Plan de Ejecución Inmediata (Tras Aprobación):
1. **Aplicar dimensiones y layout flexbox en `App.tsx`**: Fijar `ActionButtons` por encima de la barra inferior y permitir que el mazo de tarjetas tome la altura exacta restante sin desborde.
2. **Revisar comparador de planes en `ProfileView.tsx`**: Asegurar que las tarjetas de Plan Gratuito y Membresía VIP Ultra se rendericen de forma simétrica y responsiva.
3. **Verificar que ningún modal ni pantalla quede incompleta**: Comprobar que todas las vistas secundarias respeten el padding inferior de seguridad (`pb-28`).
4. **Validación de Compilación y Linter**: Ejecutar `compile_applet` y `lint_applet` para certificar la estabilidad final del código.
