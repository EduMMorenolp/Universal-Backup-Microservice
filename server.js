import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import backupRoutes from './src/api/backupController.js';
import advancedRoutes from './src/api/advancedController.js';
import restoreRoutes from './src/api/restoreController.js';
import testRoutes from './src/api/testController.js';
import cronScheduler from './src/scheduler/cronScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Routes
app.use('/api/backup', backupRoutes);
app.use('/api/advanced', advancedRoutes);
app.use('/api/restore', restoreRoutes);
app.use('/api/test', testRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Universal Backup Microservice',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Root
app.get('/', (req, res) => {
    res.json({
        service: 'Universal Backup Microservice',
        version: '1.0.0',
        endpoints: {
            basic: {
                analyze: 'POST /api/backup/analyze',
                extract: 'POST /api/backup/extract',
                extractIncremental: 'POST /api/backup/extract (with incremental: true)',
                list: 'GET /api/backup/list',
                delete: 'DELETE /api/backup/:database/:backupId'
            },
            restore: {
                restore: 'POST /api/restore',
                info: 'POST /api/restore/info',
                validate: 'POST /api/restore/validate',
                clean: 'POST /api/restore/clean'
            },
            advanced: {
                schedule: 'POST /api/advanced/schedule',
                schedules: 'GET /api/advanced/schedules',
                cancelSchedule: 'DELETE /api/advanced/schedule/:id',
                compare: 'POST /api/advanced/compare',
                uploadS3: 'POST /api/advanced/upload-s3',
                metrics: 'GET /api/advanced/metrics'
            },
            testing: {
                runTests: 'POST /api/test/run'
            },
            health: 'GET /health'
        }
    });
});

// Start server
app.listen(PORT, async () => {
    // Cargar schedules guardados
    await cronScheduler.loadSchedules();
    
console.log(`
    ╔═══════════════════════════════════════════════╗
    ║   🔄 Universal Backup Microservice           ║
    ║   📦 Database Backup & Analysis for Any DB   ║
    ╠═══════════════════════════════════════════════╣
    ║   🌐 Server: http://localhost:${PORT}         ║
    ║   📊 Health: http://localhost:${PORT}/health  ║
    ║   ✨ Advanced: /api/advanced/*                ║
    ╚═══════════════════════════════════════════════╝
    `);
});

export default app;
