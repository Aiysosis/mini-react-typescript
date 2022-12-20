import {
	context,
	EffectTag,
	Fiber,
	FunctionComponent,
	reconcileChildren,
} from "./render.js";

//? 声明为全局变量，它们会在调用组件函数时被使用
let wipFiber: Fiber = null;
let hookIndex: number = null;

export function updateFunctionComponent(fiber: Fiber) {
	//* 函数式组件是不需要创建dom的，其子元素会挂载到组件的父节点上
	wipFiber = fiber;
	//init hooks
	wipFiber.hooks = [];
	hookIndex = 0;

	const componentRoot = (fiber.type as FunctionComponent)(fiber.props); //<- call useState hooks

	reconcileChildren(componentRoot.props.children, fiber);
}

export type Hook<T> = {
	state: T;
	queue: any[];
};

type StateSetter<T> = (val: T) => void;
export function useState<T>(initial: T): [T, StateSetter<T>] {
	//! 什么时候会访问同一个hook？或者说 hookIndex是如何变化的？这会涉及到类型的问题，
	//! 如果第一次设置为 number，第二次调用useState 变成了string，那么返回的是第一次的 number，但是类型会把它推断为string
	//! 这里先默认重复调用的 useState 具有相同的类型

	const oldHook =
		wipFiber.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[hookIndex];

	const hook: Hook<T> = {
		state: oldHook ? oldHook.state : initial,
		queue: [],
	};

	const actions = oldHook ? oldHook.queue : [];
	actions.forEach(action => {
		hook.state = action(hook.state);
	});

	const setState: StateSetter<T> = action => {
		const { currentRoot } = context;
		hook.queue.push(action);
		context.wipRoot = {
			type: "ROOT",
			dom: currentRoot.dom,
			props: currentRoot.props,
			alternate: currentRoot,
			parent: null,
			child: currentRoot.child,
			sibling: null,
			effectTag: EffectTag.PLACEMENT,
			hooks: null,
		};
		context.nextUnitOfWork = context.wipRoot;
		context.deletions = [];
	};

	wipFiber.hooks.push(hook);
	hookIndex++;
	return [hook.state, setState];
}
