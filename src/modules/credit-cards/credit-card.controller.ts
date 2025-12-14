import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import { CreditCardService } from "./credit-card.service";
import { CreateCreditCardDto, UpdateCreditCardDto } from "./credit-card.types";

const creditCardService = new CreditCardService();

export const getCreditCards = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const creditCards = await creditCardService.getUserCreditCards(userId);
    res.json({ success: true, data: creditCards });
  } catch (error) {
    console.error("Error getting credit cards:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get credit cards",
      },
    });
  }
};

export const getCreditCardById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const creditCard = await creditCardService.getCreditCardById(id, userId);
    res.json({ success: true, data: creditCard });
  } catch (error: any) {
    console.error("Error getting credit card:", error);

    if (error.message === "Credit card not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NOT_FOUND",
          message: "Credit card not found",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get credit card",
      },
    });
  }
};

export const createCreditCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const creditCardData: CreateCreditCardDto = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    // Validaciones básicas
    if (!creditCardData.name || creditCardData.name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Credit card name is required",
        },
      });
    }

    if (!creditCardData.bank || creditCardData.bank.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Bank name is required",
        },
      });
    }

    if (creditCardData.limitGTQ === undefined || creditCardData.limitUSD === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Both GTQ and USD limits are required",
        },
      });
    }

    const creditCard = await creditCardService.createCreditCard(userId, creditCardData);
    res.status(201).json({ success: true, data: creditCard });
  } catch (error: any) {
    console.error("Error creating credit card:", error);

    if (error.message === "Credit card name already exists") {
      return res.status(400).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NAME_EXISTS",
          message: "Credit card name already exists",
        },
      });
    }

    if (error.message === "Credit limits must be positive numbers") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Credit limits must be positive numbers",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to create credit card",
      },
    });
  }
};

export const updateCreditCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updateData: UpdateCreditCardDto = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const creditCard = await creditCardService.updateCreditCard(id, userId, updateData);
    res.json({ success: true, data: creditCard });
  } catch (error: any) {
    console.error("Error updating credit card:", error);

    if (error.message === "Credit card not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NOT_FOUND",
          message: "Credit card not found",
        },
      });
    }

    if (error.message === "Credit card name already exists") {
      return res.status(400).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NAME_EXISTS",
          message: "Credit card name already exists",
        },
      });
    }

    if (error.message.includes("limit must be a positive number")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to update credit card",
      },
    });
  }
};

export const deleteCreditCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    await creditCardService.deleteCreditCard(id, userId);
    res.json({ success: true, message: "Credit card deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting credit card:", error);

    if (error.message === "Credit card not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NOT_FOUND",
          message: "Credit card not found",
        },
      });
    }

    if (error.message === "Cannot delete credit card with associated expenses") {
      return res.status(400).json({
        success: false,
        error: {
          code: "CREDIT_CARD_HAS_EXPENSES",
          message: "Cannot delete credit card with associated expenses",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to delete credit card",
      },
    });
  }
};

export const getCreditCardTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const transactions = await creditCardService.getCreditCardTransactions(id, userId);
    res.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error("Error getting credit card transactions:", error);

    if (error.message === "Credit card not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NOT_FOUND",
          message: "Credit card not found",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get credit card transactions",
      },
    });
  }
};

export const updateCreditCardBalance = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { amountGTQ, amountUSD } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const creditCard = await creditCardService.updateCreditCardBalance(
      id,
      userId,
      amountGTQ,
      amountUSD,
    );
    res.json({ success: true, data: creditCard });
  } catch (error: any) {
    console.error("Error updating credit card balance:", error);

    if (error.message === "Credit card not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NOT_FOUND",
          message: "Credit card not found",
        },
      });
    }

    if (error.message.includes("balance cannot be negative")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to update credit card balance",
      },
    });
  }
};

export const checkCreditLimitWarning = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const warningStatus = await creditCardService.checkCreditLimitWarning(id, userId);
    res.json({ success: true, data: warningStatus });
  } catch (error: any) {
    console.error("Error checking credit limit warning:", error);

    if (error.message === "Credit card not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "CREDIT_CARD_NOT_FOUND",
          message: "Credit card not found",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to check credit limit warning",
      },
    });
  }
};

export const getCreditSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const summary = await creditCardService.getCreditSummary(userId);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error("Error getting credit summary:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get credit summary",
      },
    });
  }
};
