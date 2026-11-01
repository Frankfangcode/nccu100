/** 本區輸入修正；保留全校鍵盤Shift衝刺，搖桿推滿不自動衝刺。 */
export function mountDahInput({state,window,document,stick,resetInput}){
 const limit=()=>{if(state.room!=='dah-hsian-2f')return;const v=state.stickV,m=Math.hypot(v.x,v.y);if(m>.9){v.x*=.9/m;v.y*=.9/m;}};
 const blur=()=>resetInput();
 const hidden=()=>{if(document.hidden)resetInput();};
 stick.addEventListener('pointerdown',limit);stick.addEventListener('pointermove',limit);
 window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);
 limit();
 return()=>{stick.removeEventListener('pointerdown',limit);stick.removeEventListener('pointermove',limit);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};
}
