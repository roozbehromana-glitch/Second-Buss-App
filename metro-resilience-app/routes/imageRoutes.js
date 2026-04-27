const express = require('express');
const { generateScenarioVisual } = require('../services/geminiImageService');

const router = express.Router();

router.post('/generate-visual', async (req, res, next) => {
  try {
    const result = await generateScenarioVisual(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
