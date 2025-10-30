# 📚 Ejemplos de Uso - Universal Backup Microservice

Ejemplos prácticos y casos de uso reales del microservicio.

## 📋 Índice

1. [Casos Básicos](#-casos-básicos)
2. [Casos Avanzados](#-casos-avanzados)
3. [Integración con CI/CD](#-integración-con-cicd)
4. [Scripts de Automatización](#-scripts-de-automatización)
5. [Casos de Uso Reales](#-casos-de-uso-reales)

---

## 🎯 Casos Básicos

### 1. Primer Backup de Base de Datos Local

```bash
# 1. Analizar estructura
curl -X POST http://localhost:4000/api/backup/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "dbConfig": {
      "host": "localhost",
      "port": 5432,
      "database": "my_app_dev",
      "username": "postgres",
      "password": "postgres"
    }
  }'

# 2. Extraer backup
curl -X POST http://localhost:4000/api/backup/extract \
  -H "Content-Type: application/json" \
  -d '{
    "dbConfig": {
      "host": "localhost",
      "port": 5432,
      "database": "my_app_dev",
      "username": "postgres",
      "password": "postgres"
    },
    "options": {
      "chunkSize": 300,
      "format": "seeders"
    }
  }'

# 3. Listar backups
curl http://localhost:4000/api/backup/list
```

---

### 2. Backup de Producción en AWS RDS

```bash
curl -X POST http://localhost:4000/api/backup/extract \
  -H "Content-Type: application/json" \
  -d '{
    "dbConfig": {
      "host": "myapp.abc123.us-east-1.rds.amazonaws.com",
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
    },
    "options": {
      "chunkSize": 500,
      "format": "seeders"
    }
  }'
```

---

### 3. Usar Seeders Generados

```bash
# 1. Copiar seeders al proyecto
cp backups/my_database/backup-20250128-143022/*.cjs \
   ../my-project/src/database/seeders/

# 2. Ejecutar seeders
cd ../my-project
npx sequelize-cli db:seed:all

# 3. Rollback si es necesario
npx sequelize-cli db:seed:undo:all
```

---

## 🚀 Casos Avanzados

### 1. Backup Diario Automático con Retención

```bash
# Programar backup diario a las 2 AM, retención de 7 días
curl -X POST http://localhost:4000/api/advanced/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "dbConfig": {
      "host": "localhost",
      "port": 5432,
      "database": "my_app_prod",
      "username": "postgres",
      "password": "postgres"
    },
    "schedule": "0 2 * * *",
    "retentionDays": 7,
    "options": {
      "chunkSize": 300,
      "format": "seeders"
    }
  }'
```

---

### 2. Backup con Upload Automático a S3

```bash
# 1. Extraer backup
BACKUP_ID=$(curl -X POST http://localhost:4000/api/backup/extract \
  -H "Content-Type: application/json" \
  -d '{
    "dbConfig": {...},
    "options": {"format": "seeders"}
  }' | jq -r '.backupId')

# 2. Subir a S3
curl -X POST http://localhost:4000/api/advanced/upload-s3 \
  -H "Content-Type: application/json" \
  -d "{
    \"database\": \"my_database\",
    \"backupId\": \"$BACKUP_ID\",
    \"s3Config\": {
      \"bucket\": \"my-backups\",
      \"region\": \"us-east-1\"
    }
  }"
```

---

### 3. Comparar Backups para Auditoría

```bash
# Comparar último backup con anterior
curl -X POST http://localhost:4000/api/advanced/compare \
  -H "Content-Type: application/json" \
  -d '{
    "database": "my_database",
    "backupId1": "backup-20250128-143022",
    "backupId2": "backup-20250128-150000"
  }'
```

---

### 4. Monitoreo con Métricas

```bash
# Obtener métricas completas
curl http://localhost:4000/api/advanced/metrics | jq

# Filtrar solo backups
curl http://localhost:4000/api/advanced/metrics | jq '.metrics.backups'

# Verificar espacio disponible
curl http://localhost:4000/api/advanced/metrics | jq '.metrics.storage'
```

---

## 🔄 Integración con CI/CD

### GitHub Actions

```yaml
# .github/workflows/backup.yml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Diario a las 2 AM
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Backup
        run: |
          curl -X POST ${{ secrets.BACKUP_SERVICE_URL }}/api/backup/extract \
            -H "Content-Type: application/json" \
            -d '{
              "dbConfig": {
                "host": "${{ secrets.DB_HOST }}",
                "port": 5432,
                "database": "${{ secrets.DB_NAME }}",
                "username": "${{ secrets.DB_USER }}",
                "password": "${{ secrets.DB_PASSWORD }}"
              }
            }'
      
      - name: Upload to S3
        run: |
          BACKUP_ID=$(curl http://${{ secrets.BACKUP_SERVICE_URL }}/api/backup/list | \
            jq -r '.backupsByDatabase["${{ secrets.DB_NAME }}"][0].id')
          
          curl -X POST ${{ secrets.BACKUP_SERVICE_URL }}/api/advanced/upload-s3 \
            -H "Content-Type: application/json" \
            -d "{
              \"database\": \"${{ secrets.DB_NAME }}\",
              \"backupId\": \"$BACKUP_ID\",
              \"s3Config\": {
                \"bucket\": \"${{ secrets.S3_BUCKET }}\",
                \"region\": \"us-east-1\"
              }
            }"
```

---

### GitLab CI

```yaml
# .gitlab-ci.yml
backup:
  stage: backup
  only:
    - schedules
  script:
    - |
      curl -X POST $BACKUP_SERVICE_URL/api/backup/extract \
        -H "Content-Type: application/json" \
        -d "{
          \"dbConfig\": {
            \"host\": \"$DB_HOST\",
            \"port\": 5432,
            \"database\": \"$DB_NAME\",
            \"username\": \"$DB_USER\",
            \"password\": \"$DB_PASSWORD\"
          }
        }"
```

---

## 📜 Scripts de Automatización

### Script Bash: Backup Completo

```bash
#!/bin/bash
# backup-full.sh

BACKUP_URL="http://localhost:4000"
DB_NAME="my_database"

echo "🔍 Analizando base de datos..."
curl -X POST $BACKUP_URL/api/backup/analyze \
  -H "Content-Type: application/json" \
  -d @db-config.json

echo "💾 Extrayendo backup..."
RESPONSE=$(curl -s -X POST $BACKUP_URL/api/backup/extract \
  -H "Content-Type: application/json" \
  -d @db-config.json)

BACKUP_ID=$(echo $RESPONSE | jq -r '.backupId')
echo "✅ Backup creado: $BACKUP_ID"

echo "☁️  Subiendo a S3..."
curl -X POST $BACKUP_URL/api/advanced/upload-s3 \
  -H "Content-Type: application/json" \
  -d "{
    \"database\": \"$DB_NAME\",
    \"backupId\": \"$BACKUP_ID\",
    \"s3Config\": {
      \"bucket\": \"my-backups\",
      \"region\": \"us-east-1\"
    }
  }"

echo "🎉 Backup completado y subido a S3"
```

**Uso:**
```bash
chmod +x backup-full.sh
./backup-full.sh
```

---

### Script Node.js: Backup Programático

```javascript
// backup-script.js
const axios = require('axios');

const BACKUP_URL = 'http://localhost:4000';
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'my_database',
  username: 'postgres',
  password: 'postgres'
};

async function performBackup() {
  try {
    // 1. Analizar
    console.log('🔍 Analizando base de datos...');
    const analysis = await axios.post(`${BACKUP_URL}/api/backup/analyze`, {
      dbConfig
    });
    console.log(`✅ ${analysis.data.report.totalModels} modelos detectados`);

    // 2. Extraer
    console.log('💾 Extrayendo backup...');
    const backup = await axios.post(`${BACKUP_URL}/api/backup/extract`, {
      dbConfig,
      options: { chunkSize: 300, format: 'seeders' }
    });
    console.log(`✅ Backup creado: ${backup.data.backupId}`);

    // 3. Subir a S3
    console.log('☁️  Subiendo a S3...');
    const upload = await axios.post(`${BACKUP_URL}/api/advanced/upload-s3`, {
      database: dbConfig.database,
      backupId: backup.data.backupId,
      s3Config: {
        bucket: 'my-backups',
        region: 'us-east-1'
      }
    });
    console.log(`✅ Subido a: ${upload.data.s3.url}`);

    console.log('🎉 Backup completado exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

performBackup();
```

**Uso:**
```bash
node backup-script.js
```

---

## 🎯 Casos de Uso Reales

### 1. Migración Dev → Staging → Prod

```bash
# 1. Backup de desarrollo
curl -X POST http://localhost:4000/api/backup/extract \
  -d '{"dbConfig": {"database": "app_dev"}}'

# 2. Copiar seeders a staging
cp backups/app_dev/backup-*/seeders/*.cjs \
   ../staging-project/seeders/

# 3. Ejecutar en staging
cd ../staging-project
npx sequelize-cli db:seed:all

# 4. Validar y repetir para producción
```

---

### 2. Disaster Recovery

```bash
# 1. Backup programado diario
curl -X POST http://localhost:4000/api/advanced/schedule \
  -d '{
    "schedule": "0 2 * * *",
    "retentionDays": 30,
    "uploadToS3": true
  }'

# 2. En caso de desastre, descargar de S3
aws s3 cp s3://my-backups/backups/prod_db/backup-latest.zip .

# 3. Extraer y restaurar
unzip backup-latest.zip
cd backup-*/
npx sequelize-cli db:seed:all
```

---

### 3. Testing con Datos Reales

```bash
# 1. Backup de producción (anonimizado)
curl -X POST http://localhost:4000/api/backup/extract \
  -d '{"dbConfig": {"database": "production"}}'

# 2. Copiar a entorno de testing
cp backups/production/backup-*/seeders/*.cjs \
   ../test-project/seeders/

# 3. Ejecutar tests con datos reales
cd ../test-project
npm test
```

---

### 4. Auditoría de Cambios

```bash
# 1. Backup antes de cambios
curl -X POST http://localhost:4000/api/backup/extract \
  -d '{"dbConfig": {...}}'
# Resultado: backup-20250128-100000

# 2. Realizar cambios en la aplicación
# ... cambios ...

# 3. Backup después de cambios
curl -X POST http://localhost:4000/api/backup/extract \
  -d '{"dbConfig": {...}}'
# Resultado: backup-20250128-150000

# 4. Comparar
curl -X POST http://localhost:4000/api/advanced/compare \
  -d '{
    "backupId1": "backup-20250128-100000",
    "backupId2": "backup-20250128-150000"
  }'
```

---

### 5. Backup Multi-Tenant

```bash
# Script para múltiples bases de datos
for DB in tenant1_db tenant2_db tenant3_db; do
  echo "Backing up $DB..."
  curl -X POST http://localhost:4000/api/backup/extract \
    -d "{\"dbConfig\": {\"database\": \"$DB\"}}"
done
```

---

## 🔧 Configuración de Entorno

### Desarrollo

```env
# .env.development
PORT=4000
BACKUP_DIR=./backups
NODE_ENV=development
```

### Producción

```env
# .env.production
PORT=4000
BACKUP_DIR=/var/backups
NODE_ENV=production

# S3 Configuration
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
AWS_BUCKET_NAME=prod-backups
```

---

## 📊 Monitoreo y Alertas

### Script de Monitoreo

```bash
#!/bin/bash
# monitor-backups.sh

METRICS=$(curl -s http://localhost:4000/api/advanced/metrics)
TOTAL_BACKUPS=$(echo $METRICS | jq '.metrics.backups.total')
STORAGE_USED=$(echo $METRICS | jq -r '.metrics.storage.used')

echo "📊 Métricas de Backups"
echo "Total backups: $TOTAL_BACKUPS"
echo "Almacenamiento: $STORAGE_USED"

# Alertar si hay pocos backups
if [ $TOTAL_BACKUPS -lt 5 ]; then
  echo "⚠️  ALERTA: Pocos backups disponibles"
  # Enviar notificación
fi
```

---

## 🔗 Recursos

- [API Endpoints](API-ENDPOINTS.md)
- [Características Avanzadas](ADVANCED-FEATURES.md)
- [Bases de Datos en la Nube](CLOUD-DATABASES.md)
- [Arquitectura](ARCHITECTURE.md)
