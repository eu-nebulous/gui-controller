const {v4: uuidv4} = require("uuid");
const _ = require('lodash');

module.exports = {
    extend: '@apostrophecms/piece-type',
    options: {
        label: 'Prompt',
        sort:{
            sortOrder:1,
        }
    },

    fields: {
        add: {
            model: {
                type: 'string',
                label: 'Model',
                required: true
            },
            content: {
                type: 'string',
                label: 'Prompt',
                required: true,
                textarea: true,
                max: 2000
            }
        },
        group: {
            basics: {
                label: 'AI',
                fields: ['model','content']
            }
        }
    },

};