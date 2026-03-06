# 🚀 Zeron CRM — Guía de Instalación Completa

> **Versión:** 1.0.0  
> **Última actualización:** 2026-02-28  
> **Autor:** Zeron Team  

---

## 📑 Índice

1. [Descripción General](#1-descripción-general)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Requisitos Previos](#3-requisitos-previos)
4. [Instalación del Backend](#4-instalación-del-backend)
5. [Instalación del Frontend](#5-instalación-del-frontend)
6. [Configuración de Base de Datos](#6-configuración-de-base-de-datos)
7. [Configuración del Servidor Web (Apache)](#7-configuración-del-servidor-web-apache)
8. [Servicio Systemd (Backend como servicio)](#8-servicio-systemd-backend-como-servicio)
9. [SSL / HTTPS con Let's Encrypt](#9-ssl--https-con-lets-encrypt)
10. [Despliegue de Producción — Paso a Paso Completo](#10-despliegue-de-producción--paso-a-paso-completo)
11. [Estructura del Proyecto](#11-estructura-del-proyecto)
12. [Módulos y Funcionalidades](#12-módulos-y-funcionalidades)
13. [API Endpoints](#13-api-endpoints)
14. [Internacionalización (i18n)](#14-internacionalización-i18n)
15. [Variables de Entorno](#15-variables-de-entorno)
16. [Comandos Útiles](#16-comandos-útiles)
17. [Solución de Problemas](#17-solución-de-problemas)

---

## 1. Descripción General

**Zeron CRM** es un sistema de gestión de relaciones con clientes (CRM) diseñado para empresas de infraestructura y desarrollo de software con enfoque de *software factory*.

### Stack Tecnológico

| Componente | Tecnología | Versión |
|------------|-----------|---------|
| **Backend API** | Python + FastAPI + Uvicorn | Python 3.10+ / FastAPI 0.109 |
| **Frontend** | React + TypeScript + Vite | React 19 / Vite 7 |
| **Base de Datos** | PostgreSQL | 15+ |
| **ORM** | SQLAlchemy | 2.0 |
| **Migraciones** | Alembic | 1.13 |
| **Autenticación** | JWT (python-jose + bcrypt) | — |
| **Estilos** | TailwindCSS | 3.4 |
| **Servidor Web** | Apache 2.4 (reverse proxy) | 2.4 |
| **SSL** | Let's Encrypt (Certbot) | — |

---

## 2. Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────┐
│                        INTERNET                              │
│                    https://zeron.ovh                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │ Apache  │  Puerto 443 (SSL)
                    │ 2.4     │  Puerto 80 → Redirect HTTPS
                    └────┬────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
    /api/v1/*      /uploads/*     /* (Archivos estáticos)
    /health        /docs          SPA Fallback → index.html
    /openapi.json
          │              │              │
    ┌─────▼──────┐       │     ┌────────▼────────┐
    │ Uvicorn    │       │     │ Frontend Build   │
    │ FastAPI    │◄──────┘     │ /var/www/html/   │
    │ :8000      │             │ zeron-crm/       │
    └─────┬──────┘             └─────────────────┘
          │
    ┌─────▼──────┐
    │ PostgreSQL │
    │ :5432      │
    │ zeron_crm  │
    └────────────┘
```

### Flujo de peticiones:
1. El usuario accede a `https://zeron.ovh`
2. Apache sirve los archivos estáticos del frontend (SPA React)
3. Las peticiones a `/api/v1/*` son redirigidas (reverse proxy) a Uvicorn en `127.0.0.1:8000`
4. FastAPI procesa la petición, consulta PostgreSQL y responde JSON
5. El frontend React renderiza la respuesta en el navegador

---

## 3. Requisitos Previos

### Sistema Operativo
- **Ubuntu 22.04 LTS** (o superior)

### Software necesario

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Instalar Python 3.10+
sudo apt install -y python3 python3-pip python3-venv

# Instalar Node.js 20+ y npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Instalar Apache 2.4
sudo apt install -y apache2

# Instalar Git
sudo apt install -y git

# Instalar Certbot (para SSL)
sudo apt install -y certbot python3-certbot-apache
```

### Verificar versiones instaladas

```bash
python3 --version    # Debe ser 3.10+
node --version       # Debe ser 20+
npm --version        # Debe ser 10+
psql --version       # Debe ser 15+
apache2 -v           # Debe ser 2.4+
git --version        # Cualquier versión reciente
```

---

## 4. Instalación del Backend

### 4.1 Clonar el repositorio

```bash
cd /home/ubuntu
mkdir -p zrn-crm
git clone https://github.com/zeron-team/zrn-crm-be.git zrn-crm/backend
```

### 4.2 Crear el entorno virtual de Python

```bash
cd /home/ubuntu/zrn-crm/backend
python3 -m venv venv
```

### 4.3 Activar el entorno virtual

```bash
source venv/bin/activate
```

### 4.4 Instalar dependencias

```bash
pip install -r requirements.txt
```

#### Dependencias principales:

| Paquete | Función |
|---------|---------|
| `fastapi` | Framework web API REST |
| `uvicorn` | Servidor ASGI para FastAPI |
| `sqlalchemy` | ORM para PostgreSQL |
| `alembic` | Migraciones de base de datos |
| `psycopg2-binary` | Driver PostgreSQL para Python |
| `python-jose` | Generación y validación de tokens JWT |
| `passlib` + `bcrypt` | Hash seguro de contraseñas |
| `pydantic` | Validación de datos y schemas |
| `pydantic-settings` | Configuración desde variables de entorno |
| `python-dotenv` | Carga de archivos `.env` |
| `python-multipart` | Subida de archivos (multipart/form-data) |
| `email-validator` | Validación de emails |

### 4.5 Configurar variables de entorno

Crear el archivo `/home/ubuntu/zrn-crm/backend/.env`:

```bash
cat > /home/ubuntu/zrn-crm/backend/.env << 'EOF'
DATABASE_URL=postgresql://zeron_user:TU_PASSWORD_SEGURA@localhost:5432/zeron_crm
SECRET_KEY=GENERA_UN_SECRET_KEY_ALEATORIO_AQUI
ACCESS_TOKEN_EXPIRE_MINUTES=480
EOF
```

> ⚠️ **IMPORTANTE:** Genera un `SECRET_KEY` seguro con:
> ```bash
> python3 -c "import secrets; print(secrets.token_urlsafe(48))"
> ```

### 4.6 Verificar que el backend carga correctamente

```bash
cd /home/ubuntu/zrn-crm/backend
source venv/bin/activate
python3 -c "import app.main; print('✅ Backend OK')"
```

---

## 5. Instalación del Frontend

### 5.1 Clonar el repositorio

```bash
cd /home/ubuntu/zrn-crm
git clone https://github.com/zeron-team/zrn-crm-fe.git frontend
```

### 5.2 Instalar dependencias

```bash
cd /home/ubuntu/zrn-crm/frontend
npm install
```

#### Dependencias principales:

| Paquete | Función |
|---------|---------|
| `react` + `react-dom` | Librería UI principal |
| `react-router-dom` | Enrutamiento SPA |
| `axios` | Cliente HTTP para consumir la API |
| `recharts` | Gráficos y visualizaciones |
| `lucide-react` | Iconografía moderna |
| `i18next` + `react-i18next` | Internacionalización (ES/EN) |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag & Drop para widgets del dashboard |
| `date-fns` | Manipulación de fechas |
| `tailwindcss` | Framework CSS utility-first |
| `typescript` | Tipado estático |
| `vite` | Bundler y dev server |

### 5.3 Build de producción

```bash
cd /home/ubuntu/zrn-crm/frontend
npm run build
```

Esto genera la carpeta `dist/` con los archivos estáticos optimizados:
```
dist/
├── index.html           # Punto de entrada SPA
├── favicon.svg          # Ícono
├── vite.svg             # Ícono Vite
└── assets/
    ├── index-XXXX.js    # JavaScript minificado
    └── index-XXXX.css   # CSS minificado
```

### 5.4 Desplegar el build en el servidor web

```bash
sudo rm -rf /var/www/html/zeron-crm/*
sudo cp -r /home/ubuntu/zrn-crm/frontend/dist/* /var/www/html/zeron-crm/
sudo chown -R www-data:www-data /var/www/html/zeron-crm/
```

### 5.5 Configuración del cliente API (`src/api/client.ts`)

El frontend detecta automáticamente el entorno:

```typescript
// En producción: usa el reverse proxy de Apache en /api/v1
// En desarrollo: apunta directamente a localhost:8000
const baseURL = import.meta.env.DEV
    ? `http://${window.location.hostname || "localhost"}:8000/api/v1`
    : "/api/v1";
```

**No requiere configuración manual** para producción.

---

## 6. Configuración de Base de Datos

### 6.1 Crear usuario y base de datos en PostgreSQL

```bash
# Acceder a PostgreSQL como superusuario
sudo -u postgres psql
```

Dentro de la consola `psql`:

```sql
-- Crear usuario
CREATE USER zeron_user WITH PASSWORD 'TU_PASSWORD_SEGURA';

-- Crear base de datos
CREATE DATABASE zeron_crm OWNER zeron_user;

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON DATABASE zeron_crm TO zeron_user;

-- Salir
\q
```

### 6.2 Ejecutar migraciones con Alembic

```bash
cd /home/ubuntu/zrn-crm/backend
source venv/bin/activate
alembic upgrade head
```

Esto creará todas las tablas necesarias en la base de datos.

### 6.3 Crear el primer usuario administrador

```bash
cd /home/ubuntu/zrn-crm/backend
source venv/bin/activate
python3 -c "
from app.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

db = SessionLocal()
admin = User(
    email='admin@tudominio.com',
    full_name='Administrador',
    hashed_password=get_password_hash('TuPasswordSegura123'),
    is_active=True,
    role='admin'
)
db.add(admin)
db.commit()
print('✅ Usuario admin creado exitosamente')
db.close()
"
```

> ⚠️ Reemplaza `admin@tudominio.com` y `TuPasswordSegura123` con tus credenciales.

### 6.4 Tablas de la base de datos

El sistema utiliza las siguientes tablas:

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema (autenticación) |
| `clients` | Empresas cliente |
| `contacts` | Contactos asociados a clientes |
| `providers` | Proveedores de servicios |
| `products` | Productos/Servicios/Mano de obra |
| `families` | Familias de categorías |
| `categories` | Categorías de productos |
| `subcategories` | Subcategorías |
| `invoices` | Facturas emitidas y recibidas |
| `invoice_statuses` | Estados de facturas (personalizables) |
| `invoice_items` | Ítems de facturas |
| `quotes` | Presupuestos / Cotizaciones |
| `quote_items` | Ítems de presupuestos |
| `leads` | Leads / Prospectos |
| `calendar_events` | Eventos del calendario |
| `activity_notes` | Notas de actividad (por evento) |
| `client_services` | Servicios contratados por clientes |
| `provider_services` | Servicios contratados a proveedores |
| `service_payments` | Pagos de servicios |
| `dashboard_configs` | Configuración de widgets del dashboard (por usuario) |

---

## 7. Configuración del Servidor Web (Apache)

### 7.1 Habilitar módulos necesarios

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod headers
```

### 7.2 Crear directorio del frontend

```bash
sudo mkdir -p /var/www/html/zeron-crm
sudo chown -R www-data:www-data /var/www/html/zeron-crm
```

### 7.3 Configuración VirtualHost HTTP (puerto 80)

Crear `/etc/apache2/sites-available/zeron-crm.conf`:

```apache
<VirtualHost *:80>
    ServerAdmin admin@tudominio.com
    ServerName tudominio.com
    DocumentRoot /var/www/html/zeron-crm

    # Reverse proxy para la API
    ProxyPreserveHost On
    ProxyPass /api/v1/ http://127.0.0.1:8000/api/v1/
    ProxyPassReverse /api/v1/ http://127.0.0.1:8000/api/v1/

    # Proxy para health check
    ProxyPass /health http://127.0.0.1:8000/health
    ProxyPassReverse /health http://127.0.0.1:8000/health

    # Proxy para archivos subidos
    ProxyPass /uploads/ http://127.0.0.1:8000/uploads/
    ProxyPassReverse /uploads/ http://127.0.0.1:8000/uploads/

    # Proxy para documentación de la API (Swagger)
    ProxyPass /docs http://127.0.0.1:8000/docs
    ProxyPassReverse /docs http://127.0.0.1:8000/docs
    ProxyPass /openapi.json http://127.0.0.1:8000/openapi.json
    ProxyPassReverse /openapi.json http://127.0.0.1:8000/openapi.json

    # Archivos estáticos del frontend
    <Directory /var/www/html/zeron-crm>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        # SPA fallback: servir index.html para todas las rutas no-archivo
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/zeron_crm_error.log
    CustomLog ${APACHE_LOG_DIR}/zeron_crm_access.log combined

    # Redirección a HTTPS (descomentar después de configurar SSL)
    # RewriteCond %{SERVER_NAME} =tudominio.com
    # RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
```

### 7.4 Configuración VirtualHost HTTPS (puerto 443)

Crear `/etc/apache2/sites-available/zeron-crm-le-ssl.conf`:

```apache
<IfModule mod_ssl.c>
<VirtualHost *:443>
    ServerAdmin admin@tudominio.com
    ServerName tudominio.com
    DocumentRoot /var/www/html/zeron-crm

    # No cachear index.html para que los nuevos builds se reflejen inmediatamente
    <FilesMatch "index\.html$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>

    # Reverse proxy para la API
    ProxyPreserveHost On
    ProxyPass /api/v1/ http://127.0.0.1:8000/api/v1/
    ProxyPassReverse /api/v1/ http://127.0.0.1:8000/api/v1/

    # Proxy para health check
    ProxyPass /health http://127.0.0.1:8000/health
    ProxyPassReverse /health http://127.0.0.1:8000/health

    # Proxy para archivos subidos
    ProxyPass /uploads/ http://127.0.0.1:8000/uploads/
    ProxyPassReverse /uploads/ http://127.0.0.1:8000/uploads/

    # Proxy para documentación de la API
    ProxyPass /docs http://127.0.0.1:8000/docs
    ProxyPassReverse /docs http://127.0.0.1:8000/docs
    ProxyPass /openapi.json http://127.0.0.1:8000/openapi.json
    ProxyPassReverse /openapi.json http://127.0.0.1:8000/openapi.json

    # Archivos estáticos del frontend
    <Directory /var/www/html/zeron-crm>
        Options -Indexes +FollowSymLinks
        AllowOverride None
        Require all granted

        # SPA fallback
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/zeron_crm_error.log
    CustomLog ${APACHE_LOG_DIR}/zeron_crm_access.log combined

    SSLCertificateFile /etc/letsencrypt/live/tudominio.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/tudominio.com/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>
</IfModule>
```

### 7.5 Habilitar los sitios y reiniciar Apache

```bash
sudo a2ensite zeron-crm.conf
sudo a2ensite zeron-crm-le-ssl.conf
sudo a2dissite 000-default.conf    # Deshabilitar sitio por defecto (opcional)
sudo apache2ctl configtest         # Verificar configuración
sudo systemctl restart apache2
```

---

## 8. Servicio Systemd (Backend como servicio)

### 8.1 Crear el archivo de servicio

```bash
sudo tee /etc/systemd/system/zeron-crm-api.service > /dev/null << 'EOF'
[Unit]
Description=Zeron CRM API (FastAPI + Uvicorn)
After=network.target postgresql.service docker.service

[Service]
Type=simple
User=ubuntu
Group=ubuntu
WorkingDirectory=/home/ubuntu/zrn-crm/backend
EnvironmentFile=/home/ubuntu/zrn-crm/backend/.env
ExecStart=/home/ubuntu/zrn-crm/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

#### Parámetros del servicio:

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| `User` | `ubuntu` | Usuario del sistema que ejecuta el proceso |
| `WorkingDirectory` | `/home/ubuntu/zrn-crm/backend` | Directorio de trabajo |
| `EnvironmentFile` | `.env` | Archivo con variables de entorno |
| `ExecStart` | `uvicorn app.main:app` | Comando para iniciar la API |
| `--host` | `127.0.0.1` | Solo escucha en localhost (Apache maneja el tráfico externo) |
| `--port` | `8000` | Puerto interno de la API |
| `Restart` | `always` | Se reinicia automáticamente si se cae |
| `RestartSec` | `5` | Espera 5 segundos antes de reiniciar |

### 8.2 Habilitar e iniciar el servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable zeron-crm-api.service    # Arranque automático al boot
sudo systemctl start zeron-crm-api.service     # Iniciar ahora
```

### 8.3 Verificar el estado

```bash
sudo systemctl status zeron-crm-api.service
```

Debe mostrar: `Active: active (running)`

### 8.4 Verificar que la API responde

```bash
curl http://127.0.0.1:8000/health
# Respuesta esperada: {"status":"ok","message":"Zeron CRM API is running"}
```

---

## 9. SSL / HTTPS con Let's Encrypt

### 9.1 Obtener certificado SSL

```bash
sudo certbot --apache -d tudominio.com
```

Certbot configurará automáticamente el SSL y creará la redirección HTTP → HTTPS.

### 9.2 Renovación automática

Certbot instala un timer automático. Verificar:

```bash
sudo certbot renew --dry-run
```

---

## 10. Despliegue de Producción — Paso a Paso Completo

### Resumen ejecutivo (todos los pasos en orden)

```bash
# ═══════════════════════════════════════════════════
# PASO 1: Preparar el sistema
# ═══════════════════════════════════════════════════
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib \
    apache2 git certbot python3-certbot-apache
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# ═══════════════════════════════════════════════════
# PASO 2: Configurar PostgreSQL
# ═══════════════════════════════════════════════════
sudo -u postgres psql -c "CREATE USER zeron_user WITH PASSWORD 'TU_PASSWORD_SEGURA';"
sudo -u postgres psql -c "CREATE DATABASE zeron_crm OWNER zeron_user;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE zeron_crm TO zeron_user;"

# ═══════════════════════════════════════════════════
# PASO 3: Clonar repositorios
# ═══════════════════════════════════════════════════
mkdir -p /home/ubuntu/zrn-crm
cd /home/ubuntu/zrn-crm
git clone https://github.com/zeron-team/zrn-crm-be.git backend
git clone https://github.com/zeron-team/zrn-crm-fe.git frontend

# ═══════════════════════════════════════════════════
# PASO 4: Configurar Backend
# ═══════════════════════════════════════════════════
cd /home/ubuntu/zrn-crm/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Crear archivo .env
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://zeron_user:TU_PASSWORD_SEGURA@localhost:5432/zeron_crm
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_urlsafe(48))")
ACCESS_TOKEN_EXPIRE_MINUTES=480
ENVEOF

# Ejecutar migraciones
alembic upgrade head

# Crear usuario admin
python3 -c "
from app.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash
db = SessionLocal()
admin = User(email='admin@tudominio.com', full_name='Administrador',
    hashed_password=get_password_hash('TuPasswordSegura123'),
    is_active=True, role='admin')
db.add(admin)
db.commit()
print('✅ Usuario admin creado')
db.close()
"

deactivate  # Salir del venv

# ═══════════════════════════════════════════════════
# PASO 5: Configurar Frontend
# ═══════════════════════════════════════════════════
cd /home/ubuntu/zrn-crm/frontend
npm install
npm run build

# Desplegar build de producción
sudo mkdir -p /var/www/html/zeron-crm
sudo cp -r dist/* /var/www/html/zeron-crm/
sudo chown -R www-data:www-data /var/www/html/zeron-crm

# ═══════════════════════════════════════════════════
# PASO 6: Configurar Apache
# ═══════════════════════════════════════════════════
sudo a2enmod proxy proxy_http rewrite ssl headers

# Crear los archivos de VirtualHost (ver sección 7.3 y 7.4 de este documento)
# ...

sudo a2ensite zeron-crm.conf
sudo apache2ctl configtest
sudo systemctl restart apache2

# ═══════════════════════════════════════════════════
# PASO 7: Configurar servicio systemd
# ═══════════════════════════════════════════════════
# Crear el archivo de servicio (ver sección 8.1)
# ...

sudo systemctl daemon-reload
sudo systemctl enable zeron-crm-api.service
sudo systemctl start zeron-crm-api.service

# ═══════════════════════════════════════════════════
# PASO 8: Configurar SSL
# ═══════════════════════════════════════════════════
sudo certbot --apache -d tudominio.com

# ═══════════════════════════════════════════════════
# PASO 9: Verificar todo
# ═══════════════════════════════════════════════════
curl http://127.0.0.1:8000/health
curl -s -o /dev/null -w "%{http_code}" https://tudominio.com/
curl https://tudominio.com/api/v1/users/
sudo systemctl status zeron-crm-api.service
```

---

## 11. Estructura del Proyecto

### Backend (`zrn-crm-be`)

```
backend/
├── .env                          # Variables de entorno (NO subir a git)
├── .gitignore                    # Archivos ignorados por git
├── requirements.txt              # Dependencias Python
├── alembic.ini                   # Configuración de Alembic
├── alembic/                      # Migraciones de base de datos
│   ├── env.py                    # Entorno de Alembic
│   ├── script.py.mako            # Template para migraciones
│   └── versions/                 # Archivos de migración
│       ├── a73fdedb117b_initial_schema_users.py
│       ├── c3badb8a57f5_add_core_crm_models.py
│       ├── 850273da1825_add_lead_module.py
│       ├── 8957c3971604_add_quotes_module.py
│       └── ... (más migraciones)
├── uploads/                      # Archivos subidos
│   ├── invoices/                 # PDFs de facturas
│   └── service_payments/         # Comprobantes de pago
└── app/                          # Código fuente principal
    ├── main.py                   # Punto de entrada FastAPI
    ├── database.py               # Conexión a BD y Base declarativa
    ├── core/
    │   ├── config.py             # Configuración (Settings con Pydantic)
    │   └── security.py           # Hash passwords, JWT tokens
    ├── models/                   # Modelos SQLAlchemy (tablas)
    │   ├── __init__.py           # Exporta todos los modelos
    │   ├── user.py               # Modelo User
    │   ├── client.py             # Modelo Client
    │   ├── contact.py            # Modelo Contact
    │   ├── provider.py           # Modelo Provider
    │   ├── product.py            # Modelo Product
    │   ├── category.py           # Modelos Family, Category, Subcategory
    │   ├── invoice.py            # Modelos Invoice, InvoiceStatus
    │   ├── invoice_item.py       # Modelo InvoiceItem
    │   ├── quote.py              # Modelo Quote
    │   ├── quote_item.py         # Modelo QuoteItem
    │   ├── lead.py               # Modelo Lead
    │   ├── calendar.py           # Modelo CalendarEvent
    │   ├── activity_note.py      # Modelo ActivityNote
    │   ├── client_service.py     # Modelo ClientService
    │   ├── provider_service.py   # Modelo ProviderService
    │   ├── service_payment.py    # Modelo ServicePayment
    │   └── dashboard_config.py   # Modelo DashboardConfig
    ├── schemas/                  # Schemas Pydantic (validación)
    │   ├── user.py
    │   ├── client.py
    │   ├── contact.py
    │   ├── provider.py
    │   ├── product.py
    │   ├── category.py
    │   ├── invoice.py
    │   ├── quote.py
    │   ├── lead.py
    │   ├── calendar.py
    │   ├── client_service.py
    │   ├── provider_service.py
    │   ├── service_payment.py
    │   └── dashboard_config.py
    ├── repositories/             # Capa de acceso a datos
    │   ├── user.py
    │   ├── client.py
    │   ├── contact.py
    │   ├── provider.py
    │   ├── product.py
    │   ├── category.py
    │   ├── invoice.py
    │   ├── quote.py
    │   ├── lead.py
    │   ├── calendar.py
    │   ├── client_service.py
    │   └── activity_note.py
    ├── services/                 # Lógica de negocio
    │   ├── user.py
    │   ├── client.py
    │   ├── contact.py
    │   ├── provider.py
    │   ├── product.py
    │   ├── category.py
    │   ├── invoice.py
    │   ├── calendar.py
    │   ├── client_service.py
    │   └── activity_note.py
    └── api/                      # Capa de API (endpoints HTTP)
        ├── api.py                # Router principal (incluye todos los routers)
        └── endpoints/
            ├── auth.py           # POST /login, GET /me
            ├── users.py          # CRUD usuarios
            ├── clients.py        # CRUD clientes
            ├── contacts.py       # CRUD contactos
            ├── providers.py      # CRUD proveedores
            ├── products.py       # CRUD productos/servicios
            ├── categories.py     # CRUD familias/categorías/subcategorías
            ├── invoices.py       # CRUD facturas + estados + upload
            ├── quotes.py         # CRUD presupuestos
            ├── leads.py          # CRUD leads
            ├── calendar.py       # CRUD eventos + notas
            ├── client_services.py     # Servicios de clientes
            ├── provider_services.py   # Servicios de proveedores
            ├── service_payments.py    # Pagos de servicios
            └── dashboard_config.py    # Config dashboard por usuario
```

### Frontend (`zrn-crm-fe`)

```
frontend/
├── .gitignore
├── package.json                  # Dependencias y scripts
├── package-lock.json             # Lock de dependencias
├── tsconfig.json                 # Configuración TypeScript base
├── tsconfig.app.json             # Configuración TypeScript para app
├── tsconfig.node.json            # Configuración TypeScript para Node
├── vite.config.ts                # Configuración de Vite
├── tailwind.config.js            # Configuración de TailwindCSS
├── postcss.config.js             # Configuración de PostCSS
├── eslint.config.js              # Configuración de ESLint
├── index.html                    # HTML raíz
├── public/                       # Archivos estáticos públicos
│   └── vite.svg
└── src/                          # Código fuente
    ├── main.tsx                  # Entry point React
    ├── App.tsx                   # Router principal y rutas
    ├── App.css                   # Estilos globales adicionales
    ├── index.css                 # Estilos base + TailwindCSS
    ├── i18n.ts                   # Configuración de internacionalización
    ├── api/
    │   └── client.ts             # Cliente Axios (config API URL)
    ├── context/
    │   └── AuthContext.tsx        # Contexto de autenticación (JWT)
    ├── components/
    │   ├── Layout.tsx             # Layout principal (sidebar + contenido)
    │   ├── ProtectedRoute.tsx     # Ruta protegida (requiere auth)
    │   ├── SidebarItem.tsx        # Ítem del sidebar
    │   ├── ClientServicesModal.tsx # Modal servicios de cliente
    │   ├── ProviderServicesModal.tsx# Modal servicios de proveedor
    │   ├── DashboardCustomizer.tsx # Personalizar widgets del dashboard
    │   ├── HelpManual.tsx         # Manual de ayuda
    │   └── NotificationBell.tsx   # Campana de notificaciones
    ├── pages/
    │   ├── Login.tsx              # Página de login
    │   ├── Dashboard.tsx          # Dashboard con KPIs, gráficos, drag&drop
    │   ├── Users.tsx              # Gestión de usuarios
    │   ├── Leads.tsx              # Gestión de leads/prospectos
    │   ├── LeadProfile.tsx        # Perfil detallado de lead
    │   ├── Clients.tsx            # Gestión de clientes
    │   ├── ClientProfile.tsx      # Perfil detallado de cliente
    │   ├── Contacts.tsx           # Gestión de contactos
    │   ├── Products.tsx           # Productos/Servicios/Mano de obra
    │   ├── Categories.tsx         # Familias/Categorías/Subcategorías
    │   ├── Providers.tsx          # Gestión de proveedores
    │   ├── Quotes.tsx             # Presupuestos/Cotizaciones
    │   ├── Billing.tsx            # Facturación (emitidas/recibidas)
    │   ├── Finances.tsx           # Finanzas y reportes
    │   ├── Calendar.tsx           # Calendario con notas y estados
    │   └── Settings.tsx           # Configuración del sistema
    ├── locales/
    │   ├── en.json                # Traducciones inglés
    │   └── es.json                # Traducciones español
    └── assets/
        └── react.svg              # Logo React
```

---

## 12. Módulos y Funcionalidades

### 12.1 Autenticación
- Login con email + password
- Tokens JWT con expiración configurable (default: 8 horas)
- Roles: `admin`, `user`
- Rutas protegidas en frontend y backend

### 12.2 Dashboard
- KPIs dinámicos personalizables por usuario
- Widgets arrastrables (drag & drop)
- Gráficos de ingresos vs gastos (últimos 6 meses)
- Distribución de cashflow
- Costos de servicios por proveedor
- Estado de facturas

### 12.3 Leads (Prospectos)
- Estados: `New`, `Contacted`, `Qualified`, `Converted`, `Lost`
- Campos: empresa, contacto, email, teléfono, web, dirección, fuente, notas
- Perfil detallado con historial

### 12.4 Clientes
- Datos fiscales: CUIT/DNI, condición tributaria
- Nombre legal y nombre comercial
- Dirección completa (calle, ciudad, provincia, país)
- Perfil con contactos, servicios e historial
- Estado activo/inactivo

### 12.5 Contactos
- Asociados a un cliente
- Nombre, email, teléfono, cargo

### 12.6 Proveedores
- Nombre, email, teléfono, dirección, web
- Servicios contratados con costos y ciclos de facturación

### 12.7 Productos/Servicios
- Tipos: Producto, Servicio, Mano de Obra
- Clasificación jerárquica: Familia → Categoría → Subcategoría
- Precio con moneda (ARS, USD, EUR)
- Búsqueda, filtros y ordenamiento

### 12.8 Categorías
- Árbol jerárquico: Familias → Categorías → Subcategorías
- CRUD completo con códigos
- Búsqueda y filtrado

### 12.9 Presupuestos (Quotes)
- Número de presupuesto
- Cliente asociado
- Ítems con productos, cantidades y precios
- Estados y moneda

### 12.10 Facturación (Billing)
- Facturas emitidas (a clientes) y recibidas (de proveedores)
- Estados personalizables con colores
- Ítems de factura vinculados a productos
- Adjuntar archivos PDF
- KPIs: Balance, Cobrado, Pendiente de cobro, Pagado, Pendiente de pago
- Gráfico de revenue timeline por cliente

### 12.11 Finanzas
- Reportes financieros consolidados
- Visualización de ingresos y gastos

### 12.12 Calendario
- Vista lista y vista mensual
- Eventos con colores, estados y notas
- Estados: Pendiente, Completado, Pospuesto, Cancelado
- Follow-ups automáticos
- Generación automática de facturas desde eventos de billing
- Filtros por tipo y estado
- Creación rápida de contactos

### 12.13 Servicios de Proveedores
- Nombre, estado (Active/Inactive/Cancelled)
- Precios de costo y venta
- Ciclo de facturación (Mensual, Bimensual, Anual, Único)
- Moneda y fecha de expiración
- Pagos registrados

### 12.14 Configuración
- Cambio de idioma (Español/Inglés)
- Configuración de tasas de cambio USD/EUR
- Gestión de perfil de usuario

---

## 13. API Endpoints

Base URL: `/api/v1`

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/login` | Iniciar sesión |
| `GET` | `/auth/me` | Obtener usuario actual |

### Usuarios
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/users/` | Listar usuarios |
| `POST` | `/users/` | Crear usuario |
| `PUT` | `/users/{id}` | Actualizar usuario |
| `DELETE` | `/users/{id}` | Eliminar usuario |

### Clientes
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/clients/` | Listar clientes |
| `POST` | `/clients/` | Crear cliente |
| `GET` | `/clients/{id}` | Obtener cliente |
| `PUT` | `/clients/{id}` | Actualizar cliente |
| `DELETE` | `/clients/{id}` | Eliminar cliente |

### Contactos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/contacts/` | Listar contactos |
| `POST` | `/contacts/` | Crear contacto |
| `PUT` | `/contacts/{id}` | Actualizar contacto |
| `DELETE` | `/contacts/{id}` | Eliminar contacto |

### Proveedores
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/providers/` | Listar proveedores |
| `POST` | `/providers/` | Crear proveedor |
| `PUT` | `/providers/{id}` | Actualizar proveedor |
| `DELETE` | `/providers/{id}` | Eliminar proveedor |

### Productos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/products/` | Listar productos |
| `POST` | `/products/` | Crear producto |
| `PUT` | `/products/{id}` | Actualizar producto |
| `DELETE` | `/products/{id}` | Eliminar producto |

### Categorías
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/categories/` | Listar categorías |
| `GET` | `/categories/tree` | Árbol completo (Familia → Cat → Sub) |
| `POST` | `/categories/` | Crear categoría |
| `PUT` | `/categories/{id}` | Actualizar categoría |
| `DELETE` | `/categories/{id}` | Eliminar categoría |

### Facturas
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/invoices/` | Listar facturas |
| `POST` | `/invoices/` | Crear factura |
| `PUT` | `/invoices/{id}` | Actualizar factura |
| `DELETE` | `/invoices/{id}` | Eliminar factura |
| `POST` | `/invoices/{id}/upload` | Subir archivo PDF |
| `GET` | `/invoices/statuses` | Listar estados |
| `POST` | `/invoices/statuses/` | Crear estado |
| `PUT` | `/invoices/statuses/{id}` | Actualizar estado |
| `DELETE` | `/invoices/statuses/{id}` | Eliminar estado |

### Presupuestos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/quotes/` | Listar presupuestos |
| `POST` | `/quotes/` | Crear presupuesto |
| `PUT` | `/quotes/{id}` | Actualizar presupuesto |
| `DELETE` | `/quotes/{id}` | Eliminar presupuesto |

### Leads
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/leads/` | Listar leads |
| `POST` | `/leads/` | Crear lead |
| `GET` | `/leads/{id}` | Obtener lead |
| `PUT` | `/leads/{id}` | Actualizar lead |
| `DELETE` | `/leads/{id}` | Eliminar lead |

### Calendario
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/calendar/` | Listar eventos |
| `POST` | `/calendar/` | Crear evento |
| `PUT` | `/calendar/{id}` | Actualizar evento |
| `DELETE` | `/calendar/{id}` | Eliminar evento |
| `POST` | `/calendar/{id}/notes` | Agregar nota |
| `PUT` | `/calendar/{id}/notes/{noteId}` | Editar nota |
| `DELETE` | `/calendar/{id}/notes/{noteId}` | Eliminar nota |

### Servicios
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/provider-services/` | Listar servicios de proveedores |
| `POST` | `/provider-services/` | Crear servicio |
| `PUT` | `/provider-services/{id}` | Actualizar servicio |
| `DELETE` | `/provider-services/{id}` | Eliminar servicio |
| `GET` | `/client-services/` | Listar servicios de clientes |

### Dashboard
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/dashboard-config/{userId}` | Obtener config de widgets |
| `PUT` | `/dashboard-config/{userId}` | Guardar config de widgets |

### Health Check
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Estado del servidor |

### Documentación interactiva
- **Swagger UI**: `https://tudominio.com/docs`
- **OpenAPI JSON**: `https://tudominio.com/openapi.json`

---

## 14. Internacionalización (i18n)

El sistema soporta **Español** e **Inglés** completamente.

- Idioma por defecto: **Español**
- El usuario puede cambiar el idioma desde **Settings**
- La preferencia se guarda en `localStorage`
- Archivos de traducción: `src/locales/en.json` y `src/locales/es.json`

---

## 15. Variables de Entorno

### Backend (`.env`)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/zeron_crm` |
| `SECRET_KEY` | Clave secreta para firmar JWT | `clave-random-segura-base64` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Duración del token JWT (minutos) | `480` (8 horas) |

### Frontend

No requiere variables de entorno. La URL de la API se determina automáticamente:
- **Producción**: `/api/v1` (reverse proxy Apache)
- **Desarrollo**: `http://localhost:8000/api/v1`

---

## 16. Comandos Útiles

### Backend

```bash
# Iniciar en modo desarrollo
cd /home/ubuntu/zrn-crm/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Crear una nueva migración
alembic revision --autogenerate -m "descripción del cambio"

# Aplicar migraciones pendientes
alembic upgrade head

# Revertir última migración
alembic downgrade -1

# Ver historial de migraciones
alembic history

# Ver status de migraciones
alembic current
```

### Frontend

```bash
# Iniciar en modo desarrollo
cd /home/ubuntu/zrn-crm/frontend
npm run dev

# Build de producción
npm run build

# Preview del build
npm run preview

# Lint del código
npm run lint
```

### Servicios del sistema

```bash
# Backend API
sudo systemctl start zeron-crm-api      # Iniciar
sudo systemctl stop zeron-crm-api       # Detener
sudo systemctl restart zeron-crm-api    # Reiniciar
sudo systemctl status zeron-crm-api     # Ver estado
sudo journalctl -u zeron-crm-api -f     # Ver logs en tiempo real

# Apache
sudo systemctl restart apache2
sudo apache2ctl configtest              # Verificar config
sudo tail -f /var/log/apache2/zeron_crm_error.log    # Ver error log
sudo tail -f /var/log/apache2/zeron_crm_access.log   # Ver access log

# PostgreSQL
sudo systemctl status postgresql
sudo -u postgres psql -d zeron_crm      # Conectar a la BD
```

### Despliegue rápido (actualizar frontend)

```bash
cd /home/ubuntu/zrn-crm/frontend
git pull
npm install
npm run build
sudo rm -rf /var/www/html/zeron-crm/*
sudo cp -r dist/* /var/www/html/zeron-crm/
```

### Despliegue rápido (actualizar backend)

```bash
cd /home/ubuntu/zrn-crm/backend
git pull
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
deactivate
sudo systemctl restart zeron-crm-api
```

---

## 17. Solución de Problemas

### El backend no inicia
```bash
# Ver logs detallados
sudo journalctl -u zeron-crm-api -n 50 --no-pager

# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql

# Probar la conexión manualmente
cd /home/ubuntu/zrn-crm/backend
source venv/bin/activate
python3 -c "from app.database import engine; engine.connect(); print('✅ DB OK')"
```

### Error 502 Bad Gateway
```bash
# El backend no está corriendo
sudo systemctl start zeron-crm-api

# Verificar que escucha en el puerto 8000
curl http://127.0.0.1:8000/health
```

### El frontend muestra página en blanco
```bash
# Verificar que el build existe
ls /var/www/html/zeron-crm/

# Verificar permisos
ls -la /var/www/html/zeron-crm/

# Re-desplegar
cd /home/ubuntu/zrn-crm/frontend
npm run build
sudo cp -r dist/* /var/www/html/zeron-crm/
```

### Error de CORS
Si estás en desarrollo local, el backend permite CORS desde todos los orígenes (`allow_origins=["*"]`). Para producción, esto se maneja con el reverse proxy de Apache.

### Migraciones fallidas
```bash
# Ver el estado actual
alembic current

# Forzar a un estado específico
alembic stamp head

# Generar nueva migración
alembic revision --autogenerate -m "fix migration"
alembic upgrade head
```

---

> 📝 **Nota:** Este documento cubre la instalación completa del sistema Zeron CRM. Para preguntas o soporte, contacta al equipo de Zeron en el repositorio de GitHub.
