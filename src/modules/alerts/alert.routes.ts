import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getAlerts,
  getAlertById,
  createAlert,
  markAlertAsRead,
  markAllAlertsAsRead,
  deleteAlert,
  getUnreadCount,
  runAutomaticChecks,
  createPaymentReminder,
  createMonthlySummary,
  cleanupOldAlerts,
  getNotificationPreferences,
  updateNotificationPreferences,
  testNotification,
} from "./alert.controller";

const router = Router();

// Rutas principales de alertas
router.get("/", authenticate, getAlerts);                           // GET /alerts - Listar alertas del usuario
router.get("/unread-count", authenticate, getUnreadCount);          // GET /alerts/unread-count - Obtener cantidad de alertas no leídas
router.get("/:id", authenticate, getAlertById);                     // GET /alerts/:id - Obtener alerta específica
router.post("/", authenticate, createAlert);                        // POST /alerts - Crear nueva alerta
router.put("/:id/read", authenticate, markAlertAsRead);             // PUT /alerts/:id/read - Marcar alerta como leída
router.put("/mark-all-read", authenticate, markAllAlertsAsRead);    // PUT /alerts/mark-all-read - Marcar todas como leídas
router.delete("/:id", authenticate, deleteAlert);                   // DELETE /alerts/:id - Eliminar alerta

// Rutas para generación automática de alertas
router.post("/automatic-checks", authenticate, runAutomaticChecks); // POST /alerts/automatic-checks - Ejecutar verificaciones automáticas
router.post("/payment-reminder", authenticate, createPaymentReminder); // POST /alerts/payment-reminder - Crear recordatorio de pago
router.post("/monthly-summary", authenticate, createMonthlySummary); // POST /alerts/monthly-summary - Crear resumen mensual

// Rutas de utilidad
router.delete("/cleanup/old", authenticate, cleanupOldAlerts);      // DELETE /alerts/cleanup/old - Limpiar alertas antiguas

// Rutas de configuración de notificaciones
router.get("/preferences", authenticate, getNotificationPreferences);        // GET /alerts/preferences - Obtener preferencias de notificación
router.put("/preferences", authenticate, updateNotificationPreferences);     // PUT /alerts/preferences - Actualizar preferencias de notificación
router.post("/test-notification", authenticate, testNotification);           // POST /alerts/test-notification - Probar notificación

export default router;