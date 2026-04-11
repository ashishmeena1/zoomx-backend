/**
 * Factory that returns an Express middleware which validates req.body
 * against a Zod schema. On failure it responds 422 with field-level errors.
 *
 * @param {import("zod").ZodSchema} schema
 * @returns {import("express").RequestHandler}
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(422).json({
        error: "Validation failed",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data; // use the coerced/sanitised data
    next();
  };
}

/**
 * Same as validate() but for req.params.
 * @param {import("zod").ZodSchema} schema
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: "Invalid path parameters",
        details: result.error.flatten().fieldErrors,
      });
    }
    req.params = result.data;
    next();
  };
}
