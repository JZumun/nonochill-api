/**
	Rule: { val, count } => {val,count}
	RuleList: [Rule] => [serialize(Rule)]
	RuleGroup: [RuleList] => [serialize(ruleGroup)]
**/

const btoa = str => Buffer.from(str).toString('base64');
const atob = str => Buffer.from(str, "base64").toString();
const serializeRule = rule => `{${rule.val},${rule.count}}`;
const serializeRuleList = list => `[${list.map(serializeRule).join("")}]`;
const serializeRuleGroup = group => `[${group.map(serializeRuleList).join("|")}]`;
const serialize = ({ width, height, colors, column, row, colorScheme = [] }) => {
	return btoa([width, height, colors, serializeRuleGroup(column), serializeRuleGroup(row), colorScheme.join("?")].join("//"));
};

const deserializeRule = string => {
	const arr = string.replace(/[\{\}\[\]]/g, "").split(",").map(x => parseInt(x));
	return { val: arr[0], count: arr[1] };
};
const deserializeList = string => string.split("}{").map(deserializeRule).filter(({ count, val }) => count && val);
const deserializeRuleGroup = string => string.split("|").map(deserializeList);
const deserialize = (string) => {
	const arr = atob(string).split("//");
	return {
		width: parseInt(arr[0]),
		height: parseInt(arr[1]),
		colors: parseInt(arr[2]),
		column: deserializeRuleGroup(arr[3]),
		row: deserializeRuleGroup(arr[4]),
		colorScheme: arr[5] && arr[5].split("?")
	};
};

module.exports = { serialize, deserialize };
