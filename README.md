# 🔄 Universal Backup Microservice

Microservicio universal de backup y análisis de bases de datos Sequelize para cualquier proyecto.

## 🎯 Características

- ✅ **Análisis Automático** - Inspecciona estructura de BD y modelos
- ✅ **Resolución de Dependencias** - Ordena modelos según claves foráneas
- ✅ **Backup Universal** - Funciona con cualquier BD Sequelize
- ✅ **Multi-Formato** - Genera seeders, JSON o SQL
- ✅ **API REST** - Endpoints para análisis y extracción
- ✅ **Multi-Servicio** - Gestiona múltiples bases de datos
- ✅ **Local y Nube** - Soporta bases de datos locales y en la nube

## 🚀 Instalación

```bash
cd backup-microservice
npm install
```

## ⚙️ Configuración

### 1. Variables de Entorno

Copiar `.env.example` a `.env`:

```env
PORT=4000
BACKUP_DIR=./backups
```

### 2. Configurar Servicios

Editar `config/services.json`:

```json
{
  "services": [
    {
      "name": "my-backend",
      "database": {
        "host": "localhost",
        "port": 5432,
        "database": "my_database",
        "username": "postgres",
        "password": "password"
      }
    }
  ]
}
```

## 🎮 Uso

### Iniciar Microservicio

```bash
npm start
# o en desarrollo
npm run dev
```

El servidor estará disponible en `http://localhost:4000`

### API Endpoints

#### 1. Analizar Base de Datos

```bash
POST http://localhost:4000/api/backup/analyze
Content-Type: application/json

{
  "dbConfig": {
    "host": "localhost",
    "port": 5432,
    "database": "your_database",
    "username": "postgres",
    "password": "password"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "database": "your_database",
  "report": {
    "totalModels": 15,
    "totalRecords": 1000
  },
  "order": ["Role", "User", "Post", ...],
  "entitiesOrder": {
    "Role": {
      "timestamp": "20250128120000",
      "tableName": "roles",
      "description": "Role"
    }
  }
}
```

#### 2. Extraer Backup

```bash
POST http://localhost:4000/api/backup/extract
Content-Type: application/json

{
  "dbConfig": {
    "host": "localhost",
    "port": 5432,
    "database": "your_database",
    "username": "postgres",
    "password": "password"
  },
  "options": {
    "chunkSize": 300,
    "format": "seeders"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "database": "your_database",
  "backupId": "backup-20250128-143022",
  "files": 20,
  "records": 1000,
  "path": "./backups/backup-20250128-143022"
}
```

#### 3. Listar Backups

```bash
GET http://localhost:4000/api/backup/list
```

**Respuesta:**
```json
{
  "success": true,
  "backupsByDatabase": {
    "my_database": [
      {
        "id": "backup-20250128-143022",
        "timestamp": "2025-01-28T14:30:22.000Z",
        "records": 1000,
        "files": 20
      }
    ],
    "another_database": [
      {
        "id": "backup-20250128-160000",
        "timestamp": "2025-01-28T16:00:00.000Z",
        "records": 500,
        "files": 10
      }
    ]
  }
}
```

## 📊 Flujo de Trabajo

### 1. Análisis de Base de Datos

```bash
# Analizar estructura
curl -X POST http://localhost:4000/api/backup/analyze \
  -H "Content-Type: application/json" \
  -d '{"dbConfig": {...}}'
```

### 2. Generar Backup

```bash
# Extraer datos
curl -X POST http://localhost:4000/api/backup/extract \
  -H "Content-Type: application/json" \
  -d '{"dbConfig": {...}}'
```

### 3. Usar Seeders Generados

Los seeders se generan en `./backups/backup-YYYYMMDD-HHMMSS/`

```bash
# Copiar seeders al proyecto
cp backups/my_database/backup-20250128-143022/*.cjs ../your-project/src/database/seeders/

# Ejecutar seeders
cd ../your-project
npm run seeders
```

## 🔧 Características Avanzadas

### Análisis Automático

El microservicio:
- Detecta todos los modelos automáticamente
- Identifica claves foráneas y dependencias
- Genera orden de extracción correcto
- Crea timestamps únicos para cada modelo

### Resolución de Dependencias

Usa ordenamiento topológico para:
- Evitar errores de claves foráneas
- Garantizar orden correcto de inserción
- Detectar dependencias circulares

### Multi-Servicio

Puede gestionar múltiples bases de datos:
- Cualquier backend Sequelize
- Múltiples microservicios
- Bases de datos de desarrollo/producción

## 📁 Estructura de Backups

Los backups se organizan por nombre de base de datos:

```
backups/
├── my_database/
│   ├── backup-20250128-143022/
│   │   ├── metadata.json
│   │   ├── 20250128120000-roles.cjs
│   │   ├── 20250128120001-users-part-1.cjs
│   │   └── ...
│   └── backup-20250128-150000/
│       └── ...
└── another_database/
    └── backup-20250128-160000/
        └── ...
```

## 🎯 Casos de Uso

1. **Backup Automático** - Programar backups diarios
2. **Migración de Datos** - Entre entornos
3. **Disaster Recovery** - Restore rápido
4. **Análisis de Estructura** - Documentar BD
5. **Datos de Prueba** - Generar datasets

## 🔒 Seguridad

- No almacena credenciales
- Conexiones temporales
- Backups locales
- Sin acceso externo por defecto

## 🌐 Bases de Datos Soportadas

El microservicio funciona con cualquier base de datos PostgreSQL accesible por red:

### Local
```json
{
  "host": "localhost",
  "port": 5432,
  "database": "my_database",
  "username": "postgres",
  "password": "password"
}
```

### AWS RDS
```json
{
  "host": "mydb.abc123.us-east-1.rds.amazonaws.com",
  "port": 5432,
  "database": "production_db",
  "username": "admin",
  "password": "secure_password"
}
```

### Google Cloud SQL
```json
{
  "host": "35.123.456.789",
  "port": 5432,
  "database": "production_db",
  "username": "postgres",
  "password": "password"
}
```

### Azure Database
```json
{
  "host": "myserver.postgres.database.azure.com",
  "port": 5432,
  "database": "production_db",
  "username": "admin@myserver",
  "password": "password"
}
```

### Heroku Postgres
```json
{
  "host": "ec2-xxx.compute-1.amazonaws.com",
  "port": 5432,
  "database": "d1234567890abc",
  "username": "user",
  "password": "password"
}
```

### Consideraciones de Producción

**Seguridad:**
- El microservicio se conecta remotamente usando credenciales
- No almacena credenciales (solo en memoria durante la conexión)
- Soporta conexiones SSL si la BD lo requiere

**Red:**
- Requiere acceso de red a la BD (configurar firewall/security groups)
- El microservicio debe poder alcanzar el host de la BD
- Puertos deben estar abiertos para conexiones entrantes

**Performance:**
- La extracción puede ser lenta con BDs grandes en la nube
- Depende del ancho de banda de red
- Recomendado: desplegar el microservicio en la misma región que la BD

## 📝 Notas

- Compatible con PostgreSQL (local y nube)
- Requiere Sequelize en servicios objetivo
- Genera seeders con formato seguro
- Fragmentación automática en chunks de 300
- Funciona con cualquier BD accesible por red

## 🚀 Próximas Características

- [ ] Anonimización de datos
- [ ] Compresión de backups
- [ ] Programación de backups (cron)
- [ ] Dashboard web
- [ ] Soporte para MySQL
- [ ] Restore automático

---

**Microservicio universal para cualquier proyecto Sequelize**
