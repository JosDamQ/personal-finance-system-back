import Ajv from "ajv";
import addErrors from "ajv-errors";
import { Request, Response, NextFunction } from "express";

const ajv = new Ajv({
  allErrors: true,
  allowUnionTypes: true,
});

addErrors(ajv);

// Validate body
export function validateBody(schema: any) {
  const validate = ajv.compile(schema);

  return (req: Request, res: Response, next: NextFunction) => {
    const valid = validate(req.body);

    if (!valid) {
      const errors = validate.errors?.map((e) => e.message) || [];
      return res.status(400).json({ message: errors.join(". ") });
    }

    next();
  };
}

// Validate params
export function validateParams(schema: any) {
  const validate = ajv.compile(schema);

  return (req: Request, res: Response, next: NextFunction) => {
    const valid = validate(req.params);

    if (!valid) {
      const errors = validate.errors?.map((e) => e.message) || [];
      return res.status(400).json({ message: errors.join(". ") });
    }

    next();
  };
}

// Validate query
export function validateQuery(schema: any) {
  const validate = ajv.compile(schema);

  return (req: Request, res: Response, next: NextFunction) => {
    const valid = validate(req.query);

    if (!valid) {
      const errors = validate.errors?.map((e) => e.message) || [];
      return res.status(400).json({ message: errors.join(". ") });
    }

    next();
  };
}
