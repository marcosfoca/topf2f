# Despliegue del backend en Render

1. Sube el proyecto a GitHub (un repo privado vale)
2. Ve a https://render.com → New → Web Service → conecta el repo
3. Root directory: `backend/backend`
4. Render detectará el render.yaml automáticamente
5. Antes de hacer Deploy, ve a Environment y sustituye los PLACEHOLDERs:
   - `WHATSAPP_PHONE_NUMBER_ID` → tu ID de número de Meta
   - `WHATSAPP_ACCESS_TOKEN`    → tu token permanente de Meta
   - `WHATSAPP_VERIFY_TOKEN`    → el string que hayas elegido (ej: `topf2f_wh_2024`)
   - `MONGO_URL`                → tu connection string de MongoDB Atlas
   - `DB_NAME`                  → nombre de la base de datos (ej: `topf2f`)
   - `ADMIN_EMAILS`             → emails separados por coma de los admins
   - `CORS_ORIGINS`             → URL del frontend (ej: `https://topf2f.vercel.app`)
6. Haz clic en Deploy — tarda ~2 min
7. Render te da una URL: `https://topf2f-backend.onrender.com`
   → Cópiala, la necesitas para el frontend y para Meta

## Configurar el webhook en Meta

1. Ve a https://developers.facebook.com → tu app → WhatsApp → Configuración
2. En "Webhooks", añade:
   - URL: `https://topf2f-backend.onrender.com/api/webhooks/whatsapp`
   - Token de verificación: el mismo que pusiste en `WHATSAPP_VERIFY_TOKEN`
3. Suscríbete a los eventos: `messages`, `message_status`

## Notas

- En Render free tier la app duerme tras 15 min sin tráfico
- El worker de WhatsApp se reactiva automáticamente al llegar el primer webhook de Meta
- El dispatcher comprueba eventos pendientes cada 60 segundos
