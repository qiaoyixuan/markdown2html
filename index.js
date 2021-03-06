// const hljs = require('highlight.js');
const factory = require('./lib/factory');

const table_width_reg = /(\d*[px|%]+)/g;
const code_reg = /^code:(.*)$/;

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

                const [
                    size = 'initial',
                    color = 'initial',
                    background = 'initial',
                    weight = 'initial',
                ] = type.split(/\s+/);
                switch (type) {
                    default:
                        return `<span style="
                            color: ${color};
                            font-size: ${size};
                            font-weight: ${weight};
                            background: ${background}
                            ">${text} ${nesting === 0 ? "</span>" : ""}`;
                };
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

    md.renderer.rules.table_open = function () {
        return '<table class="table table-bordered table-striped">\n';
    };

    const mod = {
        parse: function(text, options) {
            options = options || {};
            return md.parse(text, options);
        },
        render: function(text) {
            return md.render(text);
        }
    };

    return mod;
};

module.exports = make_md;
