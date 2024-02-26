module.exports = {
    fields: {
        add: {
            firstname: {
                type: 'string',
                label: 'First Name'
            },
            lastname: {
                type: 'string',
                label: 'Last Name'
            },
            organization: {
                type: 'string',
                label: 'Organization',
                required: true,
                group: 'basics'
            },
            uuid: {
                type: 'string',
                label: 'UUID',
                required: true
            },
        },
        group: {
            basics: {
                label: 'Basics',
                fields: ['firstname', 'lastname','organization', 'uuid']
            }
        }
    }
};