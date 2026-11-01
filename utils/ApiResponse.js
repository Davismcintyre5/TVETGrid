function ok(res, data = null, message = 'OK', meta = null, statusCode = 200) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function created(res, data = null, message = 'Created') {
  return ok(res, data, message, null, 201);
}

function noContent(res) {
  return res.status(204).send();
}

module.exports = { ok, created, noContent };