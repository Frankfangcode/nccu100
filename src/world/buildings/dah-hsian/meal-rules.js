/** 一餐三秒；吃完後六十個經過秒保留氣味，與房間及遊戲挑戰無關。 */
export function createHotpotMeal(now=()=>performance.now()/1000){
 let started=-Infinity,until=-Infinity,priorUntil=-Infinity;
 return{begin(){if(this.sample().phase==='eating')return false;priorUntil=until;started=now();until=started+63;return true;},
 cancelEating(){if(this.sample().phase==='eating'){started=-Infinity;until=priorUntil;}},
 sample(){const time=now(),eating=time<started+3;return{phase:eating?'eating':time<until?'scent':'idle',progress:eating?Math.max(0,(time-started)/3):1,remaining:Math.max(0,until-time)};}};
}
