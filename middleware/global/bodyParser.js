const express = require('express');

module.exports = [
  express.json({ limit: '1mb' }),
  express.urlencoded({ extended: true, limit: '1mb' }),
];