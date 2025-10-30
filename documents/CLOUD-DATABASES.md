# ☁️ Bases de Datos en la Nube - Universal Backup Microservice

Guía completa para conectar el microservicio con bases de datos PostgreSQL en la nube.

## 🌐 Proveedores Soportados

- ✅ AWS RDS (Amazon)
- ✅ Google Cloud SQL
- ✅ Azure Database for PostgreSQL
- ✅ Heroku Postgres
- ✅ DigitalOcean Managed Databases
- ✅ Cualquier PostgreSQL accesible por red

---

## 🔧 AWS RDS (Amazon)

### Configuración

```json
{
  "dbConfig": {
    "host": "mydb.abc123.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "database": "production_db",
    "username": "admin",
    "password": "secure_password",
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    }
  }
}
```

### Obtener Endpoint

1. AWS Console → RDS → Databases
2. Seleccionar tu instancia
3. Copiar "Endpoint" (ej: `mydb.abc123.us-east-1.rds.amazonaws.com`)

### Security Groups

**Configurar acceso:**
1. RDS → Security Groups
2. Agregar regla Inbound:
   - Type: PostgreSQL
   - Port: 5432
   - Source: IP del microservicio o `0.0.0.0/0` (testing)

### SSL/TLS

AWS RDS requiere SSL por defecto:
```json
{
  "dialectOptions": {
    "ssl": {
      "require": true,
      "rejectUnauthorized": false
    }
  }
}
```

### Mejores Prácticas

- ✅ Usar IAM authentication cuando sea posible
- ✅ Restringir Security Groups a IPs específicas
- ✅ Habilitar backups automáticos de RDS
- ✅ Usar read replicas para backups sin impacto

---

## 🔧 Google Cloud SQL

### Configuración

```json
{
  "dbConfig": {
    "host": "35.123.456.789",
    "port": 5432,
    "database": "production_db",
    "username": "postgres",
    "password": "secure_password",
    "dialectOptions": {
      "ssl": {
        "require": true
      }
    }
  }
}
```

### Obtener IP Pública

1. Google Cloud Console → SQL
2. Seleccionar instancia
3. Copiar "Public IP address"

### Autorizar Red

**Configurar acceso:**
1. SQL → Connections → Networking
2. Add network:
   - Name: `backup-microservice`
   - Network: IP del microservicio
3. Save

### Cloud SQL Proxy (Alternativa)

Para conexiones más seguras:
```bash
# Instalar Cloud SQL Proxy
./cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432

# Conectar a localhost
{
  "host": "localhost",
  "port": 5432
}
```

### Mejores Prácticas

- ✅ Usar Cloud SQL Proxy en producción
- ✅ Habilitar SSL/TLS
- ✅ Configurar authorized networks específicas
- ✅ Usar service accounts con permisos mínimos

---

## 🔧 Azure Database for PostgreSQL

### Configuración

```json
{
  "dbConfig": {
    "host": "myserver.postgres.database.azure.com",
    "port": 5432,
    "database": "production_db",
    "username": "admin@myserver",
    "password": "secure_password",
    "dialectOptions": {
      "ssl": {
        "require": true
      }
    }
  }
}
```

### Formato de Username

⚠️ **Importante**: Azure requiere formato `username@servername`

```json
{
  "username": "admin@myserver"
}
```

### Firewall Rules

**Configurar acceso:**
1. Azure Portal → PostgreSQL servers
2. Connection security
3. Add client IP:
   - Name: `backup-microservice`
   - Start IP: IP del microservicio
   - End IP: IP del microservicio
4. Save

### SSL Enforcement

Azure requiere SSL por defecto:
```json
{
  "dialectOptions": {
    "ssl": {
      "require": true,
      "rejectUnauthorized": true,
      "ca": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
    }
  }
}
```

### Mejores Prácticas

- ✅ Descargar certificado SSL de Azure
- ✅ Usar Azure AD authentication
- ✅ Configurar firewall rules específicas
- ✅ Habilitar threat detection

---

## 🔧 Heroku Postgres

### Configuración

```json
{
  "dbConfig": {
    "host": "ec2-xxx-xxx-xxx-xxx.compute-1.amazonaws.com",
    "port": 5432,
    "database": "d1234567890abc",
    "username": "user",
    "password": "password",
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    }
  }
}
```

### Obtener Credenciales

**Opción 1: Heroku CLI**
```bash
heroku pg:credentials:url DATABASE_URL --app your-app
```

**Opción 2: Dashboard**
1. Heroku Dashboard → App → Resources
2. Click en Heroku Postgres
3. Settings → Database Credentials

### Connection String

Heroku proporciona DATABASE_URL:
```
postgres://user:password@host:5432/database
```

