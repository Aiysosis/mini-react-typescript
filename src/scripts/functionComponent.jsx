import { Aiyso } from "../index.js";

/** @jsx Aiyso.createElement */
function App(props) {
	return <h1>Hi {props.name}</h1>;
}
const element = <App name="foo" />;
const container = document.getElementById("root");
Aiyso.render(element, container);
