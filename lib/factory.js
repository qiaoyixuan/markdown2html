'use strict';

var Markdown = require('markdown-it');
var mdContainer = require('markdown-it-container');
var inlinePlugin = require('./inline_plugin');

module.exports = function GuideMarkdown(options) {
    var opts = options || {},
        container_list = [
            // [ name, options = {render, validate} ]
        ].concat(opts.container || []),
        inline_list = [
            // [ name, delimeter, render ]
        ].concat(opts.inline || []),
        md = new Markdown({ html: true });

    md = container_list.reduce(function (prev, cur) {
        var params = [mdContainer].concat(cur);
        return prev.use.apply(prev, params);
    }, md);

    md = inline_list.reduce(function (prev, cur) {
        return prev.use(inlinePlugin.apply(null, cur));
    }, md);

    return md;
};
