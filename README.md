# 📊 Monitor de Recursos IMSA - Versión Intranet

Aplicación web para monitorear el estado de los recursos de producción en tiempo real, optimizada para funcionar en la intranet de IMSA sin dependencias externas.

## 🚀 Características

- **Conexión directa a SQL Server** - Sin dependencias de APIs externas
- **Interfaz en tiempo real** - Actualización automática cada 30 segundos
- **Gestión con PM2** - Proceso estable y auto-recuperable
- **Notificaciones web** - Alertas de estado de máquinas
- **Responsive** - Compatible con diferentes dispositivos
- **Sin cache** - Datos siempre actualizados

## 📋 Requisitos del Sistema

- **Node.js** >= 16.0.0
- **NPM** >= 8.0.0
- **PM2** (se instala globalmente)
- **Acceso a red IMSA** para conectar con SQL Server
- **Windows Server** o máquina con acceso a la red interna

## 🔧 Instalación

### 1. Clonar o copiar archivos
```bash
# Si tienes git instalado
git clone [URL_DEL_REPOSITORIO]
cd tablero_recursos

# O simplemente copia todos los archivos a una carpeta
```

### 2. Instalar Node.js (si no está instalado)
Descargar desde: https://nodejs.org/es/download/

### 3. Instalar PM2 globalmente
```bash
npm install -g pm2
```

### 4. Instalar dependencias del proyecto
```bash
npm install
```

### 5. Verificar configuración de base de datos
Revisar las credenciales en `server.js` (líneas 11-32):
```javascript
const tableroConfig = {
    server: '192.168.100.164',
    database: 'CWSGImsa',
    // ... resto de configuración
};
```

## 🚀 Ejecución

### Modo Desarrollo (para pruebas)
```bash
npm run dev
```

### Modo Producción con PM2
```bash
# Iniciar el servicio
npm run pm2:start

# Ver logs en tiempo real
npm run pm2:logs

# Reiniciar servicio
npm run pm2:restart

# Detener servicio
npm run pm2:stop
```

### Comandos PM2 directos
```bash
# Ver estado de procesos
pm2 status

# Ver logs
pm2 logs tablero-imsa

# Reiniciar
pm2 restart tablero-imsa

# Detener
pm2 stop tablero-imsa

# Eliminar proceso
pm2 delete tablero-imsa
```

## 🌐 Acceso a la Aplicación

Una vez iniciado el servidor, la aplicación estará disponible en:

- **Local**: http://localhost:5490
- **Intranet**: http://[IP-DEL-SERVIDOR]:5490

### Ejemplo de URLs de intranet:
- http://192.168.100.50:5490
- http://servidor-tablero:5490

## 📊 Endpoints API

La aplicación expone los siguientes endpoints:

- `GET /api/test-connection` - Prueba de conexión a base de datos
- `GET /api/recursos` - Obtener estado de todos los recursos
- `GET /api/objetivos` - Obtener objetivos por sección
- `POST /api/objetivos` - Actualizar objetivos

## 🔧 Configuración

### Puerto del servidor
Modificar en `ecosystem.config.js` o variable de entorno:
```javascript
env: {
  NODE_ENV: 'production',
  PORT: 5490  // Cambiar aquí
}
```

### Objetivos por sección
Modificar en `server.js` función `/api/objetivos`:
```javascript
const objetivos = {
    1: 1200,  // Sección 1
    2: 1200,  // Sección 2
    3: 800    // Sección 3
};
```

### Configuración de base de datos
En `server.js`, sección `tableroConfig`:
- Cambiar IP del servidor SQL
- Actualizar credenciales si es necesario
- Ajustar timeouts según la red

## 📝 Logs

Los logs se guardan en la carpeta `logs/`:
- `logs/out.log` - Salida estándar
- `logs/err.log` - Errores
- `logs/combined.log` - Logs combinados

## 🔄 Auto-inicio con el sistema

### Windows (usando PM2)
```bash
# Guardar configuración actual de PM2
pm2 save

# Instalar servicio de Windows (ejecutar como Administrador)
pm2-windows-service install

# O usar pm2 startup para Linux/Mac
pm2 startup
```

### Manual (Windows)
1. Crear un archivo `iniciar_tablero.bat`:
```batch
@echo off
cd /d "C:\ruta\a\tu\proyecto"
npm run pm2:start
pause
```

2. Agregarlo al inicio de Windows o crear un servicio

## 🛠️ Solución de Problemas

### Error de conexión a base de datos
1. Verificar que la IP `192.168.100.164` sea accesible
2. Confirmar credenciales NTLM
3. Revisar firewall y puertos SQL Server (1433)

### Aplicación no carga
1. Verificar que PM2 esté ejecutándose: `pm2 status`
2. Revisar logs: `pm2 logs tablero-imsa`
3. Confirmar puerto 5490 disponible: `netstat -an | find "5490"`

### Datos no se actualizan
1. Verificar conexión a base de datos: http://[IP]:5490/api/test-connection
2. Revisar logs de errores: `pm2 logs tablero-imsa --err`

## 📞 Soporte

Para problemas técnicos:
1. Revisar logs con `pm2 logs tablero-imsa`
2. Verificar estado del proceso con `pm2 status`
3. Confirmar acceso a la base de datos

## 📄 Estructura del Proyecto

```
tablero_recursos/
├── server.js              # Servidor principal Express
├── index.html              # Aplicación web frontend
├── sw.js                   # Service Worker
├── package.json            # Dependencias Node.js
├── ecosystem.config.js     # Configuración PM2
├── .gitignore             # Archivos ignorados por Git
├── README.md              # Este archivo
└── logs/                  # Directorio de logs (auto-creado)
```

## 🔐 Seguridad

- La aplicación funciona solo en la intranet
- Credenciales de base de datos en texto plano (solo para red interna)
- Sin autenticación de usuarios (acceso libre en intranet)
- CORS habilitado para desarrollo

---

**Desarrollado para IMSA** 🏭 