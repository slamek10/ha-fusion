import { j as json, x as error } from '../../../../chunks/utils.js-DLsluu6x.js';
import '../../../../chunks/shared.js-D28eHxhC.js';

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

export { POST };
//# sourceMappingURL=_server.ts.js-BBfFy4wF.js.map
