import { Router } from "express";
import * as creditCardController from "./credit-card.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

/**
 * GET /credit-cards
 * Get all credit cards for authenticated user
 * Requires authentication
 */
router.get("/", authenticate, creditCardController.getCreditCards);

/**
 * GET /credit-cards/:id
 * Get specific credit card by ID
 * Requires authentication
 */
router.get("/:id", authenticate, creditCardController.getCreditCardById);

/**
 * POST /credit-cards
 * Create new credit card
 * Requires authentication
 */
router.post("/", authenticate, creditCardController.createCreditCard);

/**
 * PUT /credit-cards/:id
 * Update existing credit card
 * Requires authentication
 */
router.put("/:id", authenticate, creditCardController.updateCreditCard);

/**
 * DELETE /credit-cards/:id
 * Delete credit card (only if no associated expenses)
 * Requires authentication
 */
router.delete("/:id", authenticate, creditCardController.deleteCreditCard);

/**
 * GET /credit-cards/:id/transactions
 * Get transaction history for specific credit card
 * Requires authentication
 */
router.get("/:id/transactions", authenticate, creditCardController.getCreditCardTransactions);

/**
 * PUT /credit-cards/:id/balance
 * Update credit card balance manually
 * Requires authentication
 */
router.put("/:id/balance", authenticate, creditCardController.updateCreditCardBalance);

/**
 * GET /credit-cards/:id/limit-warning
 * Check if credit card is approaching limit (80% threshold)
 * Requires authentication
 */
router.get("/:id/limit-warning", authenticate, creditCardController.checkCreditLimitWarning);

/**
 * GET /credit-cards/summary
 * Get credit cards summary for dashboard
 * Requires authentication
 */
router.get("/summary", authenticate, creditCardController.getCreditSummary);

export default router;