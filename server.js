const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5490;

// ===== CONFIGURACIÓN DE LA BASE DE DATOS =====
const tableroConfig = {
    server: '192.168.100.164',
    database: 'CWSGImsa',
    options: {
        encrypt: true,
        trustServerCertificate: true,
        enableArithAbort: true,
        requestTimeout: 60000,      // 60 segundos
        connectionTimeout: 30000,   // 30 segundos
    },
    authentication: {
        type: 'ntlm',
        options: {
            domain: 'IMSA',
            userName: 'A_TCasco',
            password: 'Tiranytar.2023!'
        }
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 60000
    }
};

// ===== MIDDLEWARE =====
app.use(helmet({
    contentSecurityPolicy: false, // Deshabilitamos CSP para permitir inline scripts
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static(__dirname, {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
    }
}));

// ===== CONEXIÓN A LA BASE DE DATOS =====
let connectionPool = null;

async function connectTableroDB() {
    try {
        if (!connectionPool) {
            console.log('🔄 Conectando a la base de datos GCWin...');
            connectionPool = await sql.connect(tableroConfig);
            console.log('✅ Conexión establecida con GCWin');
        }
        return connectionPool;
    } catch (error) {
        console.error('❌ Error conectando a GCWin:', error);
        connectionPool = null;
        throw error;
    }
}

// ===== FUNCIÓN PARA DETERMINAR ESTADO DEL RECURSO =====
function determinarEstadoRecurso(recurso) {
    const operarios = recurso.Operarios;
    const estado = recurso.Estado ? recurso.Estado.toString().trim() : '';
    const motivoInterrup = recurso.MotivoInterrup ? recurso.MotivoInterrup.toString().trim() : '';

    console.log(`🔍 Recurso ${recurso.Recurso || 'N/A'}: Estado="${estado}", Operarios=${operarios}, Motivo="${motivoInterrup}"`);

    // Prioridad 1: Sin operario
    if (!operarios || operarios === 0) {
        console.log(`   → Sin operario`);
        return {
            estado: 'status-sin-operario',
            estadoTexto: 'Falta de Personal'
        };
    }

    // Prioridad 2: Estados de producción (comparación insensible a mayúsculas)
    if (estado.toLowerCase() === 'enproceso' || estado.toLowerCase() === 'en proceso') {
        console.log(`   → Produciendo`);
        return {
            estado: 'status-produciendo',
            estadoTexto: 'Produciendo'
        };
    }

    // Prioridad 2.5: Máquina iniciada pero no en proceso
    if (estado.toLowerCase() === 'iniciada') {
        console.log(`   → Máquina Lista (Iniciada)`);
        return {
            estado: 'status-iniciada',
            estadoTexto: 'Máquina Lista'
        };
    }

    // Prioridad 3: Estado en pausa, analizar motivo
    if (estado.toLowerCase() === 'enpausa' || estado.toLowerCase() === 'en pausa') {
        const motivo = motivoInterrup.toLowerCase();
        
        // Mantenimiento (azul)
        if (motivo.includes('mant. eléctrico') || 
            motivo.includes('mant. mecánico') || 
            motivo.includes('limpieza de hornos')) {
            console.log(`   → Mantenimiento`);
            return {
                estado: 'status-mantenimiento',
                estadoTexto: 'Mantenimiento'
            };
        }
        
        // Materiales (naranja)
        if (motivo.includes('falta de materia prima') || 
            motivo.includes('falta materiales') || 
            motivo.includes('retiro de material')) {
            console.log(`   → Falta Materiales`);
            return {
                estado: 'status-falta-materiales',
                estadoTexto: 'Falta Materiales'
            };
        }
        
        // Set Up (amarillo)
        if (motivo.includes('cambio de medida') || 
            motivo.includes('cambio de carrete') || 
            motivo.includes('cambio de color') || 
            motivo.includes('falta autocontrol')) {
            console.log(`   → Set Up`);
            return {
                estado: 'status-set-up',
                estadoTexto: 'Set Up'
            };
        }
        
        // Detenido (rojo) - otros motivos
        console.log(`   → Detenido (EnPausa sin motivo específico)`);
        return {
            estado: 'status-detenido',
            estadoTexto: 'Detenido'
        };
    }

    // Estado por defecto
    console.log(`   → Estado por defecto: Detenido (estado no reconocido: "${estado}")`);
    return {
        estado: 'status-detenido',
        estadoTexto: 'Detenido'
    };
}

// ===== FUNCIÓN PARA GUARDAR LOGS =====
function saveLog(tipo, datos) {
    const timestamp = new Date().toISOString();
    console.log(`📋 [${timestamp}] ${tipo}:`, datos);
    // Aquí podrías implementar guardar en archivo o base de datos si es necesario
}

// ===== ENDPOINTS PARA TABLERO DE RECURSOS =====

// Endpoint para test de conexión
app.get('/api/test-connection', async (req, res) => {
    try {
        console.log('🔍 Probando conexión a GCWin...');
        const connection = await connectTableroDB();
        const request = new sql.Request(connection);
        const result = await request.query('SELECT @@VERSION as version, GETDATE() as fecha');
        
        console.log('✅ Test de conexión exitoso');
        res.json({
            success: true,
            message: 'Conexión exitosa a GCWin',
            data: result.recordset[0],
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Error en test de conexión:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener recursos
app.get('/api/recursos', async (req, res) => {
    try {
        console.log('🔄 Obteniendo recursos del tablero...');
        const connection = await connectTableroDB();
        const request = new sql.Request(connection);
        
        const result = await request.query(`
            SELECT 
                Recurso,
                Estado,
                MotivoInterrup,
                Operarios,
                OpEnCurso,
                OpPendientes,
                Producto,
                KgAcumDelDia,
                MinsInterrupDelDia,
                MinsEstadoActual
            FROM GCWin_V_EstadoRecursosCables
            ORDER BY Recurso
        `);

        console.log(`✅ Recursos obtenidos: ${result.recordset.length} registros`);

        // Procesar los datos
        const recursos = result.recordset.map(row => {
            // Crear objeto recurso para la función de estado
            const recursoData = {
                Operarios: row.Operarios,
                Estado: row.Estado,
                MotivoInterrup: row.MotivoInterrup
            };
            
            const estadoInfo = determinarEstadoRecurso(recursoData);
            
            return {
                numero: row.Recurso,
                estado: estadoInfo.estado,
                estadoTexto: estadoInfo.estadoTexto,
                motivoInterrupcion: row.MotivoInterrup || '',
                operarios: row.Operarios || 0,
                opEnCurso: row.OpEnCurso || 'Sin OP',
                opPendientes: row.OpPendientes || 0,
                producto: row.Producto || 'Sin producto',
                kgAcumulados: parseFloat(row.KgAcumDelDia) || 0,
                minutosInterrupcion: parseInt(row.MinsInterrupDelDia) || 0,
                minutosEstadoActual: parseInt(row.MinsEstadoActual) || 0
            };
        });

        // Guardar log
        saveLog('recursos_consulta', {
            filas: recursos.length,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            data: recursos,
            total: recursos.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error obteniendo recursos:', error);
        
        saveLog('recursos_error', {
            error: error.message,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.status(500).json({
            success: false,
            error: 'Error obteniendo recursos',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener objetivos
app.get('/api/objetivos', (req, res) => {
    try {
        // Objetivos configurables por sección
        const objetivos = {
            1: 1200,  // Sección 1
            2: 1200,  // Sección 2
            3: 800    // Sección 3
        };

        console.log('📊 Objetivos enviados:', objetivos);

        res.json({
            success: true,
            data: objetivos,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error obteniendo objetivos:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo objetivos',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para actualizar objetivos
app.post('/api/objetivos', (req, res) => {
    try {
        const { seccion, objetivo } = req.body;

        if (!seccion || !objetivo) {
            return res.status(400).json({
                success: false,
                error: 'Sección y objetivo son requeridos'
            });
        }

        console.log(`📊 Actualizando objetivo sección ${seccion}: ${objetivo}`);

        // Aquí podrías guardar en base de datos o archivo
        // Por ahora solo respondemos exitosamente
        
        saveLog('objetivo_actualizado', {
            seccion,
            objetivo,
            ip: req.ip,
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Objetivo de sección ${seccion} actualizado a ${objetivo}`,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('❌ Error actualizando objetivo:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando objetivo',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ===== RUTA PRINCIPAL =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== MANEJO DE ERRORES =====
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    });
});

// Ruta para manejar 404
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// ===== INICIAR SERVIDOR =====
app.listen(PORT, () => {
    console.log(`
🚀 ===== SERVIDOR TABLERO IMSA INICIADO =====
🌐 URL Local: http://localhost:${PORT}
🏢 URL Intranet: http://[IP-DEL-SERVIDOR]:${PORT}
📊 Endpoints disponibles:
   • GET /api/test-connection
   • GET /api/recursos  
   • GET /api/objetivos
   • POST /api/objetivos
🔄 Servidor listo para recibir conexiones...
==========================================
    `);
});

// ===== MANEJO DE CIERRE GRACEFUL =====
process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (connectionPool) {
        await connectionPool.close();
        console.log('✅ Conexión a base de datos cerrada');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Cerrando servidor...');
    if (connectionPool) {
        await connectionPool.close();
        console.log('✅ Conexión a base de datos cerrada');
    }
    process.exit(0);
}); 