# Despliegue de WAHA en Fly.io (gratis)

## Requisitos previos
- Tener Git instalado
- Tener el repo subido a GitHub (ya hecho)

---

## PASO 1 — Instalar flyctl

Ve a https://fly.io/docs/flyctl/install/ y descarga el instalador para Windows.
O desde PowerShell:
```
iwr https://fly.io/install.ps1 -useb | iex
```

---

## PASO 2 — Crear cuenta en Fly.io

1. Ve a https://fly.io → Sign Up
2. Introduce email y contraseña
3. **No hace falta tarjeta** para el plan gratuito

---

## PASO 3 — Iniciar sesión desde la terminal

```bash
fly auth login
```
Se abre el navegador → autoriza.

---

## PASO 4 — Ir a la carpeta waha

```bash
cd ruta/a/tu/proyecto/waha
```

---

## PASO 5 — Crear la app en Fly.io

```bash
fly launch --no-deploy --copy-config
```
- Cuando pregunte el nombre: escribe `topf2f-waha`
- Región: `mad` (Madrid)
- No crear Postgres ni Redis: **No**

---

## PASO 6 — Crear el volumen persistente (guarda la sesión de WhatsApp)

```bash
fly volumes create waha_sessions --region mad --size 1
```

---

## PASO 7 — Configurar los secretos

Elige una API key cualquiera (ej: `topf2f_waha_2024`) y ponla en ambos comandos:

```bash
fly secrets set WAHA_API_KEY=topf2f_waha_2024
fly secrets set WAHA_WEBHOOKS_URLS=https://topf2f.onrender.com/api/webhooks/whatsapp
```
> Sustituye `https://topf2f.onrender.com` por la URL real de tu backend en Render.

---

## PASO 8 — Desplegar

```bash
fly deploy
```
Tarda ~2 minutos. Al acabar te da una URL tipo:
`https://topf2f-waha.fly.dev`

---

## PASO 9 — Iniciar la sesión de WhatsApp (escanear QR)

1. Ve a `https://topf2f-waha.fly.dev` en el navegador
2. Usuario: (vacío) — Contraseña: `topf2f_waha_2024` (tu API key)
3. Ve a **Sessions** → **Start session**
4. Aparece un QR → **escanéalo con tu móvil** en WhatsApp → Dispositivos vinculados → Vincular dispositivo

---

## PASO 10 — Actualizar variables en Render (backend)

En Render → tu servicio → **Environment**:

| Key | Value |
|---|---|
| `WAHA_URL` | `https://topf2f-waha.fly.dev` |
| `WAHA_API_KEY` | `topf2f_waha_2024` |

Guarda → Render redespliega solo.

---

## ¡Listo! El bot ya funciona.

Cuando alguien se inscriba en el formulario recibirá un WhatsApp automático.
