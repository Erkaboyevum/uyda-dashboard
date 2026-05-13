require('dotenv').config();
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');

const app = express();

app.use(cors());

const API_TARGET = process.env.TARGET_URL || 'https://example.com'; // O'zgartirish mumkin

app.use('/api', createProxyMiddleware({
    target: API_TARGET,
    changeOrigin: true,
    secure: false,
    onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('Origin', API_TARGET);
    },
    onError: (err, req, res) => {
        res.status(500).json({ error: 'Proxy orqali so‘rov jo‘natishda xatolik yuz berdi' });
    }
}));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Proxy server ${PORT} portda ishga tushdi. Target: ${API_TARGET}`);
});