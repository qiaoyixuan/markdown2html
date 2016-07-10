/* global __DEVELOPMENT__ */

import request from 'superagent';
import path from 'path';
import isObject from 'lodash/isObject';

import {json2formdata} from './utils';

let cache = {};

const unbox = (result) => {
    if (result && parseInt(result.error_code) === 0) {
        return result.data;
    }

    return null;
}

const param = (json) => {
    if (isObject(json)) {
        return json2formdata(json);
    }

    return json;
}

const full_path = (url) => {
    if (/^http/.test(url))  return url;
    return path.join('/api/', url);   
};

const method_list = ['get', 'post', 'put', 'patch', 'del'];

const base = method_list.reduce((prev, method) => {
    prev[method] = (url, options) => new Promise((resolve, reject) => {
        let full_url = full_path(url),
            use_cache = options && options.cache; 

        if (use_cache && cache[full_url] !== undefined) {
            resolve(cache[full_url]);
        }

        let req = request[method](full_path(url));

        if (options && options.data) {
            let fn = method === "post" ? "send" : "query";

            if (method === "post") {
                req.set('Content-Type', 'application/x-www-form-urlencoded');
            }

            req[fn](param(options.data));
        }

        req.end((err, res) => {
            if (err) reject({error_code: -1, err});

            let ret = res.body,
                data = unbox(ret);

            if (data) {
                if (use_cache)  cache[full_url] = data;
                resolve(data);
            } else {
                reject({
                    error_code: ret.error_code,
                    err: ret.result
                });
            }
        });
    });

    return prev;
}, {});

const ajax = Object.assign({
    batch: (list) => {
        let tasks = list.map(({method, url, options}) =>  {
            return base[method](url, options);
        });

        return Promise.all(tasks);
    },
    cache: method_list.reduce((prev, cur) => {
        prev[cur] = (url, options = {}) => {
            return ajax[cur](url, {...options, cache: true});
        };
        return prev;
    }, {})
}, base); 

export default ajax;
