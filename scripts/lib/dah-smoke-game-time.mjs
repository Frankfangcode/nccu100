/** 等待真正的遊戲步進；區分持續前進的軟體繪圖與完全停滯。 */
export async function waitDahGameTime(page,start,seconds,{progressTimeoutMs=60000,totalTimeoutMs=120000,now=()=>performance.now()}={}){
 if(!Number.isFinite(start)||!Number.isFinite(seconds)||!Number.isFinite(progressTimeoutMs)||!Number.isFinite(totalTimeoutMs)||start<0||seconds<0||progressTimeoutMs<=0||totalTimeoutMs<=0)throw new RangeError('Invalid Dah game-time wait');
 const began=now();let previous=start,progressObservations=0;
 while(true){
  const remaining=totalTimeoutMs-(now()-began);
  if(remaining<=0)throw new Error('Dah game-time total deadline exceeded');
  let handle;
  try{
   handle=await page.waitForFunction(previous=>{
    const time=window.__game.state.time;
    if(!Number.isFinite(time)||time<previous)throw new Error('Dah game clock is invalid or moved backwards');
    return time>previous?time:false;
   },previous,{timeout:Math.min(progressTimeoutMs,remaining),polling:100});
  }catch(error){throw new Error('Dah game time made no progress within its bounded wait',{cause:error});}
  let current;try{current=await handle.jsonValue();}finally{await handle.dispose();}
  progressObservations++;
  const elapsedMs=now()-began;
  if(elapsedMs>totalTimeoutMs)throw new Error('Dah game-time total deadline exceeded');
  if(current>start+seconds)return{start,time:current,seconds,elapsedMs,progressObservations};
  previous=current;
 }
}
