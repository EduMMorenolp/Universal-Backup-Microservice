import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import backupRoutes from './src/api/backupController.js';
import advancedRoutes from './src/api/advancedController.js';
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
            analyze: 'POST /api/backup/analyze',
            extract: 'POST /api/backup/extract',
            list: 'GET /api/backup/list',
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
