export function createElement(type, props, ...children) {
	console.log(children);
	return {
		type,
		props: {
			...props,
			children: children.map(child =>
				typeof child === "object" ? child : createTextElement(child)
			),
		},
	};
}

function createTextElement(text) {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

function render(element, container) {
	const { type, props } = element;
	const children = props.children;

	const dom =
		type === "TEXT_ELEMENT"
			? document.createTextNode(props.nodeValue)
			: document.createElement(type);

	for (const child of children) {
		render(child, dom); //递归调用
	}

	for (const key in props) {
		if (key === "children") continue;
		dom[key] = props[key];
	}

	container.appendChild(dom);
}

export const Aiyso = {
	createElement,
	render,
};
