import { error, json } from "@sveltejs/kit";
//#region src/routes/_api/get_calendar/+server.ts
var POST = async ({ request }) => {
	try {
		const { url, token } = await request.json();
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json"
			}
		});
		const data = await response.json();
		if (response.ok) return json(data);
	} catch (err) {
		error(500, err.message);
	}
};
//#endregion
export { POST };
