const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static files dari folder explorer
app.use('/explorer', express.static(path.join(__dirname, '../explorer')));

app.get('/health', (req, res) => {
    res.json({ status: 'PIP', block: 14837, validators: 47 });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📁 Explorer: http://localhost:${PORT}/explorer/`);
});
