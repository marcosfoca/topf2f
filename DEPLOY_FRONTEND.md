# Despliegue del frontend en Vercel

1. Ve a https://vercel.com → New Project → importa el mismo repo de GitHub
2. Root directory: `frontend/frontend`
3. Framework preset: Create React App (Vercel lo detecta solo)
4. En Environment Variables añade:
   ```
   REACT_APP_API_URL = https://topf2f-backend.onrender.com
   ```
   (la URL real de Render del paso anterior)
5. Deploy → Vercel te da una URL: `https://topf2f.vercel.app`
6. Esa URL es tu app en producción

## Actualizar el backend con la URL del frontend

Una vez tengas la URL de Vercel, vuelve a Render y actualiza la variable:
```
CORS_ORIGINS = https://topf2f.vercel.app
```

Esto permite que el frontend se comunique con el backend sin errores de CORS.
