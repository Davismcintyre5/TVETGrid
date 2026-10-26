const ApiError = require('../../utils/ApiError');

module.exports = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;
    next();
  } catch (err) {
    const details = err?.issues?.map((i) => ({ path: i.path.join('.'), message: i.message })) || null;
    next(ApiError.badRequest('Validation failed', 'VALIDATION_001', details));
  }
};