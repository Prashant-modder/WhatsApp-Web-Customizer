const PLACEHOLDER_SRC="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 9'%3E%3Crect fill='%23242530' width='16' height='9'/%3E%3C/svg%3E",THEME_SLOTS=["welcome","sidenav","chatview","navside"];let predefinedSrcs=[],uploadedImages=[],disabledImages=new Set,currentType=null,selectedSrc=null,renderToken=0;const urlToDataUrlCache=new Map,modal=document.getElementById("image-modal"),modalGallery=document.getElementById("modal-gallery"),modalTitle=document.getElementById("modal-title"),modalUploadBtn=document.getElementById("modal-upload");function isUsableSrc(e){return"string"==typeof e&&/^(https?:|data:)/.test(e)}function previewFor(e){return isUsableSrc(e)?e:PLACEHOLDER_SRC}function isUserImage(e){return uploadedImages.some(a=>a.dataUrl===e)}function isPredefinedImage(e){return predefinedSrcs.includes(e)}function setPreview(e,a){const t=document.getElementById(`${e}-preview`);t&&(t.src=previewFor(a))}function openManagePage(){try{window.track&&window.track("image_manager_opened")}catch(e){}const e=chrome.runtime.getURL("src/pages/images/manage-images.html");chrome.tabs&&chrome.tabs.create?chrome.tabs.create({url:e}):window.open(e,"_blank")}function fetchAsDataUrl(e){return urlToDataUrlCache.has(e)?Promise.resolve(urlToDataUrlCache.get(e)):fetch(e,{mode:"cors"}).then(e=>{if(!e.ok)throw new Error(`HTTP ${e.status}`);return e.blob()}).then(e=>{if(!e.type||!e.type.startsWith("image/"))throw new Error("The URL did not return an image.");return new Promise((a,t)=>{const o=new FileReader;o.onload=()=>a(o.result),o.onerror=()=>t(o.error||new Error("Read failed.")),o.readAsDataURL(e)})}).then(a=>(urlToDataUrlCache.set(e,a),a))}async function ensureDataUrl(e){return"string"==typeof e&&e?e.startsWith("data:")?e:/^https?:/.test(e)?await fetchAsDataUrl(e):null:null}async function migrateLegacySlots(e){const a={};for(const t of THEME_SLOTS){const o=e[t];if("string"==typeof o&&/^https?:/.test(o))try{a[t]=await fetchAsDataUrl(o)}catch(e){console.warn(`Legacy ${t} slot could not be converted:`,e)}}Object.keys(a).length>0&&chrome.storage.local.set(a)}function extractPredefinedSrcs(e){const a=[];if(!e)return a;for(const t of Object.keys(e)){if("uploaded"===t)continue;const o=e[t]?.files;if(Array.isArray(o))for(const e of o)isUsableSrc(e)&&a.push(e)}return a}function visibleSrcs(){const e=new Set,a=[];for(const t of predefinedSrcs)disabledImages.has(t)||e.has(t)||(e.add(t),a.push(t));for(const t of uploadedImages){const o=t.dataUrl;!isUsableSrc(o)||disabledImages.has(o)||e.has(o)||(e.add(o),a.push(o))}return a}function renderGallery(){const e=++renderToken;modalGallery.innerHTML="";const a=visibleSrcs();if(0===a.length){const e=document.createElement("div");return e.className="gallery-empty-hint",e.style.cssText="padding:20px;color:#a0a0a0;font-size:13px;text-align:center;width:100%",e.textContent="No images available. Use “Manage Images” to add some.",void modalGallery.appendChild(e)}let t=0;const o=()=>{if(e!==renderToken)return;const n=document.createDocumentFragment(),r=Math.min(t+12,a.length);for(let e=t;e<r;e++)n.appendChild(createOption(a[e]));modalGallery.appendChild(n),t=r,t<a.length?(window.requestIdleCallback||window.requestAnimationFrame)(o,{timeout:100}):selectedSrc&&selectImageInGallery(selectedSrc)};o()}function createOption(e){const a=document.createElement("div");a.className="image-option",a.dataset.src=e;const t=document.createElement("img");t.alt="",t.loading="lazy",t.decoding="async",t.src=e,a.appendChild(t);const o=document.createElement("button");return o.className="delete-btn",o.textContent="✕",o.title=isPredefinedImage(e)?"Hide this image":"Delete this image",o.addEventListener("click",a=>{a.stopPropagation(),deleteImage(e)}),a.appendChild(o),a.addEventListener("click",()=>{modalGallery.querySelectorAll(".image-option.selected").forEach(e=>e.classList.remove("selected")),a.classList.add("selected"),selectedSrc=e,clearModalError(),currentType&&setPreview(currentType,e)}),a}function selectImageInGallery(e){modalGallery.querySelectorAll(".image-option.selected").forEach(e=>e.classList.remove("selected"));const a=modalGallery.querySelector(`.image-option[data-src="${cssEscape(e)}"]`);a&&(a.classList.add("selected"),selectedSrc=e)}function cssEscape(e){return window.CSS&&CSS.escape?CSS.escape(e):e.replace(/"/g,'\\"')}function deleteImage(e){let a=null;if(isUserImage(e))a="user",uploadedImages=uploadedImages.filter(a=>a.dataUrl!==e),chrome.storage.local.set({uploadedImages:uploadedImages},()=>clearSlotsUsing(e)),disabledImages.delete(e)&&chrome.storage.local.set({disabledImages:[...disabledImages]});else{if(!isPredefinedImage(e))return;a="predefined",disabledImages.add(e),chrome.storage.local.set({disabledImages:[...disabledImages]},()=>clearSlotsUsing(e))}try{window.track&&window.track("image_deleted",{kind:a,from_page:"popup",source:"popup"})}catch(e){}selectedSrc===e&&(selectedSrc=null),renderGallery()}function clearSlotsUsing(e){chrome.storage.local.get(THEME_SLOTS,a=>{const t=THEME_SLOTS.filter(t=>a[t]===e);0!==t.length&&chrome.storage.local.remove(t,()=>{t.forEach(e=>setPreview(e,null))})})}function openModal(e){currentType=e,modalTitle.innerHTML=`Image selection for <b><i>${e}</i></b>`,modal.style.display="flex",modalGallery.scrollTo({top:0}),clearModalError();try{window.track&&window.track("image_modal_opened",{slot:e})}catch(e){}chrome.storage.local.get([e],a=>{a[e]&&selectImageInGallery(a[e])})}function closeModal(e="cancel"){const a=currentType;modal.style.display="none",currentType=null,selectedSrc=null,clearModalError();try{a&&window.track&&window.track("image_modal_closed",{slot:a,outcome:e})}catch(e){}}
/* ── inline modal error + slot-set telemetry helpers (Task 1) ─────────────── */
function showModalError(msg){const el=document.getElementById("modal-error");el&&(el.textContent=msg||"",el.style.display=msg?"block":"none")}
function clearModalError(){showModalError("")}
// Byte size of the image actually persisted (decoded from the base64 dataURL).
function dataUrlByteSize(d){try{if("string"!=typeof d)return null;const i=d.indexOf(",");const b=i>=0?d.slice(i+1):d;const pad=b.endsWith("==")?2:b.endsWith("=")?1:0;return Math.max(0,Math.floor(b.length*3/4)-pad)}catch(e){return null}}
/* ── oversized-image optimisation (Task 3) ───────────────────────────────────
 * Backgrounds don't need more than ~1080p; large uploads bloat storage/memory and
 * are the size path behind background_slot_set_failed. Downscale + re-encode
 * oversized raster images before persisting. Best-effort: ANY failure returns the
 * original untouched, so optimisation can only help — it never adds a failure. */
const WC_IMG_MAX_DIM=1920,WC_IMG_MAX_BYTES=2e6;
function wcLoadImage(src){return new Promise((res,rej)=>{const i=new Image;i.onload=()=>res(i);i.onerror=()=>rej(new Error("image decode failed"));i.src=src})}
async function optimizeImageDataUrl(dataUrl){
  try{
    if("string"!=typeof dataUrl||!dataUrl.startsWith("data:image/"))return{dataUrl:dataUrl,optimized:!1};
    if(/^data:image\/svg\+xml/i.test(dataUrl))return{dataUrl:dataUrl,optimized:!1}; // vector: tiny, and would rasterise
    const originalBytes=dataUrlByteSize(dataUrl);
    const img=await wcLoadImage(dataUrl);
    const oversized=originalBytes&&originalBytes>WC_IMG_MAX_BYTES||img.naturalWidth>WC_IMG_MAX_DIM||img.naturalHeight>WC_IMG_MAX_DIM;
    if(!oversized)return{dataUrl:dataUrl,optimized:!1};
    const scale=Math.min(1,WC_IMG_MAX_DIM/Math.max(img.naturalWidth,img.naturalHeight));
    const w=Math.max(1,Math.round(img.naturalWidth*scale)),h=Math.max(1,Math.round(img.naturalHeight*scale));
    const canvas=document.createElement("canvas");canvas.width=w,canvas.height=h;
    const ctx=canvas.getContext("2d");if(!ctx)return{dataUrl:dataUrl,optimized:!1};
    ctx.drawImage(img,0,0,w,h);
    let q=.85,out=canvas.toDataURL("image/jpeg",q);
    while(dataUrlByteSize(out)>WC_IMG_MAX_BYTES&&q>.5){q=Math.round(10*(q-.1))/10;out=canvas.toDataURL("image/jpeg",q)}
    // Only adopt the re-encode if it is genuinely smaller than the original.
    return dataUrlByteSize(out)<originalBytes?{dataUrl:out,optimized:!0,originalBytes:originalBytes}:{dataUrl:dataUrl,optimized:!1}
  }catch(e){return{dataUrl:dataUrl,optimized:!1}}
}
// Three-way origin taxonomy for analytics: 'preset' (a bundled gallery image),
// 'url' (the user added their own image by URL — uploadedImages entries record
// source:"url"/originalUrl in manage-images.js), or 'upload' (a user file).
// Legacy entries without a recorded source fall through to 'upload'.
function classifySlotSource(src){if(isPredefinedImage(src))return"preset";const e=uploadedImages.find(u=>u&&u.dataUrl===src);return e&&("url"===e.source||e.originalUrl)?"url":"upload"}
// Map a thrown error to a stable, PII-free reason for analytics + user copy.
function classifySlotError(err){if(err&&err.reason)return err.reason;const m=err&&err.message?String(err.message):"";if(/quota|QUOTA_BYTES|exceeded/i.test(m))return"storage_quota";if(/HTTP\s+\d{3}/i.test(m))return"http_error";if(/did not return an image/i.test(m))return"not_an_image";if(/cross-origin|CORS|Failed to fetch|NetworkError|Load failed|fetch/i.test(m))return"cors_or_network";return"unknown"}
function slotErrorMessage(reason){switch(reason){case"cors_or_network":return"That image couldn't be loaded — the site blocked cross-origin access. Upload it from your device via “Manage Images” instead.";case"storage_quota":return"Out of space for backgrounds. Remove an existing image and try again.";case"not_an_image":return"That link didn't point to an image. Try a different one.";case"http_error":return"Couldn't download that image (the server returned an error). Try a different one.";default:return"Couldn't set that background. Please try a different image."}}modalUploadBtn&&(modalUploadBtn.textContent="Manage Images"),document.addEventListener("DOMContentLoaded",()=>{chrome.storage.local.get([...THEME_SLOTS,"uploadedImages","disabledImages"],e=>{THEME_SLOTS.forEach(a=>setPreview(a,e[a])),uploadedImages=Array.isArray(e.uploadedImages)?e.uploadedImages:[],disabledImages=new Set(Array.isArray(e.disabledImages)?e.disabledImages:[]),fetch(chrome.runtime.getURL("assets/data/images.json")).then(e=>e.json()).then(e=>{predefinedSrcs=extractPredefinedSrcs(e),renderGallery()}).catch(e=>console.error("Failed to load images.json:",e)),migrateLegacySlots(e)}),modalUploadBtn&&modalUploadBtn.addEventListener("click",e=>{e.preventDefault(),openManagePage(),closeModal()})}),chrome.storage.onChanged.addListener((e,a)=>{if("local"!==a)return;let t=!1;e.uploadedImages&&(uploadedImages=Array.isArray(e.uploadedImages.newValue)?e.uploadedImages.newValue:[],t=!0),e.disabledImages&&(disabledImages=new Set(Array.isArray(e.disabledImages.newValue)?e.disabledImages.newValue:[]),t=!0);for(const a of THEME_SLOTS)e[a]&&setPreview(a,e[a].newValue);t&&"flex"===modal.style.display&&renderGallery()});const modalSaveBtn=document.getElementById("modal-save");modalSaveBtn.addEventListener("click",async()=>{
  // No silent no-ops: an empty slot context is a true cancel; a missing
  // selection is a user error that must be surfaced inline, not swallowed.
  if(!currentType)return void closeModal("cancel");
  if(!selectedSrc)return void showModalError("Pick an image first, then tap Save.");
  const slot=currentType,src=selectedSrc,origLabel=modalSaveBtn.textContent;
  const source=classifySlotSource(src); // 'preset' | 'upload' | 'url'
  clearModalError(),modalSaveBtn.disabled=!0,modalSaveBtn.textContent="Saving…";
  let dataUrl=null,optimized=!1,originalBytes=null;
  try{
    // 1. Acquire a persistable dataURL (uploaded images already are one).
    try{dataUrl=await ensureDataUrl(src)}
    catch(err){throw Object.assign(new Error(err&&err.message||"prepare failed"),{reason:classifySlotError(err)})}
    if(!dataUrl)throw Object.assign(new Error("could not prepare image"),{reason:"cors_or_network"});
    // 1.5 Downscale/re-encode oversized images so large uploads succeed instead
    //     of failing on storage/memory. Best-effort — returns the original on any error.
    {const _opt=await optimizeImageDataUrl(dataUrl);dataUrl=_opt.dataUrl,optimized=_opt.optimized,originalBytes=_opt.originalBytes||null}
    // 2. Persist, surfacing storage failures (e.g. quota) instead of swallowing
    //    the callback — the old code ignored chrome.runtime.lastError entirely.
    await new Promise((res,rej)=>{chrome.storage.local.set({[slot]:dataUrl},()=>{const le=chrome.runtime.lastError;le?rej(Object.assign(new Error(le.message||"storage write failed"),{reason:/quota/i.test(le.message||"")?"storage_quota":"unknown"})):res()})});
    setPreview(slot,dataUrl);
    // 3. Setting a static chatview image supersedes any animated background.
    let replacedAnimation=!1;
    if("chatview"===slot){const cur=await new Promise(r=>chrome.storage.local.get(["animated_background"],r));cur.animated_background&&(replacedAnimation=!0,await new Promise(r=>chrome.storage.local.remove("animated_background",r)))}
    // 4. Success telemetry with the shape the brief asks for.
    try{if(window.track){const props={slot:slot,source:source,file_size_bytes:dataUrlByteSize(dataUrl),optimized:optimized};optimized&&originalBytes&&(props.original_size_bytes=originalBytes),"chatview"===slot&&(props.replaced_animation=replacedAnimation),window.track("background_slot_set",props)}}catch(e){}
    closeModal("saved")
  }catch(err){
    const reason=classifySlotError(err);
    console.error("[background] slot set failed:",reason,err);
    try{window.track&&window.track("background_slot_set_failed",{slot:slot,source:source,reason:reason,file_size_bytes:dataUrl?dataUrlByteSize(dataUrl):null})}catch(e){}
    showModalError(slotErrorMessage(reason))
  }finally{modalSaveBtn.disabled=!1,modalSaveBtn.textContent=origLabel}
}),document.getElementById("modal-none").addEventListener("click",()=>{if(currentType){const e=currentType;chrome.storage.local.remove(e),setPreview(e,null);try{window.track&&window.track("background_slot_cleared",{slot:e})}catch(e){}}closeModal("cleared")}),document.getElementById("modal-cancel").addEventListener("click",()=>closeModal("cancel")),document.addEventListener("click",e=>{const a=e.target.closest(".image-option[data-type]");a&&openModal(a.dataset.type)});