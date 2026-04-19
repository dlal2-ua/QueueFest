-- Fix tiempos de espera y empleados por puesto
-- Ejecutar en queuefest DB

-- Barras de bebida: muy rápidas (< 1 min), 3 empleados
UPDATE puestos
SET tiempo_servicio_medio = 1,
    num_empleados = 3
WHERE tipo = 'barra';

-- Food trucks: más lentos (2-3 min), 3 empleados
UPDATE puestos
SET tiempo_servicio_medio = 2,
    num_empleados = 3
WHERE tipo = 'foodtruck';

-- Si hay tipos distintos o el campo tipo no existe, aplica genérico
-- (quita el WHERE para aplicar a todos por seguridad)
-- UPDATE puestos SET tiempo_servicio_medio = 2, num_empleados = 3;

-- Verificar resultado
SELECT id, nombre, tipo, num_empleados, tiempo_servicio_medio FROM puestos ORDER BY tipo;
