-- Migración: añadir columnas de posición en el mapa a la tabla puestos
-- Ejecutar una sola vez en el servidor:
--   mysql -u claude_user -p'Proyecto_Seguro2026!' queuefest < migrate_mapa.sql

ALTER TABLE puestos
  ADD COLUMN pos_x FLOAT DEFAULT NULL COMMENT 'Posición X en el mapa (0-100%)',
  ADD COLUMN pos_y FLOAT DEFAULT NULL COMMENT 'Posición Y en el mapa (0-100%)';

-- Posiciones iniciales para los primeros 8 puestos
-- Izquierda = barras, derecha = food trucks, centro libre para el escenario
UPDATE puestos SET pos_x =  5, pos_y =  5 WHERE id = 1;
UPDATE puestos SET pos_x = 58, pos_y =  5 WHERE id = 2;
UPDATE puestos SET pos_x =  5, pos_y = 35 WHERE id = 3;
UPDATE puestos SET pos_x = 58, pos_y = 35 WHERE id = 4;
UPDATE puestos SET pos_x =  5, pos_y = 65 WHERE id = 5;
UPDATE puestos SET pos_x = 58, pos_y = 65 WHERE id = 6;
UPDATE puestos SET pos_x =  5, pos_y = 82 WHERE id = 7;
UPDATE puestos SET pos_x = 58, pos_y = 82 WHERE id = 8;
