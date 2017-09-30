const factory = require('./lib/factory');

const table_width_reg = /(\d+[px|%]+)/g;

const make_md = function(opts) {
    const gen_id = function() {
        const d = +new Date(),
            r = parseInt(Math.random() * 1000, 10);

        return 'd_' + d + r;
    };

    const md = factory({
        inline: [
            ['custom', '$$', function(tokens, index, options, self) {
                const token = tokens[index],
                    nesting = token.nesting;

                if (nesting === -1) {
                    return '</span>';
                }

                const meta = token.meta,
                    tuple = token.meta.split('||'),
                    type = tuple[0],
                    text = tuple[1];
                switch (type) {
                    default:
                        return `<span class="${type}">${text}" + ${nesting === 0 ? "</span>" : ""}`;
                };
            }, {
                more_token_range: function(content) {
                    const lastPlusPlus = content.lastIndexOf('++'),
                        type = content.split('||')[0];

                    if (['contact', 'color'].indexOf(type) === -1) {
                        return null;
                    }

                    if (lastPlusPlus === -1) {
                        return null
                    }

                    return {
                        start: lastPlusPlus + 2,
                        end: content.length
                    };
                }
            }]
        ],
        container: [
            ['table-width', {
                validate: function(params) {
                    return table_width_reg.test(params.trim());
                },
                render: function(tokens, index, options, env, self) {
                    if (tokens[index].nesting === 1) {
                        const div_id = gen_id();
                        const match = tokens[index].info.trim().match(table_width_reg);

                        const width_list = (match || []).map(w => w.trim());
                        
                        const style = width_list.map((width, index) =>
                            `#${div_id} td:nth-child(${index + 1}), th:nth-child(${index + 1}) { width: ${width}; }`
                        ).join('\n');

                        const html = `<div id=\"${div_id}\">\n<style>\n${style}\n</style>`;

                        return html;
                    }

                    return self.renderToken(tokens, index, options, env, self);
                }
            }]
        ]
    });


    const mod = {
        parse: function(text, options) {
            options = options || {};
            return md.parse(text, options);
        },
        render: function(text) {
            const result = mod.renderTokens(mod.parse(text));
            return Promise.resolve(result);
        },
        renderTokens: function(tokens) {
            return Promise.resolve(md.renderer.render(tokens, {}));
        }
    };

    return mod;
};

module.exports = make_md;
