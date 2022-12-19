import { ElementNode, Props } from "./createElement.js";

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
	alternate: Fiber; //指向老的 fiber节点
	effectTag: EffectTag;
};

export enum EffectTag {
	UPDATE,
	PLACEMENT,
	DELETION,
}

//* 全局变量：下一个要执行的 Fiber
let nextUnitOfWork: Fiber = null;
//* 全局变量 witRoot, 暂存没有渲染完的 根fiber,等全部渲染完成之后把整棵树一起挂到 root container上
//* 这样用户就不会看到只渲染了一部分的界面
let witRoot: Fiber = null;
//* 记录当前渲染的 fiber树，用于更新
let currentRoot: Fiber = null;
//* 记录需要删除的fiber，用于统一删除
let deletions: Fiber[] = null;

export function render(element: ElementNode, container: HTMLElement | Text) {
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
		alternate: currentRoot,
		effectTag: EffectTag.PLACEMENT, //todo chek this
	};
	deletions = [];
	nextUnitOfWork = witRoot = rootFiber;
	//? 用于调试
	window["currentRoot"] = rootFiber;
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

//? 之前没有接触过的 api，它会在浏览器有空闲的时候执行我们的Fiber，并获取下一个 Fiber，直到执行完毕
//? 可以理解为 setTimeout,只是这个延迟执行是由浏览器自动调度的，我们通过requestIdleCallback 注册回调之后
//? 浏览器会在空闲的时候响应我们注册的请求

requestIdleCallback(workLoop);

function commitRoot() {
	//* 此时所有fiber内部的dom都已创建完成
	//* 先执行删除，再执行创建
	deletions.forEach(fiber => commitWork(fiber));
	commitWork(witRoot.child);
	currentRoot = witRoot; //备份
	witRoot = null;
}

//* 挂载和删除都在这里
function commitWork(fiber: Fiber) {
	//最开始拿到的是根节点的 child，也就是最外层元素对应的fiber
	//? 从上往下挂载 or 从下往上挂载？ 前者，递归
	if (!fiber) return;
	switch (fiber.effectTag) {
		case EffectTag.PLACEMENT:
			placeDom(fiber);
			break;
		case EffectTag.DELETION:
			deleteDom(fiber);
			break;
		case EffectTag.UPDATE:
			updateDom(fiber);
			break;
		default:
			throw new Error(
				"Unexpected effectTag in @fn commitWork in @file render.ts"
			);
	}
	commitWork(fiber.child);
	commitWork(fiber.sibling);
}

function placeDom(fiber: Fiber) {
	if (!fiber.dom) return;
	fiber.parent.dom.appendChild(fiber.dom);
}

function deleteDom(fiber: Fiber) {
	if (!fiber.dom) return;
	fiber.parent.dom.removeChild(fiber.dom);
}

const isProperty = (key: string) => key !== "children";
const isEvent = (key: string) => key.startsWith("on");
const eventName = (name: string) => name.toLowerCase().slice(2); // onClick -> click

function updateDom(fiber: Fiber) {
	if (!fiber.dom) return;
	const { props, alternate, dom } = fiber;
	const prevProps = alternate.props;

	//* 删除 原来有的属性现在没有了
	for (const key in prevProps) {
		if (isProperty(key) && !(key in props)) {
			if (isEvent(key)) {
				dom.removeEventListener(eventName(key), prevProps[key]);
			} else dom[key] = "";
		}
	}

	//* 添加 原来没有的属性现在有了
	for (const key in props) {
		if (isProperty(key) && !(key in prevProps)) {
			if (isEvent(key)) {
				dom.addEventListener(eventName(key), props[key]);
			} else dom[key] = props[key];
		}
	}
}

export function createDom(fiber: Fiber): HTMLElement | Text {
	//* implement this fn
	const { type, props } = fiber;

	const dom =
		type === "TEXT_ELEMENT"
			? document.createTextNode(props.nodeValue)
			: document.createElement(type);

	for (const key in props) {
		if (isProperty(key)) {
			if (isEvent(key)) {
				dom.addEventListener(eventName(key), props[key]);
			} else dom[key] = props[key];
		}
	}

	return dom;
}

function performUnitOfWork(fiber: Fiber): Fiber {
	//* add dom node
	if (!fiber.dom) {
		fiber.dom = createDom(fiber);
	}

	//* create new fibers
	const children = fiber.props.children;
	//? diff 算法
	reconcileChildren(children, fiber);

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

const isSameType = (element: ElementNode | null, fiber: Fiber | null) =>
	element && fiber && element.type === fiber.type;

function reconcileChildren(children: ElementNode[], fiber: Fiber) {
	let oldFiber = fiber.alternate ? fiber.alternate.child : null;
	// oldFiber 对齐 fiber的第一个孩子，之后逐个对比即可
	// fiber -> children: [child0, child1 ...]
	//                       ↑ oldFiber

	let prevSibling: Fiber = null;
	let idx = 0;

	while (idx < children.length || oldFiber) {
		const child = children[idx];

		//* 将child 和 oldFiber进行逐个对比
		//* 只实现了效率非常低的 diff算法，没有考虑到位置变化的情况，而是直接对比
		let newFiber: Fiber = null;

		if (isSameType(child, oldFiber)) {
			//* 相同type，更新
			newFiber = {
				type: oldFiber.type, //inherit
				props: child.props, //update
				dom: oldFiber.dom, //inherit
				child: null, //reset
				parent: fiber,
				sibling: null,
				alternate: oldFiber,
				effectTag: EffectTag.UPDATE, //flag
			};
		} else {
			//* 只要type不相同，那么就卸载老节点，放入新节点
			//! 完全没有优化
			if (child) {
				//oldFiber == null || oldFiber.type !== child.type
				//* 添加新节点
				newFiber = {
					type: child.type,
					props: child.props,
					dom: null, //to be set in next idle
					parent: fiber,
					sibling: null, //to be set immediately
					child: null, //to be set in next idle
					alternate: null, //to be set if updated
					effectTag: EffectTag.PLACEMENT, //flag
				};
			}
			if (oldFiber) {
				//chlid == null || oldFiber.type !== child.type
				//* 删除老节点，这里采用标记收集，然后统一删除的处理策略
				oldFiber.effectTag = EffectTag.DELETION;
				deletions.push(oldFiber);
			}
		}

		if (oldFiber) oldFiber = oldFiber.sibling;

		//* 将 newFiber存储到对应位置
		if (idx === 0) {
			fiber.child = newFiber;
		} else {
			prevSibling.sibling = newFiber;
		}
		prevSibling = newFiber;

		idx++;
	}
}
