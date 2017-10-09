'use strict';

// const Markdown = require('markdown-it');
const mdContainer = require('markdown-it-container');
const inlinePlugin = require('./inline_plugin');

module.exports = function GuideMarkdown(options) {
    const opts = options || {},
        container_list = [
            // [ name, options = {render, validate} ]
        ].concat(opts.container || []),
        inline_list = [
            // [ name, delimeter, render ]
        ].concat(opts.inline || []);
    let md = require('markdown-it')({
        html: true,
        langPrefix: 'language-',
        highlight: function (str, lang) {
            if (lang && hljs.getLanguage(lang)) {
                try {
                    return `<pre class="hljs"><code>${hljs.highlight(lang, str, true).value}</code></pre>`;
                } catch (e) {}
            }

            return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
        }
    });

    md = container_list.reduce(function (prev, cur) {
        const params = [mdContainer].concat(cur);
        return prev.use.apply(prev, params);
    }, md);

    md = inline_list.reduce(function (prev, cur) {
        return prev.use(inlinePlugin.apply(null, cur));
    }, md);

    return md;
};
