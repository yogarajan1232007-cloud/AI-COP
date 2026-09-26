export default function StepIndicator({step}){

  const steps = ["Locations","Details","Vehicle","Confirm"];

  return(

    <div className="step-indicator">

      {steps.map((label,index)=>{

        const s = index+1;

        return(

          <div key={index} className="step">

            <div className={step>=s ? "circle active":"circle"}>
              {s}
            </div>

            <span>{label}</span>

          </div>

        );

      })}

    </div>

  );

}