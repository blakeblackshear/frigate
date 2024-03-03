function CameraActivityIndicator() {
  return (
    <div className="flex items-center justify-center relative z-20">
      <div className="flex">
        <div className="absolute size-[5px] inset-0 bg-severity_alert-dimmed rounded-full shadow-[0px_0px_10px_0px_#00000024,0px_0px_15px_0px_#00000024] z-20 animate-move"></div>
        <div className="flex-1 size-[5px] mr-[2px] bg-severity_alert rounded-full animate-scale1"></div>
        <div className="flex-1 size-[5px] mr-[2px] bg-severity_alert rounded-full animate-scale2"></div>
        <div className="flex-1 size-[5px] mr-[2px] bg-severity_alert rounded-full animate-scale3"></div>
        <div className="flex-1 size-[5px] mr-[2px] bg-severity_alert rounded-full animate-scale4"></div>
      </div>
      <svg className="hidden" xmlns="http://www.w3.org/2000/svg" version="1.1">
        <defs>
          <filter id="goo">
            <feGaussianBlur
              in="SourceGraphic"
              stdDeviation="10"
              result="blur"
            />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>
    </div>
  );
}

export default CameraActivityIndicator;
