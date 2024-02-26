const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

module.exports = {
    init(self) {
        const swaggerDefinition = {
            openapi: '3.0.0',
            info: {
                title: 'NebulOus API',
                version: '1.0.0',
                description: 'Documentation for NebulOus API',
            }
        };

        const swaggerOptions = {
            swaggerDefinition,
            apis: [
                path.join(__dirname, 'swagger.yml'),
                './modules/**/*.js',
            ],
        };
        const swaggerSpec = swaggerJSDoc(swaggerOptions);

        self.apos.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    }
};
