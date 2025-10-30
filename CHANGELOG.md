# Changelog - Universal Backup Microservice

## [Unreleased]

### Added
- Morgan para logging HTTP de requests y responses [30/10/2025]
- Sistema completo de restore de backups [30/10/2025]
- Endpoint POST /api/restore para restaurar backups [30/10/2025]
- Endpoint POST /api/restore/info para obtener información de backup [30/10/2025]
- Endpoint POST /api/restore/validate para validar BD destino [30/10/2025]
- Endpoint POST /api/restore/clean para limpiar BD destino [30/10/2025]
- Transacciones automáticas en restore con rollback en caso de error [30/10/2025]
- Validación de BD destino vacía antes de restore [30/10/2025]
- Opción force: true para sobrescribir BD con datos [30/10/2025]
- Limpieza automática de BD con TRUNCATE CASCADE [30/10/2025]
- Ejecución secuencial de seeders con manejo de errores [30/10/2025]
- Módulo backupRestorer.js con funciones de restore [30/10/2025]
- Controlador restoreController.js con 4 endpoints [30/10/2025]
- Actualización de Postman collection con 5 requests de restore [30/10/2025]
- Upload a S3 con metadatos estructurados en objetos [30/10/2025]
- Generación automática de manifest.json en S3 con resumen del backup [30/10/2025]
- Metadatos en objetos S3: database, timestamp, totalRecords, totalFiles, format, version, size [30/10/2025]
- Manifest incluye summary completo, info del microservicio y URLs de S3 [30/10/2025]
- Formateo automático de tamaños de archivo (Bytes, KB, MB, GB) [30/10/2025]
- Sistema completo de backup incremental [30/10/2025]
- Módulo incrementalExtractor.js para detección de cambios [30/10/2025]
- Detección automática de registros nuevos y modificados usando timestamps [30/10/2025]
- Generación de seeders incrementales (INSERT para nuevos, UPDATE para modificados) [30/10/2025]
- Opción incremental: true y basedOn en endpoint /api/backup/extract [30/10/2025]
- Metadata de backups incrementales con stats de cambios [30/10/2025]
- Actualización de Postman collection con request de backup incremental [30/10/2025]
- Sistema de testing automático de backups [30/10/2025]
- Módulo backupTester.js con suite completa de tests [30/10/2025]
- Endpoint POST /api/test/run para ejecutar tests automáticamente [30/10/2025]
- Tests: Backup completo, segundo backup, comparación e integridad [30/10/2025]
- Validación automática de que múltiples backups no se rompen [30/10/2025]
- Scripts SQL para base de datos de testing (test-db/) [30/10/2025]
- Actualización de Postman collection con endpoint de testing [30/10/2025]

### Changed
- (Agregar cambios aquí)

### Fixed
- (Agregar correcciones aquí)

## [1.0.0] - 28-01-2025

### Added
- Microservicio universal de backup para bases de datos Sequelize [28/01/2025]
- Análisis automático de modelos y estructura de BD [28/01/2025]
- Resolución automática de dependencias con ordenamiento topológico [28/01/2025]
- Generación automática de timestamps para modelos [28/01/2025]
- Extracción de datos con fragmentación automática (chunks de 300) [28/01/2025]
- API REST con endpoints de análisis, extracción y listado [28/01/2025]
- Conector universal de BD con carga dinámica de modelos [28/01/2025]
- Generación de seeders con formato APIA (down seguro) [28/01/2025]
- Soporte para múltiples formatos (seeders, JSON) [28/01/2025]
- Sistema de metadata para backups [28/01/2025]
- Configuración multi-servicio con services.json [28/01/2025]
- Health check endpoint [28/01/2025]
- Documentación completa en README.md [28/01/2025]

### Features
- Detección automática de claves foráneas
- Generación de entitiesOrder dinámico
- Fragmentación automática de tablas grandes
- IDs únicos para cada backup
- Listado de backups disponibles
- Conexiones temporales y seguras

---

**Versión inicial del microservicio de backup universal**
