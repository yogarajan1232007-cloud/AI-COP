export function calculateRisk(speed) {

  let risk = 0;

  const hour = new Date().getHours();

  if (speed > 100) risk += 40;

  if (hour > 23 || hour < 4) risk += 30;

  if (Math.random() > 0.7) risk += 30;

  return risk;

}