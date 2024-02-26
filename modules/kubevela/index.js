const yaml = require('yaml');
const flat=require( 'flat');
const _= require('lodash')
module.exports = {
    apiRoutes(self) {
        return {
            post: {
                async keys(req) {
                    try {
                        const { content } = req.body;
                        if (!content) {
                            return [];
                        }

                        const query = req.query.q;
                        const yamlData = yaml.parse(content);

                        if (!yamlData) {
                            throw self.apos.error('invalid', 'Invalid YAML data.')
                        }

                        const flattenKeys = flat.flatten(yamlData,{'delimiter':'/'})
                        if (!flattenKeys || flattenKeys.length === 0) {
                            return [];
                        }
                        return _.map(flattenKeys, (k,v)=>{
                            return {
                                'value': v,
                                'label': formatLabel(v,'/')
                            }
                        })
                    } catch (error) {
                        console.error('Error processing YAML:', error.message);
                        throw error;
                    }
                },
                async 'components'(req) {
                    try {
                        const { content } = req.body;
                        if (!content) {
                            return [];
                        }

                        const yamlData = yaml.parse(content);

                        if (!yamlData || !yamlData.spec || !yamlData.spec.components) {
                            return []
                        }

                        const components = yamlData.spec.components;
                        const componentNames = components
                            .filter(component => component.name)
                            .map(component => ({
                                value: component.name,
                                label: component.name
                            }));

                        return componentNames;
                    } catch (error) {
                        console.error('Error processing YAML:', error.message);
                        throw error;
                    }
                }

            },
        };
    },
};

function formatLabel(key,delimiter='.') {
    const specComponentsPropertiesPrefix = 'spec/components/properties';
    if (key.startsWith(specComponentsPropertiesPrefix)) {
        key = key.substring(specComponentsPropertiesPrefix.length + 1); // +1 for the dot after the prefix
    }
    const parts = key.split(delimiter);
    let ret = key
    if (parts.length > 4) {

        const firstThree = parts.slice(0, 3).join(delimiter);
        const lastOne = parts[parts.length - 1];
        const dots = '.'.repeat(parts.length - 4); // Repeat '.' for the number of parts - 4
        ret = `${firstThree}[${dots}]${lastOne}`;
    }

    return ret;
}



function findKeys(obj, query, currentPath = []) {
    const keys = [];
    for (const [key, value] of Object.entries(obj)) {
        const newPath = [...currentPath, key];
        const currentKey = newPath.join('.');

        // if (currentKey.startsWith(query)) {
        //     keys.push(currentKey);
        // }

        if (currentKey.startsWith(query)) {
            const adjustedKey = query.startsWith('spec.') ? currentKey.substring(5) : currentKey;
            keys.push(adjustedKey);
        }

        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                value.forEach(item => {
                    if (typeof item === 'object') {
                        keys.push(...findKeys(item, query, newPath));
                    }
                });
            } else {
                keys.push(...findKeys(value, query, newPath));
            }
        }
    }
    return filterRedundantKeys(keys);
}


function filterRedundantKeys(keys) {
    return keys.filter((key, index, self) => {
        return !self.some((otherKey) => {
            return otherKey.startsWith(key + '.') && otherKey !== key;
        });
    });
}