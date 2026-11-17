// The spec itself lives in docs/openapi.yaml so it can also be submitted as a file.
const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const spec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'docs', 'openapi.yaml'), 'utf8'));

const router = express.Router();

router.get('/openapi.json', (req, res) => res.json(spec));
router.use('/', swaggerUi.serve, swaggerUi.setup(spec, { swaggerOptions: { persistAuthorization: true } }));

module.exports = router;
