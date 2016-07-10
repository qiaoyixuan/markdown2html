# 介绍
* 此md编译器基于 [markdown-it](https://github.com/markdown-it)，该库语法扩展性较为出色
* 根据锦囊的需求，做以下扩展
    * block级扩展：
        * tip
            ```
            ::: tip
                tip content
            ::: 
            ```
    * inline级扩展：
        * 广告
            ```
            @@123@@
            ```

# 使用方法
```
var md = require('guide-markdown')();

md.render(md_text)
```
    
