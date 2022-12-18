export interface ElementNode {
	type: string;
	props: Props;
}

type Props = {
	children: ElementNode[];
} & Record<string, any>;

export function createElement(
	type: string,
	props: Record<string, any>,
	...children: (ElementNode | string)[]
): ElementNode {
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

function createTextElement(text: string): ElementNode {
	return {
		type: "TEXT_ELEMENT",
		props: {
			nodeValue: text,
			children: [],
		},
	};
}

//? 引入 Fiber（纤程）的概念，每个虚拟节点的渲染都通过各自的 Fiber完成，且 Fiber之间是链式调用的关系
//? 对于某一个 Fiber,在它执行完毕后，由浏览器选择是暂停渲染还是继续下一个 Fiber
//? Fiber 也构成的树状的关系，其调用顺序为：先调用 children的 Fiber，如果没有孩子，那么调用 sibling的 Fiber

//* 全局变量：下一个要执行的 Fiber
// let nextUnitOfWork = null;

// function render(element, container) {
// 	//* 设置根部的 Fiber
// 	nextUnitOfWork = {
// 		dom: container,
// 		props: {
// 			children: [element],
// 		},
// 	};
// }

function render(element: ElementNode, container: HTMLElement | Text) {
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
