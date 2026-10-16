import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.CUfQ6NQ-.js","_app/immutable/chunks/Cm_oQ0TZ.js","_app/immutable/chunks/Dz4VTo2Y.js","_app/immutable/chunks/HclGiUj8.js","_app/immutable/chunks/xihTtKlq.js","_app/immutable/chunks/DZM_6FOm.js","_app/immutable/chunks/CtinY9e0.js","_app/immutable/chunks/B2gLBrs5.js"];
export const stylesheets = ["_app/immutable/assets/2.S_lbxmNq.css","_app/immutable/assets/Index.CIbrQPpV.css","_app/immutable/assets/TokenModal.bqHmAd9E.css","_app/immutable/assets/Views.CViw2atk.css","_app/immutable/assets/Index.DDNmDklT.css","_app/immutable/assets/Intro.Dquetp6P.css","_app/immutable/assets/Index.C40TGhtE.css","_app/immutable/assets/MenuButton.Cg2RdvQ2.css"];
export const fonts = [];
