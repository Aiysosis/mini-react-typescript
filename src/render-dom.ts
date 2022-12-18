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
//? 同时，每个 Fiber 还会保留对父 Fiber的引用关系，这样就可以实现回溯/退出操作
type Fiber = {
	type: string;
	dom: HTMLElement | Text;
	props: Props;
	parent: Fiber;
	sibling: Fiber;
	child: Fiber;
};

//* 全局变量：下一个要执行的 Fiber
let nextUnitOfWork: Fiber = null;

function render(element: ElementNode, container: HTMLElement | Text) {
	//* 设置根部的 Fiber,它唯一的孩子节点是 element，父fiber和兄弟fiber都是空
	nextUnitOfWork = {
		type: "ROOT",
		dom: container,
		props: {
			children: [element],
		},
		parent: null,
		sibling: null,
		child: null,
	};
}

function workLoop(deadline: IdleDeadline) {
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}
	requestIdleCallback(workLoop);
}

//? 之前没有接触过的 api，它会在浏览器有空闲的时候执行我们的Fiber，并获取下一个 Fiber，直到执行完毕
requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber): Fiber {
	//* add dom node
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}
	//* 向父元素添加dom元素
	if (fiber.parent) {
		fiber.parent.dom.appendChild(fiber.dom);
	}

	//* create new fibers
	const children = fiber.props.children;
	let prevSibling: Fiber = null;

	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const newFiber: Fiber = {
			type: child.type,
			props: child.props,
			dom: null, // to be created when perform
			parent: fiber,
			sibling: null, //to be set immediately
			child: null, //to be set when perform
		};
		//* 将 newFiber找个地方存起来
		if (i === 0) {
			fiber.child = newFiber;
		} else {
			prevSibling.sibling = newFiber;
		}
		prevSibling = newFiber;
	}
	//* return next unit of work
	//? 这里的思路比较好玩：首先检查child，如果没有child则检查sibling，如果还是没有就 [退回到 parent，检查sibling].loop
	if (fiber.child) {
		return fiber.child;
	} else {
		let f = fiber;
		while (f) {
			if (f.sibling) {
				return f.sibling;
			}
			f = f.parent;
		}
		return null;
	}
}

function createDom(fiber: Fiber): HTMLElement | Text {
	//* implement this fn
	const { type, props } = fiber;

	const dom =
		type === "TEXT_ELEMENT"
			? document.createTextNode(props.nodeValue)
			: document.createElement(type);

	for (const key in props) {
		if (key === "children") continue;
		dom[key] = props[key];
	}

	return dom;
}

export const Aiyso = {
	createElement,
	render,
};
