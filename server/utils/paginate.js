function build({ page = 1, limit = 20, maxLimit = 100 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(maxLimit, Math.max(1, parseInt(limit, 10) || 20));
  return { page: p, limit: l, skip: (p - 1) * l };
}

function meta({ page, limit, total }) {
  const pages = Math.ceil(total / limit) || 0;
  return { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 };
}

module.exports = { build, meta };