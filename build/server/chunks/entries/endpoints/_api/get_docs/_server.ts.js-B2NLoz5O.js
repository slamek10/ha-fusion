import { j as json, x as error } from '../../../../chunks/utils.js-DLsluu6x.js';
import { readdir, readFile } from 'fs/promises';
import { marked } from 'marked';
import '../../../../chunks/shared.js-D28eHxhC.js';

//#region src/routes/_api/get_docs/+server.ts
var GET = async ({ setHeaders }) => {
	try {
		const dir = "./build/client/documentation";
		const mdFiles = (await readdir(dir)).filter((file) => file.endsWith(".md"));
		const results = await Promise.all(mdFiles.map(async (file) => {
			const data = await readFile(`${dir}/${file}`, "utf-8");
			const parsed = marked.parse(data);
			return [file.replace(".md", ""), parsed];
		}));
		setHeaders({ "Cache-Control": "max-age=0" });
		return json(Object.fromEntries(results));
	} catch (err) {
		error(500, err.message);
	}
};

export { GET };
//# sourceMappingURL=_server.ts.js-B2NLoz5O.js.map
