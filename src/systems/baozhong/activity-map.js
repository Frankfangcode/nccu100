import { activityGuideModel } from './activity-guide-model.js';
import { guideScene } from './activity-guide-scene.js';
import { stFlag } from './passport-logic.js';
import { activityEntries, filterActivity, activityDirection, activityBounds } from './activity-map-logic.js';

const CSS = `
#bz-activity-map[hidden],#bz-activity-target[hidden]{display:none!important}
#bz-activity-map{position:fixed;inset:0;z-index:78;background:#2a2c4aaa;display:grid;place-items:center;padding:12px;color:#2a2c4a}
#bz-activity-map section{background:#f4f4ee;border:3px solid #2f6f4f;border-radius:16px;padding:14px;width:min(840px,100%);max-height:90dvh;overflow:auto;box-sizing:border-box;font-family:'Noto Sans TC',sans-serif}
#bz-activity-map header{display:flex;align-items:center;justify-content:space-between;gap:10px}#bz-activity-map h2{font-size:22px;margin:0}
#bz-activity-map button,#bz-activity-map input,#bz-activity-map select,#bz-activity-button{min-height:44px;font:inherit;border:1px solid #9aa3ab;border-radius:8px;padding:8px;background:#f4f4ee;color:#2a2c4a;box-sizing:border-box}
#bz-activity-button{pointer-events:auto;cursor:pointer}
#bz-activity-map button{cursor:pointer}#bz-activity-map :focus-visible,#bz-activity-button:focus-visible{outline:3px solid #1f3c8f;outline-offset:2px}
#bz-activity-map .bz-map-filters{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}#bz-activity-map input{flex:1;min-width:140px}#bz-activity-map select{max-width:100%}
#bz-activity-map .bz-map-content{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(170px,1fr);gap:10px}
#bz-activity-map svg{width:100%;height:auto;background:#dccdb5;border-radius:10px;align-self:start}
#bz-activity-map .bz-map-list{max-height:45vh;overflow:auto;display:flex;flex-direction:column;gap:5px;overscroll-behavior:contain}
#bz-activity-map .bz-map-list button{text-align:left;border-left:8px solid var(--college-color)}#bz-activity-map [aria-pressed=true]{outline:2px solid #2f6f4f;background:#e7efdc}
#bz-activity-map p{font-size:13px;margin:8px 0}#bz-activity-target{position:fixed;bottom:max(16px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);z-index:32;max-width:65vw;padding:8px 12px;border-radius:10px;background:#f4f4eee8;color:#2a2c4a;text-align:center;font:700 13px 'Noto Sans TC',sans-serif;pointer-events:none}
@media(max-width:540px){#bz-activity-map .bz-map-content{grid-template-columns:1fr}#bz-activity-map .bz-map-list{max-height:25vh}#bz-activity-map h2{font-size:18px}#bz-activity-map section{padding:10px}}
`;
/** 呼叫端在會場啟用時掛載、每幀 update、離場 dispose。位置只讀。 */
export function mountActivityMap({ layout, content, state, getPosition, fountain = null, exploration, document: doc = globalThis.document } = {}) {
  const entries = activityEntries(layout, content);
  const hud = doc.querySelector('#hud .col.r');
  if (!hud) throw new Error('Activity map requires #hud .col.r');
  const make = (tag, text) => { const e = doc.createElement(tag); if (text) e.textContent = text; return e; };
  const style = make('style'); style.textContent = CSS; doc.head.append(style);
  const button = make('button', '活動地圖 G'); button.id = 'bz-activity-button'; button.type = 'button'; hud.append(button);
  const overlay = make('div'); overlay.id = 'bz-activity-map'; overlay.hidden = true;
  const panel = make('section'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '蓋亞造界包種茶節活動地圖');
  const header = make('header'), title = make('h2', '蓋亞造界包種茶節'), closeButton = make('button', '關閉');
  header.append(title, closeButton);
  const filters = make('div'); filters.className = 'bz-map-filters';
  const search = make('input'); search.type = 'search'; search.placeholder = '搜尋學系或攤號，例如 D26'; search.setAttribute('aria-label', '搜尋學系或攤號');
  const college = make('select'); college.setAttribute('aria-label', '篩選學院');
  for (const name of ['', ...new Set(entries.map(e => e.college))]) { const o = make('option', name || '全部學院及功能攤位'); o.value = name; college.append(o); }
  filters.append(search, college);
  const note = make('p', '★ 代表你的收藏。依遊戲實際攤位配置。沿用遊戲北向：校門在上、四維堂在下。點選攤位會標記方向，不會傳送。');
  const grid = make('div'); grid.className = 'bz-map-content';
  const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 640 360'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '攤位與玩家位置圖');
  const list = make('div'); list.className = 'bz-map-list'; const status = make('p'); status.setAttribute('role', 'status');
  const clear = make('button', '清除目標'); grid.append(svg, list); panel.append(header, filters, note, grid, status, clear); overlay.append(panel);
  const targetHUD = make('div'); targetHUD.id = 'bz-activity-target'; targetHUD.hidden = true; doc.body.append(overlay, targetHUD);
  let active = true, selected = null, opened = false, disposed = false, priorFocus, priorBusy, hadBusy, elapsed = 0;
  const svgNode = (tag, attrs, text) => { const e = doc.createElementNS('http://www.w3.org/2000/svg', tag); for (const [k,v] of Object.entries(attrs)) e.setAttribute(k,String(v)); if (text) e.textContent = text; svg.append(e); return e; };
  function drawMap() {
    const p = state.room ? null : getPosition();
    const model=activityGuideModel(layout,content,p);
    svg.setAttribute('viewBox','0 0 1000 700');svg.replaceChildren();
    const matches=new Set(filterActivity(entries,search.value,college.value).map(e=>e.id));
    for(const command of guideScene(model,1000,700,{selected,matchIds:matches,position:p,favoriteIds:new Set(exploration?.getSnapshot().favorites.map(item=>item.id)||[])})) svgNode(command.type,command.attrs,command.text);
  }

  function renderList() {
    const matches = filterActivity(entries, search.value, college.value); list.replaceChildren();
    for (const e of matches) {
      const b = make('button', `${exploration?.getSnapshot().favorites.some(item=>item.id===e.id)?'★ ':''}${e.id} ${e.name} · ${e.college}${e.id.startsWith('D') && state.flags?.has(stFlag(e.id)) ? ' · 已蓋章 ✓' : ''}`); b.type = 'button'; b.dataset.boothId = e.id;
      b.style.setProperty('--college-color', e.color); b.setAttribute('aria-pressed', String(selected?.id === e.id)); list.append(b);
    }
    status.textContent = `${matches.length}／${entries.length} 個攤位${selected ? `，目標：${selected.id} ${selected.name}` : ''}`; drawMap();
  }
  function select(id) { if (disposed || (!active && id !== null)) return false; const e = id === null ? null : entries.find(e => e.id === id); if (id !== null && !e) return false; selected = e; renderList(); update(); return true; }
  function open() {
    if (disposed || !active || opened || state.busy) return false;
    priorFocus = doc.activeElement; hadBusy = Object.hasOwn(state,'busy'); priorBusy = state.busy; state.busy = true;
    opened = true; overlay.hidden = false; button.setAttribute('aria-expanded','true'); renderList(); closeButton.focus(); return true;
  }
  function close() {
    if (!opened) return false; opened = false; overlay.hidden = true; button.setAttribute('aria-expanded','false');
    if (state.busy === true) { if (hadBusy) state.busy = priorBusy; else delete state.busy; }
    if (priorFocus?.isConnected) priorFocus.focus(); return true;
  }
  function update(dt = 1) {
    if (disposed) return;
    targetHUD.hidden = !active || !selected || !!state.room || !!state.busy;
    if (selected && !state.room) { const d = activityDirection(getPosition(), selected); targetHUD.textContent = d ? `${selected.id} ${selected.name}｜${d.label} · ${Math.round(d.distance)} 公尺（直線）` : ''; }
    elapsed += dt; if (opened && elapsed >= .15) { elapsed = 0; drawMap(); }
  }
  function setActive(on) { if(disposed)return;active=!!on;button.hidden=!active;if(!active){close();selected=null;targetHUD.hidden=true;} }
  function key(e) {
    if (!active || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
    if (opened && e.code === 'Escape') { close(); e.preventDefault(); e.stopPropagation(); return; }
    if (opened && e.code === 'Tab') {
      const buttons = [...panel.querySelectorAll('button,input,select')], first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && (doc.activeElement === first || !panel.contains(doc.activeElement))) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && (doc.activeElement === last || !panel.contains(doc.activeElement))) { first.focus(); e.preventDefault(); }
      return;
    }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable) return;
    if (e.code === 'KeyG' && !e.repeat && (opened || !state.busy)) { opened ? close() : open(); e.preventDefault(); e.stopPropagation(); }
  }
  const toggle = () => opened ? close() : open();
  const choose = e => { const b = e.target.closest('[data-booth-id]'); if (b) { select(b.dataset.boothId); close(); } };
  const backdrop = e => { if (e.target === overlay) close(); };
  const clearTarget = () => select(null);
  button.setAttribute('aria-controls', overlay.id); button.setAttribute('aria-expanded','false');
  button.addEventListener('click', toggle); closeButton.addEventListener('click',close); search.addEventListener('input',renderList); college.addEventListener('change',renderList);
  list.addEventListener('click',choose); svg.addEventListener('click',choose); overlay.addEventListener('click',backdrop); clear.addEventListener('click',clearTarget); doc.addEventListener('keydown',key,true);
  const unsubscribe = exploration?.subscribe(() => { if (opened && active) renderList(); });
  return { open, close, select, update, setActive, get target() { return selected; }, dispose() {
    if (disposed) return; close(); disposed = true; unsubscribe?.(); selected = null;
    button.removeEventListener('click',toggle); closeButton.removeEventListener('click',close); search.removeEventListener('input',renderList); college.removeEventListener('change',renderList);
    list.removeEventListener('click',choose); svg.removeEventListener('click',choose); overlay.removeEventListener('click',backdrop); clear.removeEventListener('click',clearTarget); doc.removeEventListener('keydown',key,true);
    button.remove(); overlay.remove(); targetHUD.remove(); style.remove();
  } };
}
