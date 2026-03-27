# Informe: Configuración del Entorno Local Frontend-Backend

## 📝 Contexto
Anteriormente, la aplicación (Frontend) estaba apuntando siempre a la URL directa de la instancia de Oracle VM (`http://143.47.35.13:3000/api`) y el Backend se ejecutaba exclusivamente en la nube.
Para facilitar el desarrollo y poder depurar cambios sin depender de subir código constantemente al servidor, se solicitó la manera de **correr tanto el Frontend (Vite/React) como el Backend (Express/Node) localmente**.

Durante los últimos prompts se ha configurado el entorno local resolviendo el obstáculo principal: **La conexión a la Base de Datos privada de Oracle**.

## 🛠️ Modificaciones Realizadas

### 1. Re-direccionamiento del Frontend (`src/app/api.ts`)
Para que las peticiones del frontend interactúen con tu ordenador y no con la nube, se modificó la variable cabecera.
```typescript
// Antes
// const API_URL = 'http://143.47.35.13:3000/api';

// Ahora (Localmente)
const API_URL = 'http://localhost:3000/api';
```

### 2. Infraestructura del Túnel SSH en el Backend (`server-backend/index.js`)
El mayor reto era que el backend Node.js en local no puede ver la IP privada `10.0.0.5` de la base de datos de Oracle sin una VPN. Para solucionarlo (Opción A):
1. Se ha instalado el paquete **`ssh2`** en la carpeta `server-backend`.
2. Se reescribió la inicialización de la conexión de MySQL (`db = mysql2.createPool()`).
3. Ahora, al arrancar `node index.js`, el script utiliza la llave de seguridad `.key` para conectarse por SSH al servidor de la nube (usuario `ubuntu`).
4. Una vez conectado, levanta un **"Forwarder TCP" programático (un túnel)** en el puerto local `12345` que redirige el tráfico hacia la Base de Datos.
5. Inmediatamente después, el servidor Express (puerto `3000`) se enciende utilizando esa puerta segura local con la DB.

### 3. Resolución de conflicto de Puertos en Windows (Error EACCES)
* Durante el arranque, Windows lazó un error `listen EACCES: permission denied 127.0.0.1:33060`.
* **Solución**: Se modificó el puerto local del túnel del `33060` (frecuentemente bloqueado o reservado por servicios de Microsoft) al puerto `12345`. Tras este ajuste, el servidor Node pudo escuchar la Database sin restricciones del cortafuegos.

## 🚀 Cómo ponerlo en marcha desde ahora
Para probar cualquier cambio, tu entorno local requiere 2 terminales simultáneas:

**Terminal 1 (Backend):**
```bash
cd server-backend
node index.js
```
*Verás el mensaje: "Túnel SSH Listo" -> "Server Express corriendo localmente en puerto 3000"*

**Terminal 2 (Frontend):**
```bash
npm run dev
```
*Ir a http://localhost:5173/*

Con esta configuración tienes las mismsas ventajas que trabajando en la nube, pero puedes realizar todos los test directamente local.
