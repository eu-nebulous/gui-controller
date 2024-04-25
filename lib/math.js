const math = require('mathjs');


module.exports = {
    extractFromEquation: (equation)=>{
        equation = equation || '';
        return math.parse(equation);
    },
    extractVariableNames: (mathNode) => {
        let variableNames = new Set();

        function traverse(node) {
            if (node.type === 'SymbolNode') {
                variableNames.add(node.name);
            }

            for (const key in node.args) {
                traverse(node.args[key]);
            }

            if (node.content) {
                traverse(node.content);
            }
        }

        traverse(mathNode);

        return Array.from(variableNames);
    }


}