const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const DEFAULT_REFERER = 'https://iframe.rumsport8.live/';
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

app.get('/proxy', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).send('Missing target URL');
    }

    try {
        const response = await axios({
            method: 'get',
            url: targetUrl,
            headers: {
                'Referer': DEFAULT_REFERER,
                'User-Agent': DEFAULT_UA,
            },
            responseType: 'stream'
        });

        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');

        if (targetUrl.includes('.m3u8')) {
            let data = '';
            response.data.on('data', chunk => { data += chunk; });
            response.data.on('end', () => {
                const parsedUrl = new URL(targetUrl);
                const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}${parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)}`;

                const rewritten = data.split('\n').map(line => {
                    let trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        let absoluteChunkUrl = new URL(trimmed, baseUrl).href;
                        return `/proxy?url=${encodeURIComponent(absoluteChunkUrl)}`;
                    }
                    return line;
                }).join('\n');

                res.send(rewritten);
            });
        } else {
            response.data.pipe(res);
        }

    } catch (err) {
        console.error('Proxy error:', err.message);
        res.status(500).send('Stream relay failed.');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Proxy active on port ${PORT}`));
