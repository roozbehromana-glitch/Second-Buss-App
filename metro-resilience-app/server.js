const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const analysisRoutes = require('./routes/analysisRoutes');
const imageRoutes = require('./routes/imageRoutes');
const demoNetwork = require('./data/demoNetwork.json');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api', analysisRoutes);
app.use('/api/gemini', imageRoutes);

app.get('/api/demo-network', (req, res) => {
  res.json(demoNetwork);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Unexpected server error'
  });
});

app.listen(PORT, () => {
  console.log(`Metro app running at http://localhost:${PORT}`);
});
