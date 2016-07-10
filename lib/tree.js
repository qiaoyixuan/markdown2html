'use strict';

module.exports = function (children_key, value_key) {

    var reduceLeft = function (fn, initial, list) {
        var ret = initial;

        for(var i = 0, len = list.length; i < len; i++) {
            ret = fn(ret, list[i], i, list);  
        }

        return ret;
    };

	/*
	 * The key to reduce a tree is keeping the structure in every tree node, in case someone want to reconstruct the tree (e.g. treeMap, treeFilter)
	 * so a tree node is wrapped in a {Tuple} [node, node_path]
	 *
	 * @param {Function} fn A binary function,
	 * whose first arg is the prev value {any}
	 * and  second arg is current node {Tuple} [node, node_path]
	 * @param {any} initial value
	 * @param {Tuple} node tuple [node, node_path]
	 * @returns {any} result value of the same type as initial
	 */
	var treeReduce = function (fn, initial, tree_tuple) {
		var tree = tree_tuple[0],
			path = tree_tuple[1],
			ret  = fn(initial, tree_tuple);

		return (tree[children_key] && tree[children_key].length) ?
			reduceLeft(function (prev, cur, i) {
				return treeReduce(fn, prev, [cur, path.concat([i])])
			}, ret, tree[children_key])
		: ret;
	};

    var walk = function (root, fn) {
        fn(root);

        if (root[children_key]) {
            for (var i = 0, len = root[children_key].length; i < len; i += 1) {
                walk(root[children_key][i], fn); 
            }
        }
    };

    var search_node = function (root, data_pattern, need_list) {
        var result = [],
            check = function (node) {
                return reduceLeft(function (prev, cur) {
                    return prev && (node[value_key][cur] === data_pattern[cur]);
                }, true, Object.keys(data_pattern));
            };

        walk(root, function (node) {
            if ((need_list || result.length === 0) && check(node)) {
                result.push(node);
            } 
        });

        return need_list ? result : result[0];
    };

	var find_node = function (root, path) {
		if (path.length == 1) return root;

		return reduceLeft(function (node, index) {
			return node && node[children_key] && node[children_key][index];
		}, root, path.slice(1))
	};

	var clone_node= function (node) {
		var ret = {};
		ret[value_key] = node[value_key];
		return ret;
	};

	var normalize = function (tree) {
		if (!tree || !tree[children_key]) return;
		tree[children_key] = tree[children_key].filter(function (x) {return !!x;});
		tree[children_key].map(function (node) {normalize(node)});
		return tree;
	};

	var treeMap = function (fn, orig_tree) {
		return treeReduce(function (prev, tree_tuple) {
			var tree = tree_tuple[0],
				path = tree_tuple[1];

			if (!prev)  return fn(tree);

			var parent_path     = path.slice(0, -1),
				index           = path[path.length - 1],
				parent          = find_node(prev, parent_path),
				orig_parent     = find_node(orig_tree, parent_path),
				orig_child_count= (orig_parent[children_key] || []).length;

			if (parent) {
				parent[children_key] = parent[children_key] || (new Array(orig_child_count)).map(function () { return null; });
				parent[children_key][index] = fn(tree, index, parent, prev);
			}

			return prev;
		}, null, [orig_tree, [0]]);
	};

	var treeFilter = function (predicate, orig_tree) {
		var ret = treeReduce(function (prev, tree_tuple) {
			var tree = tree_tuple[0],
			   path = tree_tuple[1];

			if (prev === undefined) return undefined;
			if (prev === null)  return predicate(tree) ? clone_node(tree) : undefined;

			var parent_path     = path.slice(0, -1),
				index           = path[path.length - 1],
				parent          = find_node(prev, parent_path),
				orig_parent     = find_node(orig_tree, parent_path),
				orig_child_count= (orig_parent[children_key] || []).length;

			if (parent && predicate(tree)) {
				parent[children_key] = parent[children_key] || (new Array(orig_child_count)).map(function () { return null; });
				parent[children_key][path[path.length - 1]] = clone_node(tree);
			}

			return prev;
		}, null, [orig_tree, [0]])

		return normalize(ret);
	};

	return {
		treeMap: treeMap,
		treeReduce: treeReduce,
		treeFilter: treeFilter,
        treeCopy: function (node) { return treeFilter(function (node) { return true; }, node); },
        treeTraverse: walk,
        search_node: search_node
	};
};
