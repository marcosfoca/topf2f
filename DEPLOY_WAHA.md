# Despliegue de WAHA en Oracle Cloud (gratis para siempre)

---

## PASO 1 — Crear cuenta en Oracle Cloud

1. Ve a https://cloud.oracle.com → **Start for free**
2. Rellena nombre, email, país
3. Introduce tarjeta de crédito (no te cobran nada, es solo verificación)
4. Elige región: **Germany Central (Frankfurt)** o la más cercana

---

## PASO 2 — Crear la VM gratuita

1. En el menú principal → **Compute** → **Instances** → **Create Instance**
2. Nombre: `topf2f-waha`
3. Image: **Ubuntu 22.04** (clic en "Change image")
4. Shape: **VM.Standard.A1.Flex** → 1 OCPU, 6GB RAM (siempre gratis)
5. En **Add SSH keys** → selecciona **Generate a key pair** → descarga ambas claves
6. Clic en **Create**

Espera ~2 minutos a que el estado pase a **Running**.
Copia la **IP pública** de la instancia (la necesitarás después).

---

## PASO 3 — Abrir el puerto 3000 en Oracle Cloud

1. Clic en tu instancia → **Subnet** → **Default Security List**
2. **Add Ingress Rules**:
   - Source: `0.0.0.0/0`
   - IP Protocol: TCP
   - Destination Port: `3000`
3. Clic en **Add Ingress Rules**

---

## PASO 4 — Conectarte a la VM por SSH

Desde tu terminal (Windows usa PowerShell o Git Bash):

```bash
ssh -i ruta/a/tu/clave-privada.key ubuntu@IP_PUBLICA
```

---

## PASO 5 — Instalar Docker en la VM

Una vez conectado, ejecuta:

```bash
sudo bash -c "$(curl -fsSL https://raw.githubusercontent.com/marcosfoca/topf2f/main/waha/setup.sh)"
```

O manualmente:
```bash
sudo apt-get update -y
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

---

## PASO 6 — Descargar los archivos de WAHA

```bash
mkdir waha && cd waha
curl -O https://raw.githubusercontent.com/marcosfoca/topf2f/main/waha/docker-compose.yml
```

---

## PASO 7 — Crear el archivo .env

```bash
nano .env
```

Escribe esto (cambia la URL de Render por la tuya real):
```
WAHA_API_KEY=topf2f_waha_2024
BACKEND_URL=https://topf2f.onrender.com
```

Guarda: `Ctrl+O` → Enter → `Ctrl+X`

---

## PASO 8 — Arrancar WAHA

```bash
sudo docker compose up -d
```

Comprueba que funciona:
```bash
sudo docker compose logs -f
```

Deberías ver: `WhatsApp HTTP API is running on port 3000`

---

## PASO 9 — Escanear el QR de WhatsApp

1. Abre en el navegador: `http://IP_PUBLICA:3000`
2. Usuario: (vacío) — Contraseña: `topf2f_waha_2024`
3. Ve a **Sessions** → **Start** → aparece un QR
4. Abre WhatsApp en tu móvil → **Dispositivos vinculados** → **Vincular dispositivo**
5. Escanea el QR

---

## PASO 10 — Actualizar variables en Render (backend)

En Render → tu servicio → **Environment**:

| Key | Value |
|---|---|
| `WAHA_URL` | `http://IP_PUBLICA:3000` |
| `WAHA_API_KEY` | `topf2f_waha_2024` |

Guarda → Render redespliega solo.

---

## ¡Listo! El bot ya funciona.

La sesión de WhatsApp se guarda en la VM y sobrevive reinicios.
