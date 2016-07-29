# 介绍
* 此md编译器基于 [markdown-it](https://github.com/markdown-it)，该库语法扩展性较为出色
* 可根据具体的需求，做以下扩展
    * block级扩展：
        ```
        ::: tip
            tip content
        :::
        ```
    * inline级扩展：
            ```
            $$inline||data$$
            ```

# 使用方法
``` javascript
    var md = require('guide-markdown')();

    md.parse(md_text, {}); //分析语法，获取token
    md.render(md_text); //渲染
```
