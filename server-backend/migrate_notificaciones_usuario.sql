-- Migracion aditiva para notificaciones in-app.
-- Segura para despliegues graduales: no elimina ni renombra estructuras existentes.
-- Nota: los ALTER de este script estan pensados para ejecutarse una sola vez.

CREATE TABLE IF NOT EXISTS notificaciones_usuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  puesto_id INT NULL,
  tipo VARCHAR(64) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  payload JSON NULL,
  dedup_key VARCHAR(255) NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (puesto_id) REFERENCES puestos(id) ON DELETE SET NULL,
  INDEX idx_notif_usuario_id (usuario_id, id)
);

ALTER TABLE notificaciones_usuario
  ADD COLUMN dedup_key VARCHAR(255) NULL;

ALTER TABLE notificaciones_usuario
  ADD INDEX idx_notif_usuario_leida_id (usuario_id, leida, id);

ALTER TABLE notificaciones_usuario
  ADD UNIQUE KEY uq_notif_dedup (usuario_id, tipo, dedup_key);
