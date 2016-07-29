var x = require('kit-utils');
var request = require('superagent');
var factory = require('./lib/factory');
var treeTraverse = require('./lib/tree')('children', 'type').treeTraverse;

var make_md = function(opts) {
    var api_host = (opts || {}).api_host || '';

    var get = function(url) {
        return new Promise(function(resolve, reject) {
            try {
                var r = request.get(url);

                r.end(function(err, res) {
                    if (err) {
                        // Note: 获取数据失败后，不要影响整体编译，错误信息在 render 时用红色文字进行提示
                        resolve('get data error');
                    }

                    var data = res.body;

                    resolve(data);
                });
            } catch (e) {
                resolve('get data error: ' + e);
            }
        })
    };

    var gen_id = function() {
        var d = +new Date(),
            r = parseInt(Math.random() * 1000, 10);

        return 'd_' + d + r;
    };

    var md = factory({
        inline: [
            ['custom', '$$', function(tokens, index, options, self) {
                var token = tokens[index],
                    nesting = token.nesting;

                if (nesting === -1) {
                    return '</span>';
                }

                var meta = token.meta,
                    tuple = token.meta.split('||'),
                    type = tuple[0],
                    text = tuple[1];
                switch (type) {
                    case 'contact':
                        return render_contact(type, text, nesting);

                    case 'color':
                        return render_color(type, text, nesting);

                    case 'poi-pdf':
                        return render_poi(type, text);

                    default:
                        return x.sprintf("<span class=\"${type}\">${text}" + (nesting === 0 ? "</span>" : ""), {
                            type: type,
                            text: text
                        });;
                };
            }, {
                more_token_range: function(content) {
                    var lastPlusPlus = content.lastIndexOf('++'),
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
            ['tip'],
            ['color', {
                validate: function(params) {
                    return color_reg.test(params.trim());
                },
                render: function(tokens, index, options, env, self) {
                    var match;

                    if (tokens[index].nesting === 1) {
                        match = tokens[index].info.trim().match(color_reg);
                        tokens[index].attrPush(['style', 'color: ' + match[1]]);
                    }

                    return self.renderToken(tokens, index, options, env, self);
                }
            }],
            ['table-width', {
                validate: function(params) {
                    return table_width_reg.test(params.trim());
                },
                render: function(tokens, index, options, env, self) {

                    if (tokens[index].nesting === 1) {
                        var div_id = gen_id(),
                            match = tokens[index].info.trim().match(table_width_reg),
                            width_list = (match[1] || '').split(',').map(function(w) {
                                return w.trim();
                            }),
                            style = width_list.map(function(width, index) {
                                return x.sprintf('#${div_id} td:nth-child(${index}) { width: ${width}; }', {
                                    div_id: div_id,
                                    width: width,
                                    index: index + 1
                                });
                            }).join("\n"),
                            html = x.sprintf("<div id=\"${div_id}\">\n<style>\n${style}\n</style>", {
                                div_id: div_id,
                                style: style
                            });

                        return html;
                    }

                    return self.renderToken(tokens, index, options, env, self);
                }
            }]
        ]
    });

    var render_color = function(type, text, nesting) {
        var c_tuple = text.split('++'),
            c_color = c_tuple[0],
            c_text = c_tuple[1],
            hex_color_reg = /^#([0-9a-f]{3}|[0-9a-f]{6})$/gi,
            rgb_color_reg = /^rgb\s*\(\d+\s*,\s*\d+\s*,\s*\d+\s*\)$/gi,
            is_color = hex_color_reg.test(c_color) || rgb_color_reg.test(c_color),
            tpl = nesting === 0 ? "<span class=\"guide-color ${color_class}\" style=\"${style}\" >${text}</span>" : "<span class=\"guide-color ${color_class}\" style=\"${style}\" >"

        return x.sprintf(tpl, {
            color_class: !is_color ? c_color : '',
            style: is_color ? 'color: ' + c_color : ''
        });
    };

    var render_contact = function(type, text, nesting) {
        var c_tuple = text.split('++'),
            c_category = c_tuple[0],
            c_text = c_tuple[1],
            c_appendix = c_tuple[2],
            tpl = nesting === 0 ? "<span class=\"${type} ${c_category}\"><span class=\"title\">${c_text}</span><span class=\"text\">${c_appendix}</span></span>" : "<span class=\"${type} ${c_category}\"><span class=\"title\">${c_text}</span>";

        return x.sprintf(tpl, {
            type: type,
            c_category: c_category,
            c_text: c_text,
            c_appendix: c_appendix
        });
    };

    var poi_cache = {};

    var render_poi = function(type, text, en) {
        var p_tuple = text.split('++'),
            p_id = p_tuple[0],
            p_text = p_tuple[1],
            p_appendix = p_tuple[2] || '',
            p_info = poi_cache[p_id] || {},
            p_url = x.sprintf('qyerguide://poi/?id=${p_id}', {
                p_id: p_id
            }),
            h5_url = p_info.h5_url,
            web_url = p_info.web_url;

        if (Object.keys(p_info).length === 0) {
            return x.sprintf("<span style=\"background: red; color: white\">Error: POI_ID ${p_id} 没有找到对应数据!!!!!</span>", {
                p_id: p_id
            });
        }

        return x.sprintf(
            "<a target=\"_blank\" href=\"${p_url}\" web-url=\"${web_url}\" class=\"${type} poi-link\"><span class=\"title\">${p_text}" + (/inline/.test(type) ? "" : "</span><span class=\"poi-word\">查看详情</span>") + "</a>", {
                type: type,
                p_url: p_url,
                p_text: p_text,
                p_appendix: p_appendix,
                web_url: web_url
            }
        );
    };

    var prepare_poi_data = function(tokens) {
        var poi_tokens, p;

        poi_tokens = x.deep_flatten(tokens.map(function(token) {
            var ret = [];

            treeTraverse(token, function(t) {
                if (t.type === 'custom_open' &&
                    (t.meta.split('||')[0] || '').indexOf('poi') !== -1) {
                    ret.push(t);
                }
            });

            return ret;
        }));

        p = poi_tokens.length <= 0 ? Promise.resolve() :
            Promise.all(poi_tokens.map(function(token) {
                var tuple = token.meta.split('||'),
                    type = tuple[0],
                    text = tuple[1];

                if(!type || !text) return;
                var p_id = text.split('++')[0];

                return new Promise(function(resolve, reject) {
                        try {
                            var r = request.get(api_host + '/api/poi/' + p_id);
                            r.end(function(err, res) {
                                    if (err) {
                                        // Note: 获取POI失败后，不要影响整体编译，错误信息在 render poi 时用红色文字进行提示
                                        resolve('poi data error');
                                    }

                                    var data = res.body;

                                    if (data.error_code !== 0) {
                                        console.log(x.sprintf('error_code is not zero, but ${error_code}, poi id: ${poi_id}', {
                                            error_code: data.error_code,
                                            poi_id: p_id
                                        }));

                                        resolve('poi data error');
                                    }

                                    resolve(data.data);
                                });
                        } catch (e) {
                            resolve('poi request error: ' + e);
                        }
                    })
                    .then(function(result) {
                        poi_cache[p_id] = result.detail;
                    });
            }));

        return p.then(function() {
            return tokens;
        });
    };

    var prepare_image_data = x.partial(function(is_pack, tokens) {
        var token_attr = function(token, attr_name) {
            if (!token || !token.attrs) return;

            var found = x.reduce(function(prev, cur) {
                return prev || (cur[0] === attr_name ? cur[1] : null);
            }, null, token.attrs);

            return found ? found : undefined;
        };

        var cdn_reg = /^http:\/\/pic\d*\.qyer\.com/;

        var img_tokens, p;

        img_tokens = x.deep_flatten(tokens.map(function(token) {
            var ret = [];

            treeTraverse(token, function(t) {
                if (t.type === 'image') {
                    ret.push(t);
                }
            });

            return ret;
        }));

        p = img_tokens.length <= 0 ? Promise.resolve() :
            Promise.all(img_tokens.map(function(token) {
                // Note:
                // 1. full用于老锦囊中类似地图这样需要打包大图的图片
                // 2. full-image用于其他后续添加的普通全屏大图
                // 3. 以下条件会使用缩小的图片：
                //		a) 非打包，即线上使用
                //		b) 打包状态下，只缩小full-image图片
                var old_src = token_attr(token, 'src'),
                    is_full = ['full', 'full-image'].indexOf(token.content) !== -1,
                    need_shrink = (!is_pack && is_full) || (is_pack && token.content === 'full-image');

                if (is_full && old_src && cdn_reg.test(old_src)) {
                    if (need_shrink) {
                        token.attrSet('src', old_src + '/680x');
                    }

                    return get(old_src + '?imageInfo')
                        .then(function(data) {
                            if (data && data.width && data.height) {
                                token.attrPush(['data-size', [data.width, data.height].join(',')]);
                            }
                            return token;
                        });
                }

                return Promise.resolve(token);
            }));

        return p.then(function() {
            return tokens;
        });
    });

    var without_nopack = function(tokens) {
        var tuple = x.reduce(function(prev, cur) {
            var tokens = prev[0],
                is_nopack_close = prev[1];

            switch (cur.type) {
                case "container_nopack_open":
                    return [tokens, false];

                case "container_nopack_close":
                    return [tokens, true];

                default:
                    return [
                        is_nopack_close ? tokens.concat([cur]) : tokens,
                        is_nopack_close
                    ];
            }
        }, [
            [], true
        ], tokens);

        return tuple[0];
    };

    var mod = {
        parse: function(text, options) {
            options = options || {};
            return md.parse(text, options);
        },
        render: function(text, is_pack) {
            var result = mod.renderTokens(mod.parse(text), is_pack);
            return Promise.resolve(result);
        },
        renderTokens: function(tokens, is_pack) {

            var prepare = x.compose_promise(
                prepare_author_data,
                prepare_poi_data,
                prepare_image_data(is_pack)
            );

            tokens = is_pack ? without_nopack(tokens) : tokens;

            return prepare(tokens)
                .then(function(tokens) {
                    return md.renderer.render(tokens, {});
                });
        }
    };

    return mod;
};

module.exports = make_md；
