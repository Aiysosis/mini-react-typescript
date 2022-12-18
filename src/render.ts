import { createDom, createTextElement } from "./render-dom.js";

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

//? 引入 Fiber（纤程）的概念，每个虚拟节点的渲染都通过各自的 Fiber完成，且 Fiber之间是链式调用的关系
//? 对于某一个 Fiber,在它执行完毕后，由浏览器选择是暂停渲染还是继续下一个 Fiber
//? Fiber 也构成的树状的关系，其调用顺序为：先调用 children的 Fiber，如果没有孩子，那么调用 sibling的 Fiber
//? 同时，每个 Fiber 还会保留对父 Fiber的引用关系，这样就可以实现回溯/退出操作
export type Fiber = {
	type: string;
	dom: HTMLElement | Text;
	props: Props;
	parent: Fiber;
	sibling: Fiber;
	child: Fiber;
};

//* 全局变量：下一个要执行的 Fiber
let nextUnitOfWork: Fiber = null;
//* 全局变量 witRoot, 暂存没有渲染完的 根fiber,等全部渲染完成之后把整棵树一起挂到 root container上
//* 这样用户就不会看到只渲染了一部分的界面
let witRoot: Fiber = null;

function render(element: ElementNode, container: HTMLElement | Text) {
	//* 设置根部的 Fiber,它唯一的孩子节点是 element，父fiber和兄弟fiber都是空
	const rootFiber: Fiber = {
		type: "ROOT",
		dom: container,
		props: {
			children: [element],
		},
		parent: null,
		sibling: null,
		child: null,
	};
	nextUnitOfWork = witRoot = rootFiber;
}

function workLoop(deadline: IdleDeadline) {
	let shouldYield = false;
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
		shouldYield = deadline.timeRemaining() < 1;
	}
	//* 如果全部节点都创建完毕，那么此时 witRoot == rootFiber, nextUnitOfWork == null;
	//! 在更新时会不会导致重复挂载整棵树而带来性能问题？ -> 会，所以在commitRoot之后设置witRoot为null, 这样就解决了这个问题
	if (!nextUnitOfWork && witRoot) {
		commitRoot();
	}

	// 再次注册回调函数
	requestIdleCallback(workLoop);
}

function commitRoot() {
	//* 此时所有fiber内部的dom都已创建完成
	commitWork(witRoot.child);
	witRoot = null;
}

function commitWork(fiber: Fiber) {
	//最开始拿到的是根节点的 child，也就是最外层元素对应的fiber
	//? 从上往下挂载 or 从下往上挂载？
	if (!fiber) return;
	const parentDom = fiber.parent.dom;
	parentDom.appendChild(fiber.dom);
	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

//? 之前没有接触过的 api，它会在浏览器有空闲的时候执行我们的Fiber，并获取下一个 Fiber，直到执行完毕
//? 可以理解为 setTimeout,只是这个延迟执行是由浏览器自动调度的，我们通过requestIdleCallback 注册回调之后
//? 浏览器会在空闲的时候响应我们注册的请求

requestIdleCallback(workLoop);

function performUnitOfWork(fiber: Fiber): Fiber {
	//* add dom node
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}
	//* 向父元素添加dom元素
	//! 不直接提交，而是等全部节点创建完毕后统一提交 @ref -> witRoot
	// if (fiber.parent) {
	// 	fiber.parent.dom.appendChild(fiber.dom);
	// }

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

export const Aiyso = {
	createElement,
	render,
};
