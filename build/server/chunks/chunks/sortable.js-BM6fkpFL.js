import 'sortablejs';

function updatePointer(e) {
	e?.clientX ?? e?.touches?.[0]?.clientX ?? e?.changedTouches?.[0]?.clientX;
	e?.clientY ?? e?.touches?.[0]?.clientY ?? e?.changedTouches?.[0]?.clientY;
}
if (typeof window !== "undefined") {
	window.addEventListener("keydown", (event) => {
		if (event.key === "Alt");
	});
	window.addEventListener("keyup", (event) => {
		if (event.key === "Alt");
	});
	window.addEventListener("blur", () => {});
	window.addEventListener("dragover", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("drag", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("drop", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("mousemove", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("pointermove", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("touchmove", updatePointer, {
		passive: true,
		capture: true
	});
	window.addEventListener("touchend", updatePointer, {
		passive: true,
		capture: true
	});
}
//# sourceMappingURL=sortable.js-BM6fkpFL.js.map