Parsear a objeto:
```javascript
const url = new URL(process.env.DATABASE_URL);
const dbConfig = {
  host: url.hostname,
  port: url.port,
  database: url.pathname.slice(1),
  username: url.username,
  password: url.password,
  dialectOptions: {
    ssl: { require: true, rejectUnauthorized: false }
  }
};
```

### Mejores Prácticas

- ✅ Usar DATABASE_URL environment variable
- ✅ SSL siempre requerido
- ✅ Considerar plan con backups automáticos
- ✅ Monitorear connection limits

---

## 🔧 DigitalOcean Managed Databases

### Configuración

```json
{
  "dbConfig": {
    "host": "db-postgresql-nyc3-12345.ondigitalocean.com",
    "port": 25060,
    "database": "defaultdb",
    "username": "doadmin",
    "password": "secure_password",
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": true,
        "ca": "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----"
      }
    }
  }
}
```

### Obtener Credenciales

1. DigitalOcean → Databases
2. Seleccionar cluster
3. Connection Details → Connection Parameters

### Trusted Sources

**Configurar acceso:**
1. Databases → Settings → Trusted Sources
2. Add trusted source:
   - IP del microservicio
3. Save

### SSL Certificate

Descargar certificado CA:
```bash
curl -o ca-certificate.crt https://raw.githubusercontent.com/digitalocean/do-managed-databases-ca-certificates/main/ca-certificate.crt
```

### Mejores Prácticas

- ✅ Usar certificado CA oficial
- ✅ Configurar trusted sources específicas
- ✅ Habilitar automatic backups
- ✅ Usar connection pooling

---

## 🔒 Seguridad General

### SSL/TLS

**Configuración recomendada:**
```json
{
  "dialectOptions": {
    "ssl": {
      "require": true,
      "rejectUnauthorized": true,
      "ca": "path/to/ca-certificate.crt"
    }
  }
}
```

**Para testing (no producción):**
```json
{
  "dialectOptions": {
    "ssl": {
      "require": true,
      "rejectUnauthorized": false
    }
  }
}
```

### Credenciales

**Variables de Entorno:**
```env
DB_HOST=mydb.abc123.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=production_db
DB_USER=admin
DB_PASSWORD=secure_password
```

**Uso en código:**
```javascript
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
};
```

### Firewall/Security Groups

**Configuración mínima:**
- Permitir solo IP del microservicio
- Puerto 5432 (PostgreSQL)
- Protocolo TCP

**Configuración recomendada:**
- VPN o VPC peering
- Private networking
- Bastion hosts

---

## 🌍 Consideraciones de Red

### Latencia

**Recomendaciones:**
- Desplegar microservicio en misma región que BD
- Usar conexiones persistentes
- Configurar timeouts apropiados

### Ancho de Banda

**Optimizaciones:**
- Usar chunking para tablas grandes
- Programar backups en horarios de baja actividad
- Comprimir backups antes de transferir

### Connection Pooling

```json
{
  "pool": {
    "max": 5,
    "min": 0,
    "acquire": 30000,
    "idle": 10000
  }
}
```

---

## 📊 Performance

### Backups de Producción

**Mejores prácticas:**
1. Usar read replicas cuando sea posible
2. Programar en horarios de baja actividad
3. Monitorear impacto en performance
4. Configurar timeouts apropiados

### Tablas Grandes

**Estrategias:**
- Aumentar `chunkSize` para reducir queries
- Usar índices apropiados
- Considerar backup incremental
- Paralelizar extracción si es posible

---

## 🔧 Troubleshooting

### Error: Connection Timeout

**Solución:**
- Verificar firewall/security groups
- Confirmar IP del microservicio
- Aumentar timeout en configuración

### Error: SSL Required

**Solución:**
```json
{
  "dialectOptions": {
    "ssl": {
      "require": true,
      "rejectUnauthorized": false
    }
  }
}
```

### Error: Authentication Failed

**Solución:**
- Verificar username/password
- Confirmar formato de username (Azure: `user@server`)
- Verificar permisos de usuario

### Error: Database Not Found

**Solución:**
- Verificar nombre exacto de base de datos
- Confirmar permisos de acceso
- Verificar que BD existe

---

## 📝 Checklist de Configuración

- [ ] Obtener endpoint/host de la BD
- [ ] Configurar firewall/security groups
- [ ] Habilitar SSL/TLS si es requerido
- [ ] Obtener credenciales correctas
- [ ] Verificar formato de username (Azure)
- [ ] Probar conexión con endpoint `/api/backup/analyze`
- [ ] Configurar variables de entorno
- [ ] Documentar configuración

---

## 🔗 Recursos

- [API Endpoints](API-ENDPOINTS.md)
- [Características Avanzadas](ADVANCED-FEATURES.md)
- [Arquitectura](ARCHITECTURE.md)
